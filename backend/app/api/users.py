import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import (
    User, CareerProfile, Resume, AnalysisRun, JobMatch, Application
)
from app.schemas.schemas import CareerProfileOut, CareerProfileUpdate, DataExportOut

router = APIRouter(prefix="/users", tags=["User Profile & Data"])

@router.get("/profile", response_model=CareerProfileOut)
def get_career_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile", response_model=CareerProfileOut)
def update_career_profile(
    data: CareerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
    
    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(profile, field, val)
        
    db.commit()
    db.refresh(profile)
    log_audit(db, current_user.id, "CAREER_PROFILE_UPDATED")
    return profile

@router.get("/export", response_model=DataExportOut)
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
    analyses = db.query(AnalysisRun).filter(AnalysisRun.user_id == current_user.id).all()
    matches = db.query(JobMatch).filter(JobMatch.user_id == current_user.id).all()

    profile_dict = {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "target_title": profile.target_title if profile else "",
        "skills": profile.skills_list if profile else [],
        "education": profile.education_history if profile else [],
        "experience": profile.work_history if profile else []
    }

    log_audit(db, current_user.id, "DATA_EXPORT_REQUESTED")

    return {
        "exported_at": datetime.now(timezone.utc),
        "user_profile": profile_dict,
        "resumes": [
            {
                "id": r.id,
                "title": r.title,
                "target_role": r.target_role,
                "file_name": r.file_name,
                "file_type": r.file_type,
                "created_at": str(r.created_at)
            } for r in resumes
        ],
        "applications": [
            {
                "id": a.id,
                "company": a.company,
                "role": a.role,
                "stage": a.stage,
                "location": a.location,
                "salary_range": a.salary_range,
                "notes": a.notes
            } for a in apps
        ],
        "analyses": [
            {
                "id": an.id,
                "resume_id": an.resume_id,
                "overall_score": an.overall_score,
                "structure_score": an.structure_score,
                "impact_score": an.impact_score,
                "findings": an.findings
            } for an in analyses
        ],
        "job_matches": [
            {
                "id": m.id,
                "resume_id": m.resume_id,
                "overall_score": m.overall_score,
                "matched_skills": m.matched_skills,
                "missing_skills": m.missing_skills
            } for m in matches
        ]
    }

@router.delete("/account")
def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Clean up uploaded files on disk
    user_resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    for r in user_resumes:
        if r.file_path and os.path.exists(r.file_path):
            try:
                os.remove(r.file_path)
            except Exception:
                pass
                
    db.delete(current_user)
    db.commit()
    return {"message": "Account and all associated documents permanently deleted."}

