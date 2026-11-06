"""
app/api/cv.py - CV Import and Live SSE Progress Router.
Implements Feature 1, Feature 2, and Feature 7.
"""
import os
import shutil
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Resume
from app.core.config import settings
from app.schemas.schemas import CvImportStartResponse
from app.services.cv_job_manager import (
    create_job, is_job_owner, get_job_events, run_import_pipeline, _ACTIVE_JOBS
)

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

