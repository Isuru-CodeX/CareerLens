"""
app/api/profile.py - User Profile Experiences and Skills Management.
Implements Feature 3 (Career Target and Credentials Rework).
"""
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, ProfileExperience, ProfileSkill, SkillSource, CareerProfile
from app.schemas.schemas import (
    ProfileExperienceOut, ProfileExperienceCreate, ProfileExperienceUpdate,
    ProfileSkillOut, ProfileSkillCreate
)
from app.services.years_service import canonical_skill, years_count, total_years, INDUSTRIES
from app.services.location_service import enrich_address_data, suggest_industry_domain
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/profile", tags=["Profile Credentials & Skills"])

@router.get("/experiences", response_model=List[ProfileExperienceOut])
def list_profile_experiences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exps = db.query(ProfileExperience).filter(
        ProfileExperience.user_id == current_user.id
    ).order_by(ProfileExperience.start_year.desc(), ProfileExperience.created_at.desc()).all()

    return [
        ProfileExperienceOut(
            id=e.id,
            job_title=e.job_title,
            company=e.company,
            industry=e.industry or "Other",
            start_year=e.start_year,
            start_month=e.start_month,
            end_year=e.end_year,
            end_month=e.end_month,
            is_current=e.is_current,
            description=e.description or "",
            highlights=e.highlights or [],
            source=e.source,
            years_count=years_count(e.start_year, e.end_year, e.is_current),
            created_at=e.created_at
        )
        for e in exps
    ]

