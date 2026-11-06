from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import (
    User, Application, ApplicationEvent, Reminder
)
from app.schemas.schemas import (
    ApplicationCreate, ApplicationUpdate, ApplicationOut, ApplicationStats,
    ReminderCreate, ReminderOut
)
from app.services.activity_service import record_user_activity

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

