"""
app/api/cv.py - CV Import and Live SSE Progress Router.
Implements Feature 1, Feature 2, and Feature 7.
"""
import os
import shutil
import asyncio
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    User, Resume, CareerProfile, ProfileExperience, ProfileSkill,
    ProfileFieldSource, UserSkillEvidence, SkillSource
)
from app.core.config import settings
from app.schemas.schemas import CvImportStartResponse
from app.services.cv_job_manager import (
    create_job, is_job_owner, get_job_events, run_import_pipeline, _ACTIVE_JOBS
)
from app.services.years_service import canonical_skill, INDUSTRIES
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/cv", tags=["CV Import & Auto-Fill"])

ALLOWED_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword"
}
MAX_CV_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/import", response_model=CvImportStartResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_cv(
    background_tasks: BackgroundTasks,
    cv: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiates CV import background pipeline and returns job_id immediately (HTTP 202).
    """
    content = await cv.read()
    if len(content) > MAX_CV_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CV file size exceeds {MAX_CV_SIZE // (1024 * 1024)} MB limit."
        )
    if len(content) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CV file is empty."
        )

    # Validate file extension
    ext = os.path.splitext(cv.filename or "")[1].lower()
    if ext not in (".pdf", ".docx", ".doc"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported format. Please upload a PDF or DOCX file."
        )

    # Save to safe temporary staging file
    import uuid
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "tmp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"staging_{uuid.uuid4()}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)

    with open(temp_path, "wb") as f:
        f.write(content)

    job_id = create_job(current_user.id)

    # Schedule background worker
    background_tasks.add_task(
        run_import_pipeline,
        job_id=job_id,
        user_id=current_user.id,
        temp_file_path=temp_path,
        original_filename=cv.filename or f"CV{ext}",
        mime_type=cv.content_type or "application/pdf",
        file_size=len(content)
    )

    return {
        "job_id": job_id,
        "message": "CV upload accepted. Processing started in background."
    }

@router.post("/import/resume/{resume_id}", response_model=CvImportStartResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_existing_resume(
    resume_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers document re-parsing pipeline for an already uploaded resume in the user's library.
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found in your library.")

    # Locate source file on disk
    src_path = resume.file_path
    if not src_path or not os.path.exists(src_path):
        candidate = os.path.join(settings.RESOLVED_UPLOAD_DIR, os.path.basename(src_path or ""))
        if os.path.exists(candidate):
            src_path = candidate
        else:
            raise HTTPException(status_code=404, detail="Resume document file not found on disk.")

    ext = os.path.splitext(src_path)[1].lower()
    if not ext:
        ext = ".pdf" if resume.file_type == "pdf" else ".docx"

    import uuid
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "tmp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = f"staging_{uuid.uuid4()}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)
    shutil.copyfile(src_path, temp_path)

    job_id = create_job(current_user.id)
    mime_type = "application/pdf" if ext == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    background_tasks.add_task(
        run_import_pipeline,
        job_id=job_id,
        user_id=current_user.id,
        temp_file_path=temp_path,
        original_filename=resume.file_name or f"{resume.title or 'Resume'}{ext}",
        mime_type=mime_type,
        file_size=os.path.getsize(temp_path),
        resume_id=resume.id
    )

    return {
        "job_id": job_id,
        "message": f"Document parsing pipeline initiated for '{resume.title or 'Resume'}'."
    }

@router.get("/import/{job_id}/events")
async def get_import_events_sse(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Streams Server-Sent Events (SSE) for the CV import progress modal.
    """
    if not is_job_owner(job_id, current_user.id):
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    job = _ACTIVE_JOBS[job_id]
    queue: asyncio.Queue = asyncio.Queue()
    job["queues"].append(queue)

    async def event_generator():
        import json
        try:
            # Replay previous events
            for prev_ev in job["events"]:
                yield f"data: {json.dumps(prev_ev)}\n\n"

            # Stream live events
            while True:
                if job.get("done") and queue.empty():
                    break
                try:
                    ev = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(ev)}\n\n"
                    if ev.get("type") in ("done", "error"):
                        break
                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield ": ping\n\n"
        finally:
            if queue in job["queues"]:
                job["queues"].remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/import/{job_id}/status")
