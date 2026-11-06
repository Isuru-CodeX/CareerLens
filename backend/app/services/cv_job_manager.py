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
from app.services.location_service import enrich_address_data, suggest_industry_domain
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
    file_size: int,
    resume_id: Optional[str] = None
):
    """
    Background pipeline that executes the 6 steps:
    1. upload (done)
    2. read (sha256, extract text & links)
    3. analyze (AI extraction of experience, skills, and education)
    4. verify (EMAIL GATE: match account email)
    5. photo (detect & crop headshot)
    6. save (atomic DB transaction for profile, contact, experiences, education, skills)
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
        if existing and (not resume_id or existing.id != resume_id):
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

        # Step 5: Photo extraction bypassed (profile details are managed manually by user)
        step("photo", "done", "Profile photo managed manually in user profile")

        # Step 6: Atomic Database Save (Saves CV to library only; does not overwrite profile)
        step("save", "active", "Saving CV file and parsed document data to library...")

        # Store permanent resume file
        resumes_dir = os.path.join(settings.RESOLVED_UPLOAD_DIR, "resumes")
        os.makedirs(resumes_dir, exist_ok=True)
        ext = os.path.splitext(temp_file_path)[1]
        permanent_name = f"cv_{user.id}_{sha[:16]}{ext}"
        permanent_path = os.path.join(resumes_dir, permanent_name)
        with open(permanent_path, "wb") as f_perm:
            f_perm.write(file_bytes)

        # Get or create Resume entity
        title = os.path.splitext(original_filename)[0]
        resume = None
        if resume_id:
            resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()

        if not resume:
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
        else:
            resume.parsed_json = cv_data.model_dump()
            resume.raw_text = ex.text
            if cv_data.roleCategory:
                resume.role_category = cv_data.roleCategory
            resume.file_path = permanent_path
            resume.file_size = file_size
        db.flush()

        db.commit()
        step("save", "done")

        record_user_activity(
            db, user.id, "cv_imported",
            f"Uploaded CV '{original_filename}' to resume library",
            entity_type="resume", entity_id=resume.id
        )

        emit_event(job_id, {
            "type": "done",
            "summary": {
                "resumeId": resume.id,
                "fieldsFilled": 0,
                "experiencesAdded": 0,
                "skillsAdded": 0,
                "educationAdded": 0,
                "photoAdded": False
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

