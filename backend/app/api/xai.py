"""
backend/app/api/xai.py
-----------------------
API routes for Module 7: Explainable AI (XAI) & Algorithmic Bias / Fairness Auditor.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, Resume
from app.services.xai_bias_service import XaiBiasService

router = APIRouter(prefix="/xai", tags=["Explainable AI & Bias Auditor"])


@router.post("/attributions")
def get_shap_attributions(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes token and sentence-level Shapley value attributions explaining
    the mathematical weights behind the resume-to-job match score.
    """
    resume_text = payload.get("resume_text", "")
    resume_id = payload.get("resume_id")
    job_text = payload.get("job_text", "")
    baseline_score = float(payload.get("baseline_score", 75.0))

    if resume_id and not resume_text:
        resume = db.query(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        ).first()
        if resume and resume.raw_text:
            resume_text = resume.raw_text

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required for attribution analysis.")

    res = XaiBiasService.calculate_shap_attributions(
        resume_text=resume_text,
        job_text=job_text,
        baseline_score=baseline_score
    )

    log_audit(db, current_user.id, "XAI_SHAP_ATTRIBUTION_GENERATED", {
        "positive_phrases": res["positive_impact_count"],
        "negative_phrases": res["negative_impact_count"],
        "calibrated_score": res["calibrated_score"]
    })

    return res


@router.post("/bias-audit")
def audit_text_bias(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scans job descriptions or candidate resumes for unconscious bias,
    gender-coded vocabulary, ageism indicators, and socio-economic elitism.
    """
    text = payload.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required for bias auditing.")

    res = XaiBiasService.scan_unconscious_bias(text)

    log_audit(db, current_user.id, "DEI_BIAS_AUDIT_RUN", {
        "fairness_score": res["fairness_score"],
        "risk_level": res["bias_risk_level"],
        "findings_count": res["total_findings"]
    })

    return res


@router.post("/blind-profile")
def generate_blind_profile(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a de-identified, bias-free candidate summary redacting PII,
    pronouns, graduation years, and geographical locations for fair first-round evaluations.
    """
    resume_text = payload.get("resume_text", "")
    resume_id = payload.get("resume_id")

    if resume_id and not resume_text:
        resume = db.query(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        ).first()
        if resume and resume.raw_text:
            resume_text = resume.raw_text

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required for blind screening redaction.")

    candidate_name = payload.get("candidate_name") or current_user.full_name or ""
    email = payload.get("email") or current_user.email or ""
    phone = payload.get("phone") or ""

    res = XaiBiasService.generate_blind_recruitment_profile(
        resume_text=resume_text,
        candidate_name=candidate_name,
        email=email,
        phone=phone
    )

    log_audit(db, current_user.id, "BLIND_PROFILE_GENERATED", {
        "candidate_alias": res["candidate_alias"],
        "redactions_count": res["redactions_count"]
    })

    return res