def get_import_status_json(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Polling fallback returning all events and completion status.
    """
    if not is_job_owner(job_id, current_user.id):
        raise HTTPException(status_code=404, detail="Job not found.")

    events = get_job_events(job_id)
    is_done = _ACTIVE_JOBS.get(job_id, {}).get("done", False)
    return {
        "jobId": job_id,
        "done": is_done,
        "events": events
    }


# ---------------------------------------------------------------------------
# Section 4.1: CV-to-Profile Review & Explicit User Confirmation Endpoints
# ---------------------------------------------------------------------------

class FieldDecision(BaseModel):
    action: str = "accept"  # "accept", "edit", "reject", "skip"
    value: Optional[Any] = None

class ExperienceDecision(BaseModel):
    action: str = "accept"  # "accept", "reject", "skip"
    job_title: str
    company: str
    industry: Optional[str] = "Other"
    start_year: int
    start_month: Optional[int] = None
    end_year: Optional[int] = None
    end_month: Optional[int] = None
    is_current: bool = False
    description: Optional[str] = ""
    highlights: List[str] = []

class SkillDecision(BaseModel):
    action: str = "accept"  # "accept", "reject", "skip"
    name: str
    proficiency: Optional[str] = "Intermediate"

class EducationDecision(BaseModel):
    action: str = "accept"  # "accept", "reject", "skip"
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None

class ConfirmCvImportRequest(BaseModel):
    fields: Dict[str, FieldDecision] = {}
    experiences: List[ExperienceDecision] = []
    skills: List[SkillDecision] = []
    education: List[EducationDecision] = []

@router.get("/review/{resume_id}")
def get_cv_review_data(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns proposed CV fields alongside the user's existing profile fields for side-by-side review.
    Calculates field-by-field diffs, provenance confidence, and low-confidence warnings.
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found in your library.")

    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
        db.flush()

    parsed = resume.parsed_json or {}
    existing_skills = {
        s.name_normalized: s for s in db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
    }
    existing_exps = db.query(ProfileExperience).filter(ProfileExperience.user_id == current_user.id).all()

    fields = []
    def add_field(key: str, label: str, current_val: Any, extracted_val: Any, conf: float, sec: str):
        c_str = str(current_val or "").strip()
        e_str = str(extracted_val or "").strip()
        diff = bool(e_str and e_str.lower() != c_str.lower())
        fields.append({
            "key": key,
            "label": label,
            "section": sec,
            "current_value": current_val,
            "extracted_value": extracted_val,
            "confidence": conf,
            "is_low_confidence": conf < 0.75,
            "is_diff": diff,
            "has_manual_edit": bool(c_str and diff),
            "recommendation": "accept" if (not c_str and e_str) else ("review" if diff else "keep_current")
        })

    addr = parsed.get("address") or {}
    links = parsed.get("links") or {}

    add_field("target_title", "Target Role / Headline", profile.target_title, parsed.get("headline") or parsed.get("roleCategory"), 0.88, "Identity")
    add_field("phone", "Phone Number", profile.phone, parsed.get("phone"), 0.95 if parsed.get("phone") else 0.50, "Contact")
    add_field("city", "City", profile.city, addr.get("city"), 0.85 if addr.get("city") else 0.40, "Location")
    add_field("region", "State / Province", profile.region, addr.get("region"), 0.80 if addr.get("region") else 0.40, "Location")
    add_field("country", "Country", profile.country, addr.get("country"), 0.90 if addr.get("country") else 0.40, "Location")
    add_field("postal_code", "Postal Code", profile.postal_code, addr.get("postalCode"), 0.85 if addr.get("postalCode") else 0.40, "Location")
    add_field("linkedin_url", "LinkedIn URL", profile.linkedin_url, links.get("linkedin"), 0.95 if links.get("linkedin") else 0.40, "Links")
    add_field("github_url", "GitHub URL", profile.github_url, links.get("github"), 0.95 if links.get("github") else 0.40, "Links")
    add_field("portfolio_url", "Portfolio URL", profile.portfolio_url, links.get("portfolio"), 0.90 if links.get("portfolio") else 0.40, "Links")
    add_field("summary", "Professional Summary", profile.summary, parsed.get("headline") or (resume.raw_text[:280] if resume.raw_text else None), 0.75, "Summary")

    extracted_exps = parsed.get("experience") or []
    experience_items = []
    for idx, e in enumerate(extracted_exps):
        c_name = e.get("company") or "Company"
        title = e.get("role") or e.get("title") or "Role"
        is_dup = any(
            ex.company.lower().strip() == c_name.lower().strip() and
            ex.job_title.lower().strip() == title.lower().strip()
            for ex in existing_exps
        )
        conf = 0.90 if (e.get("company") and (e.get("role") or e.get("title")) and e.get("startYear")) else 0.65
        experience_items.append({
            "temp_id": f"exp_{idx}",
            "job_title": title,
            "company": c_name,
            "industry": e.get("industry") or "Technology",
            "start_year": e.get("startYear") or 2023,
            "start_month": e.get("startMonth"),
            "end_year": e.get("endYear"),
            "end_month": e.get("endMonth"),
            "is_current": bool(e.get("isCurrent", False)),
            "description": e.get("description") or "",
            "highlights": e.get("bullets") or e.get("highlights") or [],
            "confidence": conf,
            "is_low_confidence": conf < 0.75,
            "is_duplicate": is_dup,
            "recommendation": "skip" if is_dup else "accept"
        })

    extracted_skills = parsed.get("skills") or []
    skill_items = []
    for s in extracted_skills:
        raw_name = str(s).strip()
        canon = canonical_skill(raw_name)
        if not canon:
            continue
        key = canon.lower()
        already_has = key in existing_skills
        conf = 0.90 if len(canon) > 2 else 0.70
        skill_items.append({
            "name": canon,
            "normalized": key,
            "proficiency": "Intermediate",
            "confidence": conf,
            "is_duplicate": already_has,
            "recommendation": "skip" if already_has else "accept"
        })

    extracted_edu = parsed.get("education") or []
    education_items = []
    for idx, ed in enumerate(extracted_edu):
        deg = ed.get("degree") or ed.get("field") or "Degree"
        inst = ed.get("institution") or ed.get("school") or "Institution"
        conf = 0.90 if (ed.get("institution") and ed.get("degree")) else 0.65
        education_items.append({
            "temp_id": f"edu_{idx}",
            "institution": inst,
            "degree": deg,
            "field_of_study": ed.get("field"),
            "start_year": ed.get("startYear"),
            "end_year": ed.get("endYear"),
            "confidence": conf,
            "is_low_confidence": conf < 0.75,
            "recommendation": "accept"
        })

    return {
        "resume_id": resume.id,
        "resume_title": resume.title,
        "file_name": resume.file_name,
        "raw_text_snippet": (resume.raw_text or "")[:1200],
        "fields": fields,
        "experiences": experience_items,
        "skills": skill_items,
        "education": education_items
    }

@router.post("/confirm-import/{resume_id}")
def confirm_cv_import(
    resume_id: str,
    data: ConfirmCvImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Applies user-confirmed decisions from the CV review screen.
    Guarantees that no user-edited fields are overwritten without consent,
    creates field provenance tracking, and persists multi-source skill evidence.
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
        db.flush()

    updated_fields_count = 0
    experiences_added = 0
    skills_added = 0
    education_added = 0

    # 1. Update confirmed scalar fields
    for field_key, decision in data.fields.items():
        if decision.action in ("accept", "edit") and decision.value is not None:
            val = str(decision.value).strip()
            if hasattr(profile, field_key):
                setattr(profile, field_key, val)
                updated_fields_count += 1

                # Save field provenance
                source = db.query(ProfileFieldSource).filter(
                    ProfileFieldSource.user_id == current_user.id,
                    ProfileFieldSource.field_name == field_key
                ).first()
                if not source:
                    source = ProfileFieldSource(
                        user_id=current_user.id,
                        field_name=field_key,
                        source_document_id=resume.id,
                        source_type="cv",
                        confidence=0.90,
                        confirmed_by_user=True,
                        original_value=val
                    )
                    db.add(source)
                else:
                    source.source_document_id = resume.id
                    source.confirmed_by_user = True
                    source.original_value = val

    # 2. Add confirmed experiences
    for exp_dec in data.experiences:
        if exp_dec.action in ("accept", "edit"):
            new_exp = ProfileExperience(
                user_id=current_user.id,
                job_title=exp_dec.job_title.strip(),
                company=exp_dec.company.strip(),
                industry=exp_dec.industry if exp_dec.industry in INDUSTRIES else "Other",
                start_year=exp_dec.start_year,
                start_month=exp_dec.start_month,
                end_year=exp_dec.end_year,
                end_month=exp_dec.end_month,
                is_current=exp_dec.is_current,
                description=exp_dec.description or "",
                highlights=exp_dec.highlights or [],
                source="cv"
            )
            db.add(new_exp)
            experiences_added += 1

    # 3. Add confirmed skills with multi-source evidence
    for skill_dec in data.skills:
        if skill_dec.action in ("accept", "edit"):
            canon = canonical_skill(skill_dec.name)
            if not canon:
                continue
            key = canon.lower()
            prof_level = skill_dec.proficiency or "Intermediate"
            existing_skill = db.query(ProfileSkill).filter(
                ProfileSkill.user_id == current_user.id,
                ProfileSkill.name_normalized == key
            ).first()

            if not existing_skill:
                existing_skill = ProfileSkill(
                    user_id=current_user.id,
                    name=canon,
                    name_normalized=key,
                    source="cv",
                    proficiency_estimate=prof_level,
                    confidence=0.85,
                    verification_status="mentioned",
                    user_confirmed=True
                )
                db.add(existing_skill)
                db.flush()
                skills_added += 1
            else:
                existing_skill.proficiency_estimate = prof_level
                existing_skill.user_confirmed = True

            # Create UserSkillEvidence entry
            evidence = UserSkillEvidence(
                user_id=current_user.id,
                skill_id=existing_skill.id,
                skill_name=canon,
                skill_normalized=key,
                source_type="cv",
                source_reference=f"Resume: {resume.title}",
                evidence_text=f"Extracted and confirmed from uploaded CV document '{resume.file_name}'",
                confidence=0.85,
                proficiency_estimate=prof_level,
                verification_status="mentioned",
                user_confirmed=True
            )
            db.add(evidence)

    # 4. Add confirmed education
    if data.education:
        current_edu = list(profile.education_history or [])
        for edu_dec in data.education:
            if edu_dec.action in ("accept", "edit"):
                current_edu.append({
                    "institution": edu_dec.institution,
                    "degree": edu_dec.degree,
                    "field_of_study": edu_dec.field_of_study,
                    "start_year": edu_dec.start_year,
                    "end_year": edu_dec.end_year,
                    "source": "cv"
                })
                education_added += 1
        profile.education_history = current_edu

    db.commit()

    record_user_activity(
        db, current_user.id, "cv_profile_updated",
        f"Confirmed and integrated {skills_added} skills, {experiences_added} experiences from '{resume.title}' into profile",
        entity_type="resume", entity_id=resume.id
    )

    return {
        "status": "success",
        "message": "Profile updated with user-confirmed CV fields.",
        "summary": {
            "fields_updated": updated_fields_count,
            "experiences_added": experiences_added,
            "skills_added": skills_added,
            "education_added": education_added
        }
    }

