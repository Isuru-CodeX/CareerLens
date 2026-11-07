"""
backend/app/api/github_verifier.py
-----------------------------------
API routes for Module 10: GitHub & Technical Artifact "Proof of Work" Verifier.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, ProfileSkill
from app.services.github_verifier_service import GithubVerifierService

router = APIRouter(prefix="/verification", tags=["Proof of Work Verifier"])


@router.post("/github-audit")
def audit_github(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Audits candidate's public GitHub profile and cross-verifies self-declared
    resume skills against concrete code repositories and commit artifacts.
    """
    username = payload.get("username", "")
    if not username.strip():
        raise HTTPException(status_code=400, detail="GitHub username is required.")

    # Retrieve candidate's claimed skills from profile or request payload
    claimed_skills = payload.get("claimed_skills")
    if not claimed_skills:
        user_skills = db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
        claimed_skills = [s.name for s in user_skills] if user_skills else [
            "Python", "FastAPI", "PostgreSQL", "Docker", "React", "TypeScript"
        ]

    res = GithubVerifierService.audit_github_profile(
        username=username,
        claimed_skills=claimed_skills,
        candidate_id=current_user.id
    )

    log_audit(db, current_user.id, "GITHUB_PROOF_OF_WORK_AUDITED", {
        "username": username,
        "integrity_score": res.get("integrity_score"),
        "verified_count": len(res.get("verified_skills", []))
    })

    return res

