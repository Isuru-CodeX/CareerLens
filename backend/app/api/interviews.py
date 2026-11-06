"""
backend/app/api/interviews.py - Real-Time Voice AI Mock Interview Simulator API.
Handles interactive turn-by-turn interview simulation, STAR scoring, speech metrics,
and multimodal performance scorecards.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, InterviewSession, Resume, CareerProfile
from app.services.interview_simulator_service import InterviewSimulatorService
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/interviews", tags=["Voice AI Mock Interview"])

class StartSessionRequest(BaseModel):
    role_title: str
    company: Optional[str] = "Target Company"
    format: Optional[str] = None
    format_type: Optional[str] = "mixed"  # "behavioral", "technical", "system_design", "mixed"
    total_questions: Optional[int] = 4
    resume_id: Optional[str] = None

class SubmitAnswerRequest(BaseModel):
    turn_no: Optional[int] = None
    turn_index: Optional[int] = None
    question: Optional[str] = None
    transcript: Optional[str] = None
    answer_text: Optional[str] = None
    duration_seconds: float = Field(default=30.0, ge=1.0)

class CompleteSessionRequest(BaseModel):
    notes: Optional[str] = None

@router.post("/session/start")
def start_interview_session(
    req: StartSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fmt = req.format or req.format_type or "mixed"
    first_q = InterviewSimulatorService.generate_question(
        role_title=req.role_title,
        company=req.company or "the target firm",
        format_type=fmt,
        turn_no=1
    )

    session = InterviewSession(
        user_id=current_user.id,
        role_title=req.role_title,
        company=req.company or "Target Company",
        format_type=fmt,
        status="in_progress",
        turns=[{
            "turn": 1,
            "question": first_q["question"],
            "why_asked": first_q.get("why_asked"),
            "category": first_q.get("category"),
            "star_guidance": first_q.get("star_guidance")
        }]
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    record_user_activity(
        db, current_user.id, "interview_session_started",
        f"Started Voice AI Mock Interview for {req.role_title} at {req.company}",
        entity_type="interview", entity_id=session.id
    )

    return {
        "session_id": session.id,
        "role_title": session.role_title,
        "company": session.company,
        "format_type": session.format_type,
        "turn_no": 1,
        "current_turn": 1,
        "total_questions": req.total_questions or 4,
        "first_question": first_q,
        "initial_question": first_q
    }

@router.post("/session/{session_id}/answer")
def submit_interview_answer(
    session_id: str,
    req: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    turn_number = req.turn_no or req.turn_index or 1
    answer_text = (req.transcript or req.answer_text or "").strip()

    # Determine question text
    question_text = req.question or ""
    if not question_text and session.turns:
        for t in reversed(session.turns):
            if t.get("turn") == turn_number and t.get("question"):
                question_text = t["question"]
                break
        if not question_text:
            question_text = session.turns[-1].get("question", f"Question {turn_number}")

    # 1. Analyze speech metrics (WPM, fillers, pacing)
    speech_metrics = InterviewSimulatorService.analyze_speech_metrics(
        transcript=answer_text,
        duration_seconds=req.duration_seconds
    )

    # 2. Evaluate STAR adherence
    star_eval = InterviewSimulatorService.evaluate_star_adherence(
        transcript=answer_text,
        question=question_text
    )

    # 3. Generate adaptive follow-up or next turn question
    turns_history = list(session.turns or [])
    next_turn_no = turn_number + 1
    next_question = None

    if next_turn_no <= 5:
        # If STAR result was missing/weak, the follow_up becomes the prompt
        if star_eval.get("follow_up_prompt") and star_eval.get("overall_star_score", 100) < 68:
            next_question = {
                "question_id": f"q_probe_{next_turn_no}",
                "turn": next_turn_no,
                "question": star_eval["follow_up_prompt"],
                "category": "adaptive_probe",
                "why_asked": "Probing deeper into quantified metrics and concrete technical actions.",
                "star_guidance": "Provide specific numbers, percentages, or architectural decisions."
            }
        else:
            next_question = InterviewSimulatorService.generate_question(
                role_title=session.role_title,
                company=session.company,
                format_type=session.format_type,
                turn_no=next_turn_no,
                previous_turns=turns_history
            )

    # 4. Generate 2 to 3 exemplary model answers for candidate study
    suitable_answers = InterviewSimulatorService.generate_model_answers(
        question=question_text,
        role_title=session.role_title,
        company=session.company,
        category=session.format_type
    )

    # Record turn details
    turn_record = {
        "turn": turn_number,
        "question": question_text,
        "transcript": answer_text,
        "duration_seconds": req.duration_seconds,
        "speech_metrics": speech_metrics,
        "star_evaluation": star_eval,
        "suitable_answers": suitable_answers
    }

    # Update session turns
    updated_turns = []
    found = False
    for t in turns_history:
        if t.get("turn") == turn_number:
            updated_turns.append(turn_record)
            found = True
        else:
            updated_turns.append(t)
    if not found:
        updated_turns.append(turn_record)

    if next_question:
        updated_turns.append({
            "turn": next_turn_no,
            "question": next_question["question"],
            "why_asked": next_question.get("why_asked"),
            "category": next_question.get("category"),
            "star_guidance": next_question.get("star_guidance")
        })

    session.turns = updated_turns
    db.commit()

    is_last = next_question is None or next_turn_no > 5

    return {
        "session_id": session.id,
        "turn_no": turn_number,
        "turn_index": turn_number,
        "duration_seconds": req.duration_seconds,
        "speech_metrics": speech_metrics,
        "star_evaluation": star_eval,
        "suitable_answers": suitable_answers,
        "follow_up_prompt": star_eval.get("follow_up_prompt"),
        "next_question": next_question,
        "is_last_turn": is_last,
        "is_final_turn": is_last
    }

@router.post("/session/{session_id}/complete")
def complete_interview_session(
    session_id: str,
    req: Optional[CompleteSessionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    scorecard = InterviewSimulatorService.compile_scorecard(
        role_title=session.role_title,
        company=session.company,
        turns=session.turns or []
    )

    session.status = "completed"
    session.overall_score = scorecard.get("overall_score", 0)
    session.scorecard = scorecard
    db.commit()

    record_user_activity(
        db, current_user.id, "interview_session_completed",
        f"Completed Voice AI Mock Interview for {session.role_title} with score {session.overall_score}/100 ({scorecard.get('recommendation')})",
        entity_type="interview", entity_id=session.id,
        metadata={"overall_score": session.overall_score, "recommendation": scorecard.get("recommendation")}
    )

    return {
        "session_id": session.id,
        "status": "completed",
        "scorecard": scorecard
    }

@router.get("/sessions")
def list_interview_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).order_by(InterviewSession.created_at.desc()).limit(20).all()

    return [
        {
            "id": s.id,
            "role_title": s.role_title,
            "company": s.company,
            "format_type": s.format_type,
            "status": s.status,
            "overall_score": s.overall_score,
            "turns_count": len(s.turns or []),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "recommendation": (s.scorecard or {}).get("recommendation")
        }
        for s in sessions
    ]

@router.get("/session/{session_id}")
def get_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    return {
        "id": session.id,
        "role_title": session.role_title,
        "company": session.company,
        "format_type": session.format_type,
        "status": session.status,
        "overall_score": session.overall_score,
        "turns": session.turns or [],
        "scorecard": session.scorecard or {},
        "created_at": session.created_at.isoformat() if session.created_at else None
    }

