from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import (
    User, Application, ApplicationEvent, Reminder, JobDescription, Resume
)
from app.schemas.schemas import (
    ApplicationCreate, ApplicationUpdate, ApplicationOut, ApplicationStats,
    ReminderCreate, ReminderOut, ExtensionJobClipRequest, ExtensionJobClipResponse
)
from app.services.activity_service import record_user_activity
from app.services.matching_service import MatchingService
from app.services.vector_rag_service import VectorRagService

router = APIRouter(prefix="/applications", tags=["Application Tracker"])

VALID_STAGES = ["interested", "applied", "assessment", "interview", "offer", "rejected", "withdrawn"]

@router.get("", response_model=List[ApplicationOut])
def list_applications(
    stage: Optional[str] = None,
    q: Optional[str] = None,
    sort_by: Optional[str] = "date_desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Application).filter(Application.user_id == current_user.id)
    
    if stage and stage.lower() in VALID_STAGES:
        query = query.filter(Application.stage == stage.lower())
        
    if q:
        search = f"%{q.lower()}%"
        query = query.filter(
            or_(
                Application.company.ilike(search),
                Application.role.ilike(search),
                Application.location.ilike(search),
                Application.notes.ilike(search)
            )
        )

    if sort_by == "company":
        query = query.order_by(Application.company.asc())
    elif sort_by == "date_asc":
        query = query.order_by(Application.application_date.asc())
    else:
        query = query.order_by(Application.created_at.desc())

    return query.all()

@router.post("", response_model=ApplicationOut)
def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stage = data.stage.lower() if data.stage.lower() in VALID_STAGES else "applied"
    app = Application(
        user_id=current_user.id,
        company=data.company,
        role=data.role,
        stage=stage,
        job_url=data.job_url,
        location=data.location,
        source=data.source,
        salary_range=data.salary_range,
        application_date=data.application_date or datetime.now(timezone.utc),
        notes=data.notes,
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        interview_date=data.interview_date
    )
    db.add(app)
    db.flush()

    # Initial Event
    event = ApplicationEvent(
        application_id=app.id,
        event_type="created",
        notes=f"Application created in stage: {stage}"
    )
    db.add(event)

    db.commit()
    db.refresh(app)
    log_audit(db, current_user.id, "APPLICATION_CREATED", {"company": app.company, "role": app.role})

    record_user_activity(
        db, current_user.id, "application_status_changed",
        f"Added job application for '{app.role}' at {app.company} (Status: {app.stage})",
        entity_type="application", entity_id=app.id
    )

    return app

@router.get("/stats", response_model=ApplicationStats)
def get_application_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
    total = len(apps)
    by_stage = {stage: 0 for stage in VALID_STAGES}
    for a in apps:
        stage_key = a.stage.lower()
        if stage_key in by_stage:
            by_stage[stage_key] += 1
            
    active_interviews = by_stage["interview"] + by_stage["assessment"]
    offers = by_stage["offer"]
    rejections = by_stage["rejected"]
    
    # Response rate: (interviews + assessments + offers + rejections) / total
    responded_count = active_interviews + offers + rejections
    response_rate = round((responded_count / max(total, 1)) * 100, 1)

    return {
        "total_applications": total,
        "by_stage": by_stage,
        "active_interviews": active_interviews,
        "offers": offers,
        "rejections": rejections,
        "response_rate_percent": response_rate
    }

@router.get("/{app_id}", response_model=ApplicationOut)
def get_application(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    return app

@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: str,
    data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    update_dict = data.model_dump(exclude_unset=True)
    stage_changed = False
    old_stage = app.stage

    for field, val in update_dict.items():
        if field == "stage" and val and val.lower() != old_stage:
            if val.lower() in VALID_STAGES:
                app.stage = val.lower()
                stage_changed = True
        else:
            setattr(app, field, val)

    if stage_changed:
        event = ApplicationEvent(
            application_id=app.id,
            event_type="stage_change",
            notes=f"Moved from {old_stage} to {app.stage}"
        )
        db.add(event)

    db.commit()
    db.refresh(app)

    if stage_changed:
        record_user_activity(
            db, current_user.id, "application_status_changed",
            f"Updated application status for '{app.role}' at {app.company} to {app.stage}",
            entity_type="application", entity_id=app.id
        )

    return app

@router.delete("/{app_id}")
def delete_application(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    db.delete(app)
    db.commit()
    return {"message": "Application removed."}

@router.post("/{app_id}/reminders", response_model=ReminderOut)
def add_application_reminder(
    app_id: str,
    data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    reminder = Reminder(
        user_id=current_user.id,
        application_id=app.id,
        title=data.title,
        due_date=data.due_date
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.patch("/reminders/{reminder_id}/toggle", response_model=ReminderOut)
def toggle_reminder(
    reminder_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id,
        Reminder.user_id == current_user.id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found.")

    reminder.is_completed = not reminder.is_completed
    db.commit()
    db.refresh(reminder)
    return reminder

# =========================================================================
# PILLAR 4: CHROME EXTENSION 1-CLICK CLIPPER & INBOUND EMAIL WEBHOOK
# =========================================================================

@router.post("/extension/clip", response_model=ExtensionJobClipResponse)
def clip_job_from_extension(
    data: ExtensionJobClipRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    1-Click ingestion endpoint for the Manifest V3 Chrome Extension.
    Directly extracts job parameters, creates a Kanban application card,
    persists a linked JobDescription, and calculates instant candidate match score.
    """
    # 1. Parse job skills
    extracted_skills = MatchingService.extract_job_skills(data.raw_text)

    # 2. Create JobDescription record
    jd = JobDescription(
        user_id=current_user.id,
        title=data.title,
        company=data.company,
        source_url=data.source_url,
        raw_text=data.raw_text,
        required_skills=extracted_skills["required"],
        preferred_skills=extracted_skills["preferred"],
        salary_range=data.salary_range
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)

    # 3. Create Application in Kanban
    target_stage = data.stage if data.stage in VALID_STAGES else "interested"
    app = Application(
        user_id=current_user.id,
        company=data.company,
        role=data.title,
        location=data.location or "Remote",
        salary=data.salary_range or "Market Rate",
        stage=target_stage,
        notes=f"Auto-clipped from {data.platform or 'Web Browser'}.\nSource: {data.source_url or 'N/A'}"
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # 4. Add initial event
    evt = ApplicationEvent(
        application_id=app.id,
        from_stage=None,
        to_stage=target_stage,
        notes=f"Job clipped via CareerLens Extension from {data.platform or 'browser'}"
    )
    db.add(evt)
    db.commit()

    # 5. Compute instant match score if candidate has a resume
    match_score = None
    latest_resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).order_by(Resume.created_at.desc()).first()

    if latest_resume and latest_resume.raw_text:
        rag_res = VectorRagService.perform_hybrid_rag_matching(
            resume_text=latest_resume.raw_text,
            job_text=data.raw_text,
            job_title=data.title,
            company=data.company
        )
        match_score = rag_res["overall_hybrid_score"]

    record_user_activity(
        db, current_user.id, "job_clipped_extension",
        f"Clipped '{data.title}' at {data.company} directly to Kanban via Browser Extension",
        entity_type="application", entity_id=app.id
    )

    log_audit(db, current_user.id, "CHROME_EXTENSION_JOB_CLIPPED", {
        "application_id": app.id,
        "company": data.company,
        "title": data.title,
        "match_score": match_score
    })

    return {
        "success": True,
        "application_id": app.id,
        "job_description_id": jd.id,
        "title": data.title,
        "company": data.company,
        "stage": target_stage,
        "match_score": match_score,
        "message": f"Successfully clipped '{data.title}' to your Kanban pipeline!"
    }

@router.post("/inbound-webhook")
def process_inbound_recruiter_email(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Inbound Recruiter Email Webhook Parser.
    Classifies recruiter email text (Interview Scheduled, Rejection, Offer, Application Acknowledged)
    and updates the candidate's application pipeline stage automatically.
    """
    sender = payload.get("from", "")
    subject = payload.get("subject", "")
    body = payload.get("body", "") or payload.get("text", "")
    full_text = f"{subject}\n{body}".lower()

    # Determine candidate by recipient email if provided
    recipient = payload.get("to", "")
    candidate = None
    if recipient:
        candidate = db.query(User).filter(User.email == recipient.strip().lower()).first()

    # Classification heuristics
    new_stage = None
    action_note = ""

    if any(k in full_text for k in ["offer letter", "pleased to offer", "congratulations on the offer", "employment offer"]):
        new_stage = "offer"
        action_note = "Inbound Email: Offer letter / verbal offer received!"
    elif any(k in full_text for k in ["interview", "invitation to interview", "schedule a call", "zoom", "google meet", "hiring manager screen"]):
        new_stage = "interview"
        action_note = "Inbound Email: Recruiter requested interview or screen"
    elif any(k in full_text for k in ["coding assessment", "hackerrank", "codesignal", "technical assessment", "take-home"]):
        new_stage = "assessment"
        action_note = "Inbound Email: Technical / coding assessment dispatched"
    elif any(k in full_text for k in ["regret to inform", "not moving forward", "other candidates", "unfortunately", "pursuing other"]):
        new_stage = "rejected"
        action_note = "Inbound Email: Candidate rejection received"
    elif any(k in full_text for k in ["application received", "thank you for applying", "under review"]):
        new_stage = "applied"
        action_note = "Inbound Email: Application acknowledgement confirmed"

    # Attempt to locate matching application by company mention or sender domain
    updated_app_id = None
    if candidate and new_stage:
        apps = db.query(Application).filter(Application.user_id == candidate.id).all()
        for app in apps:
            if app.company.lower() in full_text or (sender and app.company.lower() in sender.lower()):
                old_stage = app.stage
                app.stage = new_stage
                evt = ApplicationEvent(
                    application_id=app.id,
                    from_stage=old_stage,
                    to_stage=new_stage,
                    notes=f"{action_note} (From: {sender})"
                )
                db.add(evt)
                db.commit()
                updated_app_id = app.id
                break

    return {
        "status": "PROCESSED",
        "classified_stage": new_stage,
        "action_note": action_note,
        "matched_application_id": updated_app_id,
        "candidate_recognized": bool(candidate)
    }


