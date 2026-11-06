"""
app/services/cv_job_manager.py - Asynchronous background CV Import Orchestrator with Live SSE events.
Ties together extraction, email gate, photo detection, and atomic database persistence.
"""
import os
import time
import hashlib
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.models import (
    User, CareerProfile, Resume, ResumeVersion,
    ProfileExperience, ExperienceSource, ProfileSkill, SkillSource
)
from app.services.cv_extraction_service import (
    extract_cv_text_and_links, check_email_gate, find_cv_photo,
    extract_structured_cv, split_links, label_for, CvDataSchema
)
from app.services.years_service import canonical_skill, current_year
from app.services.activity_service import record_user_activity

logger = logging.getLogger("careerlens.cv_jobs")

# In-memory job state: job_id -> { "user_id": str, "events": list, "done": bool, "queues": list }
_ACTIVE_JOBS: Dict[str, Dict[str, Any]] = {}

class ImportError(RuntimeError):
    def __init__(self, code: str, message: str, extra: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.extra = extra or {}

def create_job(user_id: str) -> str:
    import uuid
    job_id = str(uuid.uuid4())
    _ACTIVE_JOBS[job_id] = {
        "user_id": user_id,
        "events": [],
        "done": False,
        "created_at": time.time(),
        "queues": []
    }
    return job_id

def emit_event(job_id: str, event: Dict[str, Any]) -> None:
    job = _ACTIVE_JOBS.get(job_id)
    if not job:
        return
    job["events"].append(event)
    for q in list(job["queues"]):
        try:
            q.put_nowait(event)
        except Exception:
            pass

    if event.get("type") in ("done", "error"):
        job["done"] = True

def get_job_events(job_id: str) -> List[Dict[str, Any]]:
    job = _ACTIVE_JOBS.get(job_id)
    return job["events"] if job else []

def is_job_owner(job_id: str, user_id: str) -> bool:
    job = _ACTIVE_JOBS.get(job_id)
    return bool(job and job["user_id"] == user_id)

async def run_import_pipeline(
    job_id: str,
    user_id: str,
    temp_file_path: str,
    original_filename: str,
    mime_type: str,
    file_size: int
):
    """
    Background pipeline that executes the 6 steps:
    1. upload (done)
    2. read (sha256, extract text & links)
    3. analyze (AI extraction of experience and skills)
    4. verify (EMAIL GATE: match account email)
    5. photo (detect & crop headshot)
    6. save (atomic DB transaction for profile, contact, experiences, skills)
    """
    def step(s: str, status: str, detail: Optional[str] = None):
        emit_event(job_id, {"type": "step", "step": s, "status": status, "detail": detail})

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ImportError("USER_NOT_FOUND", "User account not found.")

        step("upload", "done")

        # Step 2: Read file & sha256 duplicate check
        step("read", "active", "Reading file text and hyperlink structures...")
        with open(temp_file_path, "rb") as f:
            file_bytes = f.read()

        sha = hashlib.sha256(file_bytes).hexdigest()
        existing = db.query(Resume).filter(Resume.user_id == user_id, Resume.sha256 == sha).first()
        if existing:
            raise ImportError("DUPLICATE_CV", "You have already uploaded this exact CV file.")

        ex = extract_cv_text_and_links(temp_file_path, mime_type)
        if not ex.is_scanned and len(ex.text) < 50:
            raise ImportError("EMPTY_CV", "We couldn't find any readable text in this CV file.")

        step("read", "done", f"{len(ex.links)} links and document metadata parsed")

        # Step 3: Analyze with AI
        step("analyze", "active", "Extracting role history, competencies, and achievements...")
        cv_data: CvDataSchema = await extract_structured_cv(ex)
        step("analyze", "done", f"{len(cv_data.experience)} jobs and {len(cv_data.skills)} skills found")

        # Step 4: Email Gate Verification
        step("verify", "active", "Verifying candidate email against account identity...")
        gate_ok, gate_email, no_email_found = check_email_gate(user.email, cv_data.email, ex.text)
        if not gate_ok:
            # STOP! Nothing is saved to disk or database.
            raise ImportError(
                "EMAIL_MISMATCH",
                "This CV belongs to a different email address.",
                {"cvEmail": gate_email or "unknown", "accountEmail": user.email}
            )
        verify_detail = "No email in CV (allowed)" if no_email_found else "Email verified matches account"
        step("verify", "done", verify_detail)

        # Step 5: Profile Photo Detection
        step("photo", "active", "Checking CV for professional headshot...")
        avatar_bytes: Optional[bytes] = None
        avatar_url: Optional[str] = None
        if not user.avatar_url or user.avatar_source == "cv":
            try:
                avatar_bytes = find_cv_photo(temp_file_path, mime_type)
                if avatar_bytes:
                    avatars_dir = os.path.join(settings.RESOLVED_UPLOAD_DIR, "avatars")
                    os.makedirs(avatars_dir, exist_ok=True)
                    safe_avatar_name = f"avatar_{user.id}_{int(time.time())}.jpg"
                    avatar_save_path = os.path.join(avatars_dir, safe_avatar_name)
                    with open(avatar_save_path, "wb") as f_img:
                        f_img.write(avatar_bytes)
                    avatar_url = f"/api/users/avatar/{safe_avatar_name}"
                    user.avatar_path = avatar_save_path
                    user.avatar_url = avatar_url
                    user.avatar_source = "cv"
            except Exception as e:
                logger.warning(f"Avatar processing warning: {e}")
                avatar_bytes = None
        step("photo", "done", "Profile photo extracted" if avatar_bytes else "No profile photo added")

        # Step 6: Atomic Database Save
        step("save", "active", "Persisting CV version, contact information, and experiences...")

        # Store permanent resume file
        resumes_dir = os.path.join(settings.RESOLVED_UPLOAD_DIR, "resumes")
        os.makedirs(resumes_dir, exist_ok=True)
        ext = os.path.splitext(temp_file_path)[1]
        permanent_name = f"cv_{user.id}_{sha[:16]}{ext}"
        permanent_path = os.path.join(resumes_dir, permanent_name)
        with open(permanent_path, "wb") as f_perm:
            f_perm.write(file_bytes)

        # Create Resume entity
        title = os.path.splitext(original_filename)[0]
        resume = Resume(
            user_id=user.id,
            title=title,
            target_role=cv_data.roleCategory or "Software Professional",
            role_category=cv_data.roleCategory,
            file_name=original_filename,
            file_path=permanent_path,
            file_size=file_size,
            file_type=ext.replace(".", ""),
            sha256=sha,
            parsed_json=cv_data.model_dump(),
            raw_text=ex.text
        )
        db.add(resume)
        db.flush()

        # Merge Contact details into CareerProfile (fill empty only!)
        profile = db.query(CareerProfile).filter(CareerProfile.user_id == user.id).first()
        if not profile:
            profile = CareerProfile(user_id=user.id)
            db.add(profile)
            db.flush()

        fields_filled = 0
        if cv_data.phone and not profile.phone:
            profile.phone = cv_data.phone
            fields_filled += 1
        if cv_data.address.line1 and not profile.address_line1:
            profile.address_line1 = cv_data.address.line1
            fields_filled += 1
        if cv_data.address.city and not profile.city:
            profile.city = cv_data.address.city
            fields_filled += 1
        if cv_data.address.region and not profile.region:
            profile.region = cv_data.address.region
            fields_filled += 1
        if cv_data.address.postalCode and not profile.postal_code:
            profile.postal_code = cv_data.address.postalCode
            fields_filled += 1
        if cv_data.address.country and not profile.country:
            profile.country = cv_data.address.country
            fields_filled += 1
        if cv_data.links.linkedin and not profile.linkedin_url:
            profile.linkedin_url = cv_data.links.linkedin
            fields_filled += 1
        if cv_data.links.github and not profile.github_url:
            profile.github_url = cv_data.links.github
            fields_filled += 1
        if cv_data.links.portfolio and not profile.portfolio_url:
            profile.portfolio_url = cv_data.links.portfolio
            fields_filled += 1
        if not profile.target_title and cv_data.roleCategory:
            profile.target_title = cv_data.roleCategory

        # Merge additional custom links
        cur_other = profile.other_links or []
        cur_urls = {item.get("url") for item in cur_other if isinstance(item, dict)}
        for item in cv_data.links.additional:
            if item.url not in cur_urls:
                cur_other.append({"label": item.label, "url": item.url})
                cur_urls.add(item.url)
        profile.other_links = cur_other

        # Merge Experiences (dedupe by company + jobTitle + startYear)
        existing_exps = db.query(ProfileExperience).filter(ProfileExperience.user_id == user.id).all()
        exp_lookup: Dict[str, str] = {}
        for pe in existing_exps:
            k = f"{pe.company.strip().lower()}|{pe.job_title.strip().lower()}|{pe.start_year}"
            exp_lookup[k] = pe.id

        experiences_added = 0
        for e in cv_data.experience:
            key = f"{e.company.strip().lower()}|{e.jobTitle.strip().lower()}|{e.startYear}"
            exp_id = exp_lookup.get(key)
            if not exp_id:
                new_exp = ProfileExperience(
                    user_id=user.id,
                    job_title=e.jobTitle.strip(),
                    company=e.company.strip(),
                    industry=e.industry,
                    start_year=e.startYear,
                    start_month=e.startMonth,
                    end_year=e.endYear,
                    end_month=e.endMonth,
                    is_current=e.isCurrent,
                    description=e.description,
                    highlights=e.highlights,
                    source="cv"
                )
                db.add(new_exp)
                db.flush()
                exp_id = new_exp.id
                exp_lookup[key] = exp_id
                experiences_added += 1

            # Link experience to this resume source
            existing_src = db.query(ExperienceSource).filter(
                ExperienceSource.experience_id == exp_id,
                ExperienceSource.resume_id == resume.id
            ).first()
            if not existing_src:
                db.add(ExperienceSource(experience_id=exp_id, resume_id=resume.id))

        # Merge Skills (canonical deduplication)
        skills_added = 0
        existing_skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == user.id).all()
        skill_lookup: Dict[str, str] = {s.name_normalized: s.id for s in existing_skills}

        for raw_s in cv_data.skills:
            norm_name = canonical_skill(raw_s)
            if not norm_name:
                continue
            key = norm_name.lower()
            sk_id = skill_lookup.get(key)
            if not sk_id:
                new_skill = ProfileSkill(
                    user_id=user.id,
                    name=norm_name,
                    name_normalized=key,
                    source="cv"
                )
                db.add(new_skill)
                db.flush()
                sk_id = new_skill.id
                skill_lookup[key] = sk_id
                skills_added += 1

            # Link skill to this resume source
            existing_sk_src = db.query(SkillSource).filter(
                SkillSource.skill_id == sk_id,
                SkillSource.resume_id == resume.id
            ).first()
            if not existing_sk_src:
                db.add(SkillSource(skill_id=sk_id, resume_id=resume.id))

        db.commit()
        step("save", "done")

        record_user_activity(
            db, user.id, "cv_imported",
            f"Imported CV '{original_filename}': {experiences_added} jobs, {skills_added} skills merged",
            entity_type="resume", entity_id=resume.id
        )

        emit_event(job_id, {
            "type": "done",
            "summary": {
                "resumeId": resume.id,
                "fieldsFilled": fields_filled,
                "experiencesAdded": experiences_added,
                "skillsAdded": skills_added,
                "photoAdded": bool(avatar_url)
            }
        })

    except ImportError as e:
        logger.warning(f"CV import stopped: [{e.code}] {e.message}")
        emit_event(job_id, {
            "type": "error",
            "code": e.code,
            "message": e.message,
            "extra": e.extra
        })
    except Exception as e:
        logger.error(f"Unexpected error during CV import: {e}", exc_info=True)
        emit_event(job_id, {
            "type": "error",
            "code": "UNKNOWN",
            "message": "Something went wrong while importing your CV. Please try again."
        })
    finally:
        db.close()
        # Clean up temporary file
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        except Exception:
            pass