@router.post("/experiences", response_model=ProfileExperienceOut, status_code=status.HTTP_201_CREATED)
def create_profile_experience(
    data: ProfileExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Year validation: end_year cannot be before start_year
    if not data.is_current and data.end_year is not None and data.end_year < data.start_year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End year cannot be before start year."
        )

    end_yr = None if data.is_current else (data.end_year if data.end_year is not None else data.start_year)
    exp = ProfileExperience(
        user_id=current_user.id,
        job_title=data.job_title.strip(),
        company=data.company.strip(),
        industry=data.industry if data.industry in INDUSTRIES else "Other",
        start_year=data.start_year,
        start_month=data.start_month,
        end_year=end_yr,
        end_month=None if data.is_current else data.end_month,
        is_current=data.is_current,
        description=data.description or "",
        highlights=data.highlights or [],
        source="manual"
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    record_user_activity(
        db, current_user.id, "experience_created",
        f"Added role '{exp.job_title}' at {exp.company}",
        entity_type="experience", entity_id=exp.id
    )

    return ProfileExperienceOut(
        id=exp.id,
        job_title=exp.job_title,
        company=exp.company,
        industry=exp.industry,
        start_year=exp.start_year,
        start_month=exp.start_month,
        end_year=exp.end_year,
        end_month=exp.end_month,
        is_current=exp.is_current,
        description=exp.description,
        highlights=exp.highlights,
        source=exp.source,
        years_count=years_count(exp.start_year, exp.end_year, exp.is_current),
        created_at=exp.created_at
    )

@router.patch("/experiences/{exp_id}", response_model=ProfileExperienceOut)
def update_profile_experience(
    exp_id: str,
    data: ProfileExperienceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exp = db.query(ProfileExperience).filter(
        ProfileExperience.id == exp_id,
        ProfileExperience.user_id == current_user.id
    ).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found.")

    if data.job_title is not None:
        exp.job_title = data.job_title.strip()
    if data.company is not None:
        exp.company = data.company.strip()
    if data.industry is not None:
        exp.industry = data.industry if data.industry in INDUSTRIES else "Other"
    if data.start_year is not None:
        exp.start_year = data.start_year
    if data.start_month is not None:
        exp.start_month = data.start_month
    if data.is_current is not None:
        exp.is_current = data.is_current
    if exp.is_current:
        exp.end_year = None
        exp.end_month = None
    elif data.end_year is not None:
        exp.end_year = max(exp.start_year, data.end_year)
    if data.end_month is not None and not exp.is_current:
        exp.end_month = data.end_month
    if data.description is not None:
        exp.description = data.description
    if data.highlights is not None:
        exp.highlights = [h.strip() for h in data.highlights if h.strip()]

    db.commit()
    db.refresh(exp)

    return ProfileExperienceOut(
        id=exp.id,
        job_title=exp.job_title,
        company=exp.company,
        industry=exp.industry,
        start_year=exp.start_year,
        start_month=exp.start_month,
        end_year=exp.end_year,
        end_month=exp.end_month,
        is_current=exp.is_current,
        description=exp.description,
        highlights=exp.highlights,
        source=exp.source,
        years_count=years_count(exp.start_year, exp.end_year, exp.is_current),
        created_at=exp.created_at
    )

@router.delete("/experiences/{exp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_experience(
    exp_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exp = db.query(ProfileExperience).filter(
        ProfileExperience.id == exp_id,
        ProfileExperience.user_id == current_user.id
    ).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found.")

    db.delete(exp)
    db.commit()
    return None

@router.get("/skills", response_model=List[ProfileSkillOut])
def list_profile_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    skills = db.query(ProfileSkill).filter(
        ProfileSkill.user_id == current_user.id
    ).order_by(ProfileSkill.name).all()

    return skills

@router.post("/skills", response_model=List[ProfileSkillOut], status_code=status.HTTP_201_CREATED)
def add_profile_skills(
    data: ProfileSkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    out = []
    for raw in data.names:
        # Split commas if user typed multiple in one string
        for sub in raw.split(","):
            canon = canonical_skill(sub)
            if not canon:
                continue
            key = canon.lower()
            existing = db.query(ProfileSkill).filter(
                ProfileSkill.user_id == current_user.id,
                ProfileSkill.name_normalized == key
            ).first()
            if existing:
                out.append(existing)
            else:
                new_s = ProfileSkill(
                    user_id=current_user.id,
                    name=canon,
                    name_normalized=key,
                    source="manual"
                )
                db.add(new_s)
                db.flush()
                out.append(new_s)

    db.commit()
    return out

@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_skill(
    skill_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    skill = db.query(ProfileSkill).filter(
        ProfileSkill.id == skill_id,
        ProfileSkill.user_id == current_user.id
    ).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    skill_name = skill.name
    skill_norm = skill.name_normalized

    # Clean up dependent skill sources
    db.query(SkillSource).filter(SkillSource.skill_id == skill_id).delete()

    # Also clean up CareerProfile.skills_list if present
    prof = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if prof and prof.skills_list:
        prof.skills_list = [
            s for s in prof.skills_list
            if str(s).lower() != skill_name.lower() and str(s).lower() != skill_norm
        ]

    db.delete(skill)
    db.commit()
    return None

class AddressEnrichRequest(BaseModel):
    line1: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None

@router.post("/enrich-address")
async def enrich_address(
    data: AddressEnrichRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Search online and use geocoding/regex intelligence to complete missing address components,
    notably postal code and administrative regions.
    """
    enriched = await enrich_address_data(data.model_dump())
    return enriched

@router.get("/suggest-industry")
def get_suggested_industry(
    role: Optional[str] = None,
    skills: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Intelligently suggest the optimal industry domain based on target role, technical skills,
    and user's profile experiences.
    """
    skill_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else []

    experience_titles = []
    if not role:
        prof = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
        if prof and prof.target_title:
            role = prof.target_title

    user_exps = db.query(ProfileExperience).filter(ProfileExperience.user_id == current_user.id).all()
    experience_titles = [e.job_title for e in user_exps if e.job_title]
    if not role and experience_titles:
        role = experience_titles[0]

    if not skill_list:
        db_skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
        skill_list = [s.name for s in db_skills]

    suggestion = suggest_industry_domain(role, skill_list, experience_titles)
    return {"suggested_industry": suggestion}


