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
from app.models.models import User, ProfileExperience, ProfileSkill, SkillSource, CareerProfile, UserSkillEvidence
from app.schemas.schemas import (
    ProfileExperienceOut, ProfileExperienceCreate, ProfileExperienceUpdate,
    ProfileSkillOut, ProfileSkillCreate, UserSkillEvidenceOut, UserSkillEvidenceCreate, SkillDisputeRequest
)
from app.services.years_service import canonical_skill, years_count, total_years, INDUSTRIES
from app.services.location_service import enrich_address_data, suggest_industry_domain
from app.services.social_skill_extractor import SocialSkillExtractorService
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

    evidence_counts = {}
    ev_rows = db.query(UserSkillEvidence.skill_id).filter(
        UserSkillEvidence.user_id == current_user.id,
        UserSkillEvidence.is_disputed == False
    ).all()
    for row in ev_rows:
        if row[0]:
            evidence_counts[row[0]] = evidence_counts.get(row[0], 0) + 1

    out = []
    for s in skills:
        item = ProfileSkillOut(
            id=s.id,
            name=s.name,
            source=s.source or "manual",
            proficiency_estimate=s.proficiency_estimate or "Intermediate",
            confidence=s.confidence if s.confidence is not None else 0.70,
            verification_status=s.verification_status or "mentioned",
            evidence_count=evidence_counts.get(s.id, 0),
            user_confirmed=bool(s.user_confirmed),
            created_at=s.created_at
        )
        out.append(item)
    return out

@router.get("/skills/evidence-summary")
def get_skills_evidence_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
    evidences = db.query(UserSkillEvidence).filter(
        UserSkillEvidence.user_id == current_user.id,
        UserSkillEvidence.is_disputed == False
    ).all()

    by_status = {"demonstrated": 0, "mentioned": 0, "unverified": 0}
    for s in skills:
        st = s.verification_status or "mentioned"
        by_status[st] = by_status.get(st, 0) + 1

    by_source = {}
    for e in evidences:
        src = e.source_type or "other"
        by_source[src] = by_source.get(src, 0) + 1

    return {
        "total_skills": len(skills),
        "demonstrated_skills": by_status.get("demonstrated", 0),
        "mentioned_skills": by_status.get("mentioned", 0),
        "unverified_skills": by_status.get("unverified", 0),
        "sources_breakdown": by_source,
        "total_evidences": len(evidences)
    }

