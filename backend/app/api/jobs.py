import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, Resume, JobDescription, JobMatch, Preset, CareerProfile
from app.schemas.schemas import (
    JobDescriptionCreate, JobDescriptionOut, MatchRequest, JobMatchOut,
    JobUrlExtractRequest, JobUrlExtractResponse,
    VectorRagMatchRequest, VectorRagMatchResponse, AtsStressTestResponse
)
from app.services.matching_service import MatchingService
from app.services.job_extractor_service import JobExtractorService
from app.services.deep_match.service import DeepMatchService, to_legacy
from app.services.deep_match.heuristics_v2 import jd_years
from app.services.activity_service import record_user_activity
from app.services.vector_rag_service import VectorRagService
from app.services.ats_emulator_service import AtsEmulatorService

logger = logging.getLogger("careerlens.jobs")

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
        logger.exception(f"URL extraction error for {data.url}")
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

    record_user_activity(
        db, current_user.id, "job_description_added",
        f"Added job description '{jd.title}' ({jd.company})",
        entity_type="job_description", entity_id=jd.id
    )

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
async def match_resume(
    req: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_rid = (req.resume_id or "all").strip()
    resume = None
    resume_text = ""

    if target_rid == "all":
        all_resumes = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(Resume.created_at.desc()).all()
        if not all_resumes:
            raise HTTPException(status_code=404, detail="No resumes found in your library. Please upload a resume first.")
        resume = all_resumes[0]
        resume_text = "\n\n=== COMBINED CANDIDATE RESUME DOSSIER ===\n\n".join(
            [f"[File: {r.file_name}]\n{r.raw_text or ''}" for r in all_resumes if r.raw_text]
        )
        # Also append verified profile skills
        prof = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
        if prof and prof.skills_list:
            sk_names = [s.get("name") if isinstance(s, dict) else str(s) for s in prof.skills_list]
            resume_text += f"\n\nVerified Profile Skills: {', '.join(sk_names)}"

    elif target_rid.startswith("preset:"):
        preset_id = target_rid.replace("preset:", "")
        preset = db.query(Preset).filter(
            Preset.id == preset_id,
            Preset.user_id == current_user.id
        ).first()
        r_ids = [pr.resume_id for pr in preset.resumes] if (preset and preset.resumes) else []
        target_resumes = db.query(Resume).filter(
            Resume.id.in_(r_ids),
            Resume.user_id == current_user.id
        ).all() if r_ids else []
        if not target_resumes:
            target_resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
        if not target_resumes:
            raise HTTPException(status_code=404, detail="No resumes found for this preset.")
        resume = target_resumes[0]
        resume_text = "\n\n=== PRESET CANDIDATE DOSSIER ===\n\n".join(
            [f"[File: {r.file_name}]\n{r.raw_text or ''}" for r in target_resumes if r.raw_text]
        )

    elif target_rid.startswith("resume:"):
        actual_id = target_rid.replace("resume:", "")
        resume = db.query(Resume).filter(
            Resume.id == actual_id,
            Resume.user_id == current_user.id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")
        resume_text = resume.raw_text or ""

    else:
        resume = db.query(Resume).filter(
            Resume.id == target_rid,
            Resume.user_id == current_user.id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")
        resume_text = resume.raw_text or ""

    job_text = ""
    target_title = req.job_title
    target_company = req.company
    jd_id = req.job_description_id

    if jd_id:
        jd = db.query(JobDescription).filter(
            JobDescription.id == jd_id,
            JobDescription.user_id == current_user.id
        ).first()
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found.")
        job_text = jd.raw_text
        target_title = target_title or jd.title
        target_company = target_company or jd.company
    elif req.job_text:
        job_text = req.job_text.strip()
        # Auto-detect if job_text is a web URL
        if job_text.startswith(("http://", "https://")):
            try:
                ext = await JobExtractorService.extract_from_url(job_text)
                job_text = ext.get("job_description") or job_text
                target_title = target_title or ext.get("job_title")
                target_company = target_company or ext.get("company_name")
            except Exception as e:
                logger.warning(f"Could not auto-extract URL in job_text: {e}")

        # Save as quick JD
        jd = JobDescription(
            user_id=current_user.id,
            title=target_title or "Quick Match Job",
            company=target_company or "Company",
            raw_text=job_text,
            required_skills=[],
            preferred_skills=[]
        )
        db.add(jd)
        db.flush()
        jd_id = jd.id
    else:
        raise HTTPException(status_code=400, detail="Either job_description_id or job_text must be provided.")

    try:
        # Deep Match: LLM judgement + grounding + deterministic scoring (falls back to the improved basic engine)
        report = DeepMatchService().analyze(
            resume_text=resume_text or resume.raw_text or "",
            job_text=job_text,
            job_title=target_title,
            company=target_company
        )
        match_result = to_legacy(report)
    except Exception as e:
        logger.exception("Error in DeepMatchService analyze, attempting safe fallback")
        # Extreme fallback to ensure user never receives a 500 error
        from app.services.deep_match.heuristics_v2 import estimate_years
        years = estimate_years(resume_text or resume.raw_text or "")
        report = DeepMatchService()._heuristic_report(
            resume_text=resume_text or resume.raw_text or "",
            job_text=job_text,
            years=years,
            job_title=target_title,
            company=target_company
        )
        report["warnings"].append(f"Analysis recovered via resilient fallback: {str(e)[:100]}")
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

    record_user_activity(
        db, current_user.id, "job_match_completed",
        f"Completed job match for '{target_title or 'Target Role'}' at '{target_company or 'Company'}' (Score: {job_match.overall_score}%)",
        entity_type="job_match", entity_id=job_match.id
    )

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

# =========================================================================
# PILLAR 1: HYBRID SEMANTIC SEARCH & VECTOR RAG + ATS STRESS-TEST ENGINE
# =========================================================================

@router.post("/jobs/vector-rag/match", response_model=VectorRagMatchResponse)
async def perform_vector_rag_match(
    req: VectorRagMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes dense vector chunk embedding, cosine similarity bipartite matching,
    cross-encoder semantic alignment, and hybrid scoring.
    """
    resume_text = req.resume_text or ""
    file_name = None

    if req.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == req.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")
        resume_text = resume.raw_text or ""
        file_name = resume.file_name

    if not resume_text:
        # Fallback to latest resume
        latest = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).order_by(Resume.created_at.desc()).first()
        if latest:
            resume_text = latest.raw_text or ""
            file_name = latest.file_name

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="No resume content provided for vector RAG matching.")

    job_text = req.job_text or ""
    target_title = req.job_title
    target_company = req.company

    if req.job_description_id:
        jd = db.query(JobDescription).filter(
            JobDescription.id == req.job_description_id,
            JobDescription.user_id == current_user.id
        ).first()
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found.")
        job_text = jd.raw_text
        target_title = target_title or jd.title
        target_company = target_company or jd.company

    if not job_text.strip():
        raise HTTPException(status_code=400, detail="Job description text is required for vector RAG matching.")

    result = VectorRagService.perform_hybrid_rag_matching(
        resume_text=resume_text,
        job_text=job_text,
        job_title=target_title,
        company=target_company
    )

    log_audit(db, current_user.id, "VECTOR_RAG_MATCH_COMPUTED", {
        "hybrid_score": result["overall_hybrid_score"],
        "semantic_score": result["semantic_vector_score"],
        "job_title": target_title
    })

    return result

@router.post("/jobs/ats-stress-test/raw", response_model=AtsStressTestResponse)
def run_ats_stress_test_raw(
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """
    Stress-tests arbitrary raw resume text against Workday, Greenhouse, Taleo, and Lever.
    """
    text = payload.get("text", "")
    file_name = payload.get("file_name", "Pasted Resume Text")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required for ATS stress-testing.")

    return AtsEmulatorService.run_full_stress_test(text, file_name=file_name)

@router.post("/jobs/ats-stress-test/resume/{resume_id}", response_model=AtsStressTestResponse)
def run_ats_stress_test_for_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stress-tests an existing stored resume against Workday, Greenhouse, Taleo, and Lever.
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    text = resume.raw_text or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Resume has no extracted text.")

    res = AtsEmulatorService.run_full_stress_test(text, file_name=resume.file_name)

    log_audit(db, current_user.id, "ATS_STRESS_TEST_RUN", {
        "resume_id": resume_id,
        "overall_score": res["overall_ats_score"],
        "risk_rating": res["overall_risk_rating"]
    })

    return res

