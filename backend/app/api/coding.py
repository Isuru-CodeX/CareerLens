"""
backend/app/api/coding.py
--------------------------
API routes for Module 11: In-Browser Live Coding & System Design Assessment Sandbox.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User
from app.services.coding_challenge_service import CodingChallengeService

router = APIRouter(prefix="/coding", tags=["Live Coding & Assessment Sandbox"])


@router.get("/challenges")
def get_challenges(
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of dynamic coding and system design challenges.
    """
    return CodingChallengeService.get_all_challenges()


@router.get("/challenges/{challenge_id}")
def get_challenge_detail(
    challenge_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Returns specific challenge metadata, problem description, starter code, and test cases.
    """
    ch = CodingChallengeService.get_challenge_by_id(challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    return ch


@router.post("/evaluate")
def evaluate_code_submission(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates candidate code submission for algorithmic correctness, Big-O complexity, and style.
    """
    challenge_id = payload.get("challenge_id", "")
    code = payload.get("code", "")
    language = payload.get("language", "python")

    res = CodingChallengeService.evaluate_code(
        challenge_id=challenge_id,
        code=code,
        language=language
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Evaluation failed."))

    log_audit(db, current_user.id, "CODING_CHALLENGE_SUBMITTED", {
        "challenge_id": challenge_id,
        "complexity": res.get("estimated_complexity"),
        "quality_score": res.get("code_quality_score")
    })

    return res