@router.get("/skills/{skill_id}/evidence", response_model=List[UserSkillEvidenceOut])
def get_skill_evidence(
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

    evidences = db.query(UserSkillEvidence).filter(
        UserSkillEvidence.skill_id == skill_id,
        UserSkillEvidence.user_id == current_user.id
    ).order_by(UserSkillEvidence.created_at.desc()).all()

    return evidences

@router.post("/skills/{skill_id}/evidence", response_model=UserSkillEvidenceOut, status_code=status.HTTP_201_CREATED)
def add_skill_evidence(
    skill_id: str,
    data: UserSkillEvidenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    skill = db.query(ProfileSkill).filter(
        ProfileSkill.id == skill_id,
        ProfileSkill.user_id == current_user.id
    ).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    is_demonstrated = data.source_type in ("github", "coding_assessment", "project")
    status_str = "demonstrated" if is_demonstrated else "mentioned"
    conf = 0.90 if is_demonstrated else 0.75

    evidence = UserSkillEvidence(
        user_id=current_user.id,
        skill_id=skill.id,
        skill_name=skill.name,
        skill_normalized=skill.name_normalized,
        source_type=data.source_type,
        source_reference=data.source_reference or "User-submitted project evidence",
        evidence_text=data.evidence_text.strip(),
        confidence=conf,
        proficiency_estimate=data.proficiency_estimate,
        verification_status=status_str,
        user_confirmed=True
    )
    db.add(evidence)

    # Recalculate parent skill
    skill.proficiency_estimate = data.proficiency_estimate
    if is_demonstrated or skill.verification_status != "demonstrated":
        skill.verification_status = status_str
    skill.confidence = max(skill.confidence or 0.7, conf)
    skill.user_confirmed = True

    db.commit()
    db.refresh(evidence)

    record_user_activity(
        db, current_user.id, "skill_evidence_added",
        f"Added {data.source_type} evidence for skill '{skill.name}'",
        entity_type="skill", entity_id=skill.id
    )

    return evidence

@router.post("/skills/evidence/{evidence_id}/dispute")
def dispute_or_remove_evidence(
    evidence_id: str,
    data: SkillDisputeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    evidence = db.query(UserSkillEvidence).filter(
        UserSkillEvidence.id == evidence_id,
        UserSkillEvidence.user_id == current_user.id
    ).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence item not found.")

    skill = db.query(ProfileSkill).filter(
        ProfileSkill.id == evidence.skill_id,
        ProfileSkill.user_id == current_user.id
    ).first()

    if data.action == "remove":
        db.delete(evidence)
    elif data.action == "dispute":
        evidence.is_disputed = True
        evidence.dispute_reason = data.reason or "Disputed by user"
    elif data.action == "correct" and data.new_proficiency:
        evidence.proficiency_estimate = data.new_proficiency
        evidence.is_disputed = False

    db.flush()

    if skill:
        active_evidences = db.query(UserSkillEvidence).filter(
            UserSkillEvidence.skill_id == skill.id,
            UserSkillEvidence.user_id == current_user.id,
            UserSkillEvidence.is_disputed == False
        ).all()

        if not active_evidences:
            skill.verification_status = "unverified"
            skill.confidence = 0.40
        else:
            has_dem = any(e.verification_status == "demonstrated" for e in active_evidences)
            skill.verification_status = "demonstrated" if has_dem else "mentioned"
            skill.confidence = round(sum(e.confidence for e in active_evidences) / len(active_evidences), 2)
            skill.proficiency_estimate = active_evidences[0].proficiency_estimate

    db.commit()
    return {"status": "success", "message": f"Evidence {data.action} processed successfully."}

@router.post("/skills", response_model=List[ProfileSkillOut], status_code=status.HTTP_201_CREATED)
def add_profile_skills(
    data: ProfileSkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    out = []
    seen_keys = set()
    for raw in data.names:
        # Split commas if user typed multiple in one string
        for sub in raw.split(","):
            canon = canonical_skill(sub)
            if not canon:
                continue
            key = canon.lower()
            if key in seen_keys:
                continue
            seen_keys.add(key)
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


class SocialSkillExtractRequest(BaseModel):
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None


class SocialSkillImportRequest(BaseModel):
    skills: List[str]


@router.post("/extract-social-skills")
def extract_skills_from_social_profiles(
    data: Optional[SocialSkillExtractRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI-powered extraction of technical & professional competencies from candidate's
    public GitHub repositories and LinkedIn profiles. Strictly sanitizes out all PII.
    """
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()

    gh_url = (data.github_url if data and data.github_url else None) or (profile.github_url if profile else None) or ""
    li_url = (data.linkedin_url if data and data.linkedin_url else None) or (profile.linkedin_url if profile else None) or ""

    existing_skills = [s.name for s in db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()]

    result = SocialSkillExtractorService.extract_social_skills(
        github_url=gh_url,
        linkedin_url=li_url,
        existing_skills=existing_skills
    )

    record_user_activity(
        db, current_user.id, "social_skills_scanned",
        f"AI scanned GitHub/LinkedIn profiles and discovered {result['total_extracted']} skills ({result['new_skills_count']} new)",
        entity_type="profile", entity_id=current_user.id
    )

    return result


@router.post("/import-social-skills")
def import_social_skills(
    data: SocialSkillImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Imports sanitized skills extracted from GitHub & LinkedIn into candidate's profile
    and attaches verified technical evidence.
    """
    imported = []
    seen_keys = set()
    for raw in data.skills:
        sanitized = SocialSkillExtractorService.sanitize_skill_candidate(raw)
        if not sanitized:
            continue
        key = sanitized.lower()
        if key in seen_keys:
            continue
        seen_keys.add(key)

        existing = db.query(ProfileSkill).filter(
            ProfileSkill.user_id == current_user.id,
            ProfileSkill.name_normalized == key
        ).first()

        if existing:
            # Upgrade verification status if not yet demonstrated
            if existing.verification_status != "demonstrated":
                existing.verification_status = "demonstrated"
                existing.confidence = max(existing.confidence or 0.75, 0.90)
                existing.source = "github_linkedin"
            imported.append(existing)
        else:
            new_s = ProfileSkill(
                user_id=current_user.id,
                name=sanitized,
                name_normalized=key,
                source="github_linkedin",
                proficiency_estimate="Advanced",
                confidence=0.92,
                verification_status="demonstrated",
                user_confirmed=True
            )
            db.add(new_s)
            db.flush()

            # Attach evidence record
            ev = UserSkillEvidence(
                user_id=current_user.id,
                skill_id=new_s.id,
                skill_name=new_s.name,
                skill_normalized=new_s.name_normalized,
                source_type="github",
                source_reference="public_repository_artifact",
                evidence_text="Demonstrated across public source code repositories and verified professional profile.",
                confidence=0.92,
                proficiency_estimate="Advanced",
                verification_status="demonstrated",
                user_confirmed=True
            )
            db.add(ev)
            imported.append(new_s)

    db.commit()

    record_user_activity(
        db, current_user.id, "social_skills_imported",
        f"Imported {len(imported)} verified skills from GitHub & LinkedIn profiles",
        entity_type="profile", entity_id=current_user.id
    )

    return {
        "status": "success",
        "imported_count": len(imported),
        "skills": [s.name for s in imported]
    }


