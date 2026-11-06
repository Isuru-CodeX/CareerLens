from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, Resume, JobDescription, JobMatch
from app.schemas.schemas import (
    JobDescriptionCreate, JobDescriptionOut, MatchRequest, JobMatchOut,
    JobUrlExtractRequest, JobUrlExtractResponse
)
from app.services.matching_service import MatchingService
from app.services.job_extractor_service import JobExtractorService
from app.services.deep_match.service import DeepMatchService, to_legacy
from app.services.deep_match.heuristics_v2 import jd_years

router = APIRouter(tags=["Job Descriptions & Matching"])

@router.post("/job-descriptions/extract-url", response_model=JobUrlExtractResponse)
async def extract_job_from_url(
    data: JobUrlExtractRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        extracted = await JobExtractorService.extract_from_url(data.url)
        return extracted
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract job details from URL: {str(e)}"
        )

@router.post("/job-descriptions/analyse", response_model=JobDescriptionOut)
def parse_and_save_job_description(
    data: JobDescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not data.raw_text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty.")

    extracted = MatchingService.extract_job_skills(data.raw_text)

    jd = JobDescription(
        user_id=current_user.id,
        title=data.title or "Target Role",
        company=data.company or "Prospective Employer",
        source_url=data.source_url,
        raw_text=data.raw_text,
        required_skills=extracted["required"],
        preferred_skills=extracted["preferred"],
        experience_level=(f"{int(y)}+ years" if (y := jd_years(data.raw_text)) else None),
        salary_range=None   # never invent pay; Deep Match only reports pay the post states
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)
    log_audit(db, current_user.id, "JOB_DESCRIPTION_ANALYZED", {"jd_id": jd.id, "title": jd.title})
    return jd

@router.get("/job-descriptions", response_model=List[JobDescriptionOut])
def list_job_descriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    jds = db.query(JobDescription).filter(
        JobDescription.user_id == current_user.id
    ).order_by(JobDescription.created_at.desc()).all()
    return jds

@router.post("/matches", response_model=JobMatchOut)
def match_resume(
    req: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(
        Resume.id == req.resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    job_text = ""
    jd_id = req.job_description_id

    if jd_id:
        jd = db.query(JobDescription).filter(
            JobDescription.id == jd_id,
            JobDescription.user_id == current_user.id
        ).first()
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found.")
        job_text = jd.raw_text
    elif req.job_text:
        job_text = req.job_text
        # Save as quick JD
        jd = JobDescription(
            user_id=current_user.id,
            title=req.job_title or "Quick Match Job",
            company=req.company or "Company",
            raw_text=req.job_text,
            required_skills=[],
            preferred_skills=[]
        )
        db.add(jd)
        db.flush()
        jd_id = jd.id
    else:
        raise HTTPException(status_code=400, detail="Either job_description_id or job_text must be provided.")

    # Deep Match: LLM judgement + grounding + deterministic scoring (falls back to the improved basic engine)
    report = DeepMatchService().analyze(resume_text=resume.raw_text or "", job_text=job_text)
    match_result = to_legacy(report)

    job_match = JobMatch(
        user_id=current_user.id,
        resume_id=resume.id,
        job_description_id=jd_id,
        overall_score=match_result["overall_score"],
        structure_score=match_result["structure_score"],
        readability_score=match_result["readability_score"],
        skills_coverage_score=match_result["skills_coverage_score"],
        relevance_score=match_result["relevance_score"],
        matched_skills=match_result["matched_skills"],
        missing_skills=match_result["missing_skills"],
        partial_skills=match_result["partial_skills"],
        match_explanations=match_result["match_explanations"],
        recommendations=match_result["recommendations"],
        analysis=report,
        engine=report["engine"]
    )
    db.add(job_match)
    db.commit()
    db.refresh(job_match)
    log_audit(db, current_user.id, "JOB_MATCH_PERFORMED", {"match_id": job_match.id, "score": job_match.overall_score})
    return job_match

@router.get("/matches", response_model=List[JobMatchOut])
def list_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    matches = db.query(JobMatch).filter(
        JobMatch.user_id == current_user.id
    ).order_by(JobMatch.created_at.desc()).all()
    return matches

@router.get("/matches/{match_id}", response_model=JobMatchOut)
def get_match(
    match_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    match = db.query(JobMatch).filter(
        JobMatch.id == match_id,
        JobMatch.user_id == current_user.id
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    return match

