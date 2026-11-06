from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, Resume, ResumeExperience
from app.schemas.schemas import (
    ResumeExperienceOut, ResumeExperienceCreate, ResumeExperienceUpdate,
    ResumeExperienceListOut, ExperienceSummaryOut
)
from app.services.experience_intelligence_service import ExperienceIntelligenceService
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/resumes", tags=["Experience Intelligence"])

@router.get("/{resume_id}/experiences", response_model=ResumeExperienceListOut)
def get_resume_experiences(
    resume_id: str,
    include_internships: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    experiences = db.query(ResumeExperience).filter(
        ResumeExperience.resume_id == resume.id
    ).order_by(ResumeExperience.start_year.desc(), ResumeExperience.start_month.desc()).all()

    # If no experiences exist yet in table, auto-extract from resume raw text
    if not experiences and resume.raw_text:
        experiences = ExperienceIntelligenceService.extract_and_save_experiences(db, resume)

    summary = ExperienceIntelligenceService.get_experience_summary(
        experiences,
        include_internships_in_relevant=include_internships
    )

    return {
        "experiences": experiences,
        "summary": summary
    }

@router.post("/{resume_id}/experiences", response_model=ResumeExperienceOut)
def add_resume_experience(
    resume_id: str,
    data: ResumeExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    dur_months, _ = ExperienceIntelligenceService.calculate_duration_months(
        data.start_year, data.start_month, data.end_year, data.end_month, data.is_current
    )

    exp = ResumeExperience(
        resume_id=resume.id,
        job_title=data.job_title,
        company=data.company,
        employment_type=data.employment_type,
        experience_category=data.experience_category,
        start_date_str=data.start_date_str,
        end_date_str=data.end_date_str,
        start_year=data.start_year,
        start_month=data.start_month,
        end_year=data.end_year,
        end_month=data.end_month,
        is_current=data.is_current,
        duration_months=dur_months,
        responsibilities=data.responsibilities,
        location=data.location,
        source_evidence="Manually entered by candidate",
        extraction_confidence=1.0,
        needs_user_verification=False,
        verified_by_user=True
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    record_user_activity(
        db, current_user.id, "resume_updated",
        f"Added experience role '{exp.job_title}' at {exp.company}",
        entity_type="resume", entity_id=resume.id
    )

    return exp

@router.put("/{resume_id}/experiences/{exp_id}", response_model=ResumeExperienceOut)
def update_resume_experience(
    resume_id: str,
    exp_id: str,
    data: ResumeExperienceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    exp = db.query(ResumeExperience).filter(
        ResumeExperience.id == exp_id,
        ResumeExperience.resume_id == resume.id
    ).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(exp, k, v)

    # Recalculate duration
    exp.duration_months, _ = ExperienceIntelligenceService.calculate_duration_months(
        exp.start_year, exp.start_month, exp.end_year, exp.end_month, exp.is_current
    )
    exp.verified_by_user = True
    exp.needs_user_verification = False

    db.commit()
    db.refresh(exp)

    record_user_activity(
        db, current_user.id, "resume_updated",
        f"Updated experience details for '{exp.job_title}' at {exp.company}",
        entity_type="resume", entity_id=resume.id
    )

    return exp

@router.delete("/{resume_id}/experiences/{exp_id}")
def delete_resume_experience(
    resume_id: str,
    exp_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    exp = db.query(ResumeExperience).filter(
        ResumeExperience.id == exp_id,
        ResumeExperience.resume_id == resume.id
    ).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found.")

    title = exp.job_title
    comp = exp.company
    db.delete(exp)
    db.commit()

    record_user_activity(
        db, current_user.id, "resume_updated",
        f"Removed experience record '{title}' at {comp}",
        entity_type="resume", entity_id=resume.id
    )

    return {"message": "Experience record successfully removed."}

@router.post("/{resume_id}/experiences/{exp_id}/verify", response_model=ResumeExperienceOut)
def verify_resume_experience(
    resume_id: str,
    exp_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    exp = db.query(ResumeExperience).filter(
        ResumeExperience.id == exp_id,
        ResumeExperience.resume_id == resume.id
    ).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found.")

    exp.verified_by_user = True
    exp.needs_user_verification = False
    db.commit()
    db.refresh(exp)

    record_user_activity(
        db, current_user.id, "resume_updated",
        f"Verified experience entry for '{exp.job_title}' at {exp.company}",
        entity_type="resume", entity_id=resume.id
    )

    return exp

@router.post("/{resume_id}/experiences/reparse", response_model=ResumeExperienceListOut)
def reparse_resume_experiences(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    experiences = ExperienceIntelligenceService.extract_and_save_experiences(db, resume)
    summary = ExperienceIntelligenceService.get_experience_summary(experiences)

    record_user_activity(
        db, current_user.id, "resume_updated",
        f"Re-analyzed professional experience timeline for '{resume.title}'",
        entity_type="resume", entity_id=resume.id
    )

    return {
        "experiences": experiences,
        "summary": summary
    }

