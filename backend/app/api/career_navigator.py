"""
backend/app/api/career_navigator.py - Career Path Knowledge Graph & Offer Negotiation Coach API.
Endpoints for:
- Directed Knowledge Graph retrieval & Dijkstra career bridge pathfinding (Pillar 3)
- Market salary prediction & percentile compensation bands (Pillar 5)
- Interactive game-theory salary negotiation simulator (Pillar 5)
- Ready-to-copy battle-tested counter-offer scripts
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Resume, CareerGoal, ProfileSkill, UserSkillEvidence
from app.services.activity_service import record_user_activity
from app.services.career_graph_service import CareerGraphService, INDUSTRIES
from app.services.salary_service import SalaryService
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
    country: Optional[str] = "us"


class SalaryPredictionRequest(BaseModel):
    role_title: str
    experience_years: float = Field(default=3.0, ge=0.0, le=40.0)
    skills: Optional[List[str]] = Field(default_factory=list)
    location_tier: Optional[str] = "us_tier1"
    company_tier: Optional[str] = "growth_scaleup"
    country: Optional[str] = "us"


class NegotiationTurnRequest(BaseModel):
    role_title: str
    current_offer: float = Field(..., ge=10000.0)
    target_salary: float = Field(..., ge=10000.0)
    candidate_pitch: str
    turn_no: int = Field(default=1, ge=1)
    history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    difficulty: Optional[str] = "standard"


class VerifySalaryRequest(BaseModel):
    role_title: str
    industry: Optional[str] = None
    country: Optional[str] = "US"
    currency: Optional[str] = "USD"
    years_experience: Optional[float] = 3.0


class NegotiationScriptsRequest(BaseModel):
    role_title: str
    company: Optional[str] = "Target Company"
    current_offer: float = Field(..., ge=10000.0)
    target_salary: float = Field(..., ge=10000.0)
    highlight_skill: Optional[str] = "Distributed Systems & Cloud Architecture"


# -------------------------------------------------------------------------
# Pillar 3: Career Path Knowledge Graph Endpoints
# -------------------------------------------------------------------------

@router.get("/industries")
def get_career_industries(
    current_user: User = Depends(get_current_user)
):
    """
    Returns supported multi-profession career industries (Tech, Healthcare, Finance, Education, Legal, Marketing).
    """
    return CareerGraphService.get_industries()


@router.get("/graph")
def get_career_knowledge_graph(
    industry_id: Optional[str] = Query(None, description="Industry domain filter (e.g. 'tech', 'healthcare', 'finance')"),
    country: Optional[str] = Query("us", description="ISO country code (e.g. 'us', 'lk', 'in', 'jp', 'gb')"),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the complete Directed Career Knowledge Graph including roles, competencies,
    progression edges, and level hierarchies, optionally filtered by industry and calibrated to country.
    """
    return CareerGraphService.get_graph_data(industry_id=industry_id, country=country or "us")


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
        candidate_skills=candidate_skills,
        country=req.country or "us"
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
    role_title: Optional[str] = Query(None, description="Target role title to retrieve domain-appropriate skills"),
    industry_id: Optional[str] = Query(None, description="Industry domain identifier to filter skills"),
    current_user: User = Depends(get_current_user)
):
    """
    Returns supported location tiers, company stages, and role-tailored high-ROI domain skills.
    """
    return SalaryPredictorService.get_salary_metadata(role_title=role_title, industry_id=industry_id)


