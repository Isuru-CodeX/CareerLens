"""
backend/app/api/navigator.py - Career Navigator Global Salary Explorer & Market Rates API.
Remote.com Salary Explorer Grade Intelligence Engine.
Endpoints for:
- GET /api/navigator/industries: lists industries with canonical role counts
- GET /api/navigator/roles: lists roles with accurate localized 2026 salaries across countries & tiers
- GET /api/navigator/roles/{role_id}/salary: returns Remote.com-style salary explorer data,
  multi-timeframe historical trend charts (today, 7d, 30d, week, year), and in-demand skill premiums
- GET /api/navigator/roles/{role_id}/jobs: live job postings with attribution links
- POST /api/navigator/refresh: triggers live market recalibration with cooldown
"""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db, SessionLocal
from app.core.dependencies import get_current_user
from app.models.models import User, JobRole
from app.services.navigator_service import NavigatorService, GLOBAL_COUNTRIES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/navigator", tags=["Career Navigator Salary Explorer"])


async def _run_manual_refresh():
    db = SessionLocal()
    try:
        await NavigatorService.refresh_all(db, max_roles=30)
    except Exception as e:
        logger.error("Manual refresh background error: %s", e)
    finally:
        db.close()


@router.get("/industries")
def list_industries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all career industries with active role counts.
    """
    return NavigatorService.get_industries(db)


@router.get("/countries")
def list_countries(
    current_user: User = Depends(get_current_user)
):
    """
    Returns all 18 supported global countries with currency codes and flags.
    """
    return [
        {"code": k, **v} for k, v in GLOBAL_COUNTRIES.items()
    ]


@router.get("/roles")
def list_roles(
    industry_id: Optional[int] = Query(None, description="Optional industry ID filter"),
    q: Optional[str] = Query(None, description="Search keyword for role title"),
    country: Optional[str] = Query("us", description="Target country code (e.g. us, gb, de, ca, in, ch, etc.)"),
    experience_level: Optional[str] = Query("mid", description="junior, mid, senior, lead, director"),
    work_mode: Optional[str] = Query(None, description="Deprecated work mode filter kept for compatibility"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves canonical roles with calibrated market compensation rates,
    adjusted by country purchasing power and experience level.
    """
    return NavigatorService.get_roles_overview(
        db,
        industry_id=industry_id,
        search=q,
        country=country or "us",
        experience_level=experience_level or "mid"
    )


@router.get("/roles/{role_id}/salary")
def get_role_salary(
    role_id: int,
    country: str = Query("us", description="Country code (us, gb, de, ca, in, ch, etc.)"),
    experience_level: str = Query("mid", description="junior, mid, senior, lead, director"),
    timeframe: str = Query("30d", description="today, 7d, 30d, week, year"),
    days: int = Query(30, description="Deprecated days window kept for backwards compatibility"),
    work_mode: Optional[str] = Query(None, description="Deprecated work mode filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remote.com Salary Explorer API:
    Returns full percentile distribution (P10, P25, Median, P75, P90), monthly rates,
    high-demand skill pay premiums, and multi-timeframe trend chart data.
    """
    role = db.query(JobRole).filter(JobRole.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job role with id {role_id} was not found."
        )

    # Resolve timeframe
    tf = timeframe or (f"{days}d" if days else "30d")

    return NavigatorService.get_role_salary_explorer(
        role_id=role.id,
        role_title=role.title,
        country_code=country,
        experience_level=experience_level,
        timeframe=tf
    )


@router.get("/roles/{role_id}/jobs")
def get_role_jobs(
    role_id: int,
    work_mode: Optional[str] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns live job postings for a canonical role with direct source attribution.
    """
    role = db.query(JobRole).filter(JobRole.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job role with id {role_id} was not found."
        )

    jobs = NavigatorService.get_role_jobs(db, role_id, work_mode=work_mode, limit=limit)
    return {
        "role_id": role.id,
        "role_title": role.title,
        "total_returned": len(jobs),
        "postings": jobs
    }


@router.post("/refresh", status_code=202)
def manual_refresh(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Triggers an immediate background recalibration of salary rates across all 45+ roles.
    Protected by authentication and a 10-minute cooldown window.
    """
    cooldown = NavigatorService.check_manual_cooldown()
    if cooldown is not None:
        return {
            "status": "rate_limited",
            "message": f"Market rates were calibrated recently. Cooldown active for {cooldown} more seconds.",
            "retry_after_seconds": cooldown
        }

    NavigatorService.record_manual_refresh()
    background_tasks.add_task(_run_manual_refresh)
    return {
        "status": "refresh_started",
        "message": "Live global compensation rates updated and synchronized across all roles and currencies."
    }
