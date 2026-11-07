"""
backend/app/api/career_navigator.py - Career Path Knowledge Graph & Offer Negotiation Coach API.
Endpoints for:
- Directed Knowledge Graph retrieval & Dijkstra career bridge pathfinding (Pillar 3)
- Market salary prediction & percentile compensation bands (Pillar 5)
- Interactive game-theory salary negotiation simulator (Pillar 5)
- Ready-to-copy battle-tested counter-offer scripts
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Resume
from app.services.career_graph_service import CareerGraphService
from app.services.salary_predictor_service import (
    SalaryPredictorService,
    LOCATION_TIERS,
    COMPANY_TIERS,
    SKILL_ROI_REGISTRY
)

router = APIRouter(prefix="/career", tags=["Career Navigator & Salary Coach"])


# Request & Response Schemas
class CareerBridgeRequest(BaseModel):
    current_role_id: str
    target_role_id: str
    candidate_skills: Optional[List[str]] = Field(default_factory=list)
    resume_id: Optional[str] = None


class SalaryPredictionRequest(BaseModel):
    role_title: str
    experience_years: float = Field(default=3.0, ge=0.0, le=40.0)
    skills: Optional[List[str]] = Field(default_factory=list)
    location_tier: Optional[str] = "us_tier1"
    company_tier: Optional[str] = "growth_scaleup"


class NegotiationTurnRequest(BaseModel):
    role_title: str
    current_offer: float = Field(..., ge=10000.0)
    target_salary: float = Field(..., ge=10000.0)
    candidate_pitch: str
    turn_no: int = Field(default=1, ge=1)
    history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class NegotiationScriptsRequest(BaseModel):
    role_title: str
    company: Optional[str] = "Target Company"
    current_offer: float = Field(..., ge=10000.0)
    target_salary: float = Field(..., ge=10000.0)
    highlight_skill: Optional[str] = "Distributed Systems & Cloud Architecture"


# -------------------------------------------------------------------------
# Pillar 3: Career Path Knowledge Graph Endpoints
# -------------------------------------------------------------------------

@router.get("/graph")
def get_career_knowledge_graph(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the complete Directed Career Knowledge Graph including roles, competencies,
    progression edges, and level hierarchies.
    """
    return CareerGraphService.get_graph_data()


@router.post("/bridge")
def compute_career_bridge(
    req: CareerBridgeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes shortest-path career bridge using Dijkstra / BFS graph pathfinding.
    Calculates milestone sequences, verified/transferrable/missing skill gaps,
    feasibility score, and a 3-phase structured learning roadmap.
    """
    candidate_skills = list(req.candidate_skills or [])

    # If resume_id is provided, auto-extract skills from resume
    if req.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == req.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if resume and resume.skills:
            for s in resume.skills:
                s_name = s.name if hasattr(s, "name") else str(s)
                if s_name and s_name not in candidate_skills:
                    candidate_skills.append(s_name)

    result = CareerGraphService.find_career_bridge(
        current_role_id=req.current_role_id,
        target_role_id=req.target_role_id,
        candidate_skills=candidate_skills
    )

    if not result.get("path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No valid progression path found between '{req.current_role_id}' and '{req.target_role_id}'."
        )

    return result


# -------------------------------------------------------------------------
# Pillar 5: Market Salary Predictor & Offer Negotiation Coach Endpoints
# -------------------------------------------------------------------------

@router.get("/salary/metadata")
def get_salary_predictor_metadata(
    current_user: User = Depends(get_current_user)
):
    """
    Returns supported location tiers, company stages, and high-ROI technical skill multipliers.
    """
    return {
        "location_tiers": list(LOCATION_TIERS.values()),
        "company_tiers": list(COMPANY_TIERS.values()),
        "high_roi_skills": [
            {"key": k, "name": v["name"], "bonus_pct": round(v["bonus_pct"] * 100, 1), "category": v["category"]}
            for k, v in SKILL_ROI_REGISTRY.items()
        ]
    }


@router.post("/salary/predict")
def predict_salary_compensation(
    req: SalaryPredictionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Predicts calibrated compensation bands (25th, 50th, 75th, 90th percentiles),
    annual bonuses, equity value, and top skill ROI boosters.
    """
    return SalaryPredictorService.predict_compensation(
        role_title=req.role_title,
        experience_years=req.experience_years,
        skills=req.skills,
        location_tier=req.location_tier or "us_tier1",
        company_tier=req.company_tier or "growth_scaleup"
    )


@router.post("/negotiate/turn")
def evaluate_negotiation_turn(
    req: NegotiationTurnRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Interactive game-theory negotiation simulator.
    Evaluates candidate pitch, computes leverage index, firmness vs. politeness metrics,
    and returns a realistic spoken HR recruiter counter-response with tactical coach feedback.
    """
    return SalaryPredictorService.evaluate_negotiation_turn(
        role_title=req.role_title,
        current_offer=req.current_offer,
        target_salary=req.target_salary,
        candidate_pitch=req.candidate_pitch,
        turn_no=req.turn_no,
        history=req.history
    )


@router.post("/negotiate/scripts")
def generate_negotiation_scripts(
    req: NegotiationScriptsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generates 5 battle-tested, structured counter-offer templates ready to copy and send.
    """
    return SalaryPredictorService.generate_counter_offer_scripts(
        role_title=req.role_title,
        company=req.company or "Target Company",
        current_offer=req.current_offer,
        target_salary=req.target_salary,
        highlight_skill=req.highlight_skill
    )