@router.post("/salary/predict")
def predict_salary_compensation(
    req: SalaryPredictionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Predicts calibrated compensation bands (25th, 50th, 75th, 90th percentiles),
    annual bonuses, equity value, and top skill ROI boosters for specified country.
    """
    return SalaryPredictorService.predict_compensation(
        role_title=req.role_title,
        experience_years=req.experience_years,
        skills=req.skills,
        location_tier=req.location_tier or "us_tier1",
        company_tier=req.company_tier or "growth_scaleup",
        country=req.country or "us"
    )


@router.get("/salary/benchmark")
def get_verified_salary_benchmark(
    role_title: str = Query(..., description="Target role name (e.g. Registered Nurse, Senior Full Stack Engineer)"),
    industry: Optional[str] = Query(None, description="Industry domain"),
    country: Optional[str] = Query("US", description="Country code"),
    currency: Optional[str] = Query("USD", description="Currency symbol"),
    years_experience: Optional[float] = Query(3.0, description="Years of experience"),
    current_user: User = Depends(get_current_user)
):
    """
    Returns official government & enterprise wage data (BLS, O*NET, Mercer)
    with source citations, sample sizes, and strict band validation.
    """
    return SalaryService.get_verified_benchmark(
        role_title=role_title,
        industry=industry,
        country=country,
        currency=currency,
        years_experience=years_experience
    )


@router.post("/salary/verify-online")
def verify_salary_online(
    req: VerifySalaryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Real-time AI online salary verification citing live market surveys.
    Strictly constrained to real numbers and verifiable survey URLs.
    """
    return SalaryService.verify_online_compensation(
        role_title=req.role_title,
        industry=req.industry,
        country=req.country,
        currency=req.currency,
        years_experience=req.years_experience
    )


@router.post("/negotiate/turn")
def evaluate_negotiation_turn(
    req: NegotiationTurnRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Interactive game-theory negotiation simulator.
    Evaluates candidate pitch, computes leverage index, firmness vs. politeness metrics,
    and returns a realistic spoken HR recruiter counter-response with upgradable offer clauses.
    """
    return SalaryPredictorService.evaluate_negotiation_turn(
        role_title=req.role_title,
        current_offer=req.current_offer,
        target_salary=req.target_salary,
        candidate_pitch=req.candidate_pitch,
        turn_no=req.turn_no,
        history=req.history,
        difficulty=req.difficulty or "standard"
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


# -------------------------------------------------------------------------
# Section 4.4: Career Goal Persistence, Path Comparison & Milestone Tracking
# -------------------------------------------------------------------------

class SaveCareerGoalRequest(BaseModel):
    target_role_id: str
    target_title: str
    target_date: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    milestones: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class ComparePathsRequest(BaseModel):
    target_role_ids: List[str] = Field(..., min_length=2, max_length=5)
    current_role_id: Optional[str] = None
    country: Optional[str] = "us"


@router.get("/goals")
def get_user_career_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the user's active career goal and milestone progression.
    """
    goal = db.query(CareerGoal).filter(
        CareerGoal.user_id == current_user.id,
        CareerGoal.is_active == True
    ).order_by(CareerGoal.created_at.desc()).first()

    goal_dict = None
    if goal:
        goal_dict = {
            "id": goal.id,
            "target_role_id": goal.target_role_id,
            "target_title": goal.target_title,
            "target_date": goal.target_date,
            "preferences": goal.preferences or {},
            "milestones": goal.milestones or [],
            "is_active": goal.is_active,
            "created_at": goal.created_at,
            "updated_at": goal.updated_at
        }

    return {
        "active_goal": goal_dict,
        "has_goal": goal is not None
    }


@router.post("/goals")
def save_or_update_career_goal(
    req: SaveCareerGoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Saves or updates the user's active career goal with milestone milestones.
    """
    # Deactivate existing goals
    db.query(CareerGoal).filter(
        CareerGoal.user_id == current_user.id,
        CareerGoal.is_active == True
    ).update({"is_active": False})

    milestones = req.milestones
    if not milestones:
        milestones = [
            {"id": "m1", "title": f"Complete verified skill assessments for {req.target_title}", "completed": False},
            {"id": "m2", "title": "Build a hands-on production portfolio project demonstrating core stack", "completed": False},
            {"id": "m3", "title": "Pass mock technical and architecture interview simulation", "completed": False},
            {"id": "m4", "title": "Apply to 5 high-alignment target roles and track on Kanban", "completed": False}
        ]

    goal = CareerGoal(
        user_id=current_user.id,
        target_role_id=req.target_role_id,
        target_title=req.target_title,
        preferences=req.preferences or {},
        milestones=milestones,
        is_active=True
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    record_user_activity(
        db, current_user.id, "career_goal_updated",
        f"Set target career goal to '{req.target_title}'",
        entity_type="career_goal", entity_id=goal.id
    )

    goal_dict = {
        "id": goal.id,
        "target_role_id": goal.target_role_id,
        "target_title": goal.target_title,
        "target_date": goal.target_date,
        "preferences": goal.preferences or {},
        "milestones": goal.milestones or [],
        "is_active": goal.is_active,
        "created_at": goal.created_at,
        "updated_at": goal.updated_at
    }

    return {"status": "success", "goal": goal_dict}


@router.patch("/goals/{goal_id}/milestones/{milestone_id}")
def toggle_goal_milestone(
    goal_id: str,
    milestone_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggles a milestone state between completed and pending.
    """
    goal = db.query(CareerGoal).filter(
        CareerGoal.id == goal_id,
        CareerGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Career goal not found.")

    milestones = list(goal.milestones or [])
    found = False
    for m in milestones:
        if m.get("id") == milestone_id:
            m["completed"] = not m.get("completed", False)
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Milestone not found in career goal.")

    goal.milestones = [dict(item) for item in milestones]
    flag_modified(goal, "milestones")
    db.commit()
    db.refresh(goal)

    return {"status": "success", "milestones": goal.milestones}


@router.post("/compare")
def compare_career_paths(
    req: ComparePathsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compares 2 or more target career paths side-by-side:
    required skills, verified skills from profile, skill gaps, estimated effort,
    and calibrated market salary percentiles.
    """
    # Load user's profile skills
    user_skills = [
        s.name for s in db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
    ]

    comparisons = []
    graph = CareerGraphService.get_full_graph()
    nodes = {n["id"]: n for n in graph.get("nodes", [])}
    nodes_by_title = {n["title"].lower(): n for n in graph.get("nodes", [])}

    for role_id in req.target_role_ids:
        node = nodes.get(role_id)
        if not node:
            normalized_key = role_id.lower().replace("_", " ")
            node = nodes_by_title.get(normalized_key) or nodes_by_title.get(role_id.lower())
        if not node:
            # Fuzzy token overlap match
            import re
            role_tokens = set(re.findall(r"[a-zA-Z0-9]+", role_id.lower()))
            best_node = None
            best_overlap = 0
            for n in graph.get("nodes", []):
                n_tokens = set(re.findall(r"[a-zA-Z0-9]+", (n["id"] + " " + n["title"]).lower()))
                overlap = len(role_tokens & n_tokens)
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_node = n
            if best_overlap >= 1:
                node = best_node

        if not node:
            continue

        req_skills = node.get("required_skills", [])
        verified = [s for s in req_skills if any(s.lower() == u.lower() for u in user_skills)]
        missing = [s for s in req_skills if s not in verified]
        match_pct = round((len(verified) / max(len(req_skills), 1)) * 100)

        # Get salary benchmark
        salary_info = SalaryPredictorService.predict_compensation(
            role_title=node["title"],
            experience_years=node.get("experience_years_min", 3.0),
            skills=req_skills,
            country=req.country or "us"
        )

        comparisons.append({
            "role_id": role_id,
            "title": node["title"],
            "domain": node.get("domain", "Engineering"),
            "seniority_tier": node.get("seniority_tier", "L2"),
            "match_percent": match_pct,
            "required_skills": req_skills,
            "verified_skills": verified,
            "missing_skills": missing,
            "estimated_transition_months": max(3, len(missing) * 2),
            "salary_bands": salary_info.get("percentiles", {}),
            "currency": salary_info.get("currency", "USD")
        })

    return {"comparisons": comparisons}

