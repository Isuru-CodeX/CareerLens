"""
backend/app/api/coding.py
--------------------------
API routes for Module 11: In-Browser Live Coding & System Design Assessment Sandbox.
Supports role-targeted coding challenges, system design scenarios, automated error checks,
corrections, missed edge cases, rubric scoring, and benchmark model answers.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User
from app.services.coding_challenge_service import CodingChallengeService

router = APIRouter(prefix="/coding", tags=["Live Coding & Assessment Sandbox"])


@router.get("/roles")
def get_supported_roles(
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of engineering roles with active challenges and metadata.
    """
    return CodingChallengeService.get_roles()


@router.get("/challenges")
def get_challenges(
    role: Optional[str] = Query(None, description="Role filter (frontend, backend, fullstack, architect, devops, data_ml, appsec)"),
    track: Optional[str] = Query(None, description="Track filter: coding, system_design, or all"),
    difficulty: Optional[str] = Query(None, description="Difficulty filter: Easy, Medium, Hard, or all"),
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of dynamic coding and system design challenges, with 'is_recommended'
    computed based on candidate target role.
    """
    challenges = CodingChallengeService.get_all_challenges(
        role=role,
        track=track,
        difficulty=difficulty
    )

    user_target = ""
    if current_user.profile and current_user.profile.target_title:
        user_target = current_user.profile.target_title.lower()

    # Annotate recommendations based on user profile
    for ch in challenges:
        target_role = ch.get("target_role", "").lower()
        role_id = ch.get("role_id", "").lower()
        ch["is_recommended"] = bool(
            user_target and (role_id in user_target or any(k in user_target for k in target_role.split()))
        )

    return challenges


@router.get("/challenges/{challenge_id}")
def get_challenge_detail(
    challenge_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Returns specific challenge metadata, problem description, starter code/template,
    hints, and acceptance test cases.
    """
    ch = CodingChallengeService.get_challenge_by_id(challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found.")

    # Hide secret model answer until user submits or explicitly requests it
    safe_detail = {k: v for k, v in ch.items() if k != "model_answer"}
    safe_detail["has_model_answer"] = bool(ch.get("model_answer"))
    return safe_detail


@router.get("/challenges/{challenge_id}/model-answer")
def get_model_answer(
    challenge_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Returns the official benchmark Model Answer and Reference Architecture for a challenge.
    """
    ch = CodingChallengeService.get_challenge_by_id(challenge_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    
    return {
        "challenge_id": challenge_id,
        "title": ch.get("title"),
        "model_answer": ch.get("model_answer", {}),
        "optimal_big_o": ch.get("optimal_big_o")
    }


@router.post("/evaluate")
async def evaluate_code_submission(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deep technical evaluation of candidate code or system design submission:
    - Scans for errors (syntax, concurrency, logic, race conditions, architecture bottlenecks).
    - Generates actionable corrections with code snippets.
    - Highlights missed important things (unhandled edge cases, omitted failure modes).
    - Computes multi-dimensional rubric score (Correctness, Scalability, Quality, Reliability).
    - Delivers the official benchmark Model Answer.
    - Records verified Skill Evidence to candidate profile upon scoring >= 70.
    """
    challenge_id = payload.get("challenge_id", "")
    code = payload.get("code", "")
    language = payload.get("language", "python")
    candidate_role = payload.get("role")
    
    if not candidate_role and current_user.profile:
        candidate_role = current_user.profile.target_title

    res = await CodingChallengeService.evaluate_submission(
        challenge_id=challenge_id,
        code=code,
        language=language,
        candidate_role=candidate_role,
        db=db,
        user=current_user
    )

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Evaluation failed."))

    # Backwards compatibility attributes for legacy consumers
    res["code_quality_score"] = res.get("overall_score", 80)
    res["review_feedback"] = [c.get("fix", "") for c in res.get("corrections", [])] or ["Solution reviewed successfully."]

    log_audit(db, current_user.id, "CODING_CHALLENGE_SUBMITTED", {
        "challenge_id": challenge_id,
        "score": res.get("overall_score"),
        "grade": res.get("grade"),
        "complexity": res.get("estimated_complexity"),
        "errors_count": len(res.get("errors_found", [])),
        "missed_count": len(res.get("missed_important_things", []))
    })

    return res
