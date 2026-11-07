"""
backend/app/api/navigator.py - Career Navigator Live Job Feeds & Auto-Refreshing Salaries API.
Exposes endpoints specified in CareerLens Navigator Upgrade Guide:
- GET /api/navigator/industries: lists industries with role and vacancy counts
- GET /api/navigator/roles: lists roles with live opening counts and work-mode breakdown
- GET /api/navigator/roles/{role_id}/salary: returns latest snapshot, 30-day historical trend, and staleness flag
- GET /api/navigator/roles/{role_id}/jobs: returns live postings with direct source attribution links
- POST /api/navigator/refresh: triggers background refresh with rate-limiting cooldown
"""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db, SessionLocal
from app.core.dependencies import get_current_user
from app.models.models import User, JobRole
from app.services.navigator_service import NavigatorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/navigator", tags=["Career Navigator Live Market & Salaries"])


async def _run_manual_refresh():
    db = SessionLocal()
    try:
        await NavigatorService.refresh_all(db, max_roles=15)
    except Exception as e:
        logger.error(f"Manual refresh background error: {e}")
    finally:
        db.close()


@router.get("/industries")
def list_industries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all career industries with active role counts and total live openings.
    """
    return NavigatorService.get_industries(db)


@router.get("/roles")
def list_roles(
    industry_id: Optional[int] = Query(None, description="Optional industry ID filter"),
    work_mode: Optional[str] = Query(None, description="Filter: remote, hybrid, onsite, all"),
    q: Optional[str] = Query(None, description="Search keyword for role title"),
    country: Optional[str] = Query("us", description="Target country code (us, gb, ca, de)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves canonical roles with live job opening counts, work-mode distribution,
    and latest normalized salary percentiles.
    """
    return NavigatorService.get_roles_overview(
        db,
        industry_id=industry_id,
        work_mode=work_mode,
        search=q,
        country=country or "us"
    )


@router.get("/roles/{role_id}/salary")
def get_role_salary(
    role_id: int,
    country: str = Query("us", description="Country code (us, gb, ca, de)"),
    work_mode: Optional[str] = Query(None, description="remote, hybrid, onsite, or all"),
    days: int = Query(30, ge=1, le=365, description="Historical trend window in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the latest salary snapshot, 30-day historical trend for chart visualization,
    and staleness indicator.
    """
    role = db.query(JobRole).filter(JobRole.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job role with id {role_id} was not found."
        )

    latest = NavigatorService.latest_snapshot(db, role_id, country=country, work_mode=work_mode)
    trend_snaps = NavigatorService.snapshots_since(db, role_id, country=country, work_mode=work_mode, days=days)

    now = datetime.now(timezone.utc)
    is_stale = True
    latest_dict = None
    if latest:
        fetched_at = latest.fetched_at
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        age_hours = (now - fetched_at).total_seconds() / 3600.0
        is_stale = age_hours > 12.0
        latest_dict = {
            "id": latest.id,
            "role_id": latest.role_id,
            "country": latest.country,
            "work_mode": latest.work_mode,
            "currency": latest.currency,
            "p25": latest.p25,
            "median": latest.median,
            "p75": latest.p75,
            "sample_size": latest.sample_size,
            "estimated_share": latest.estimated_share,
            "source": latest.source,
            "fetched_at": latest.fetched_at.isoformat()
        }

    trend_list = []
    for s in trend_snaps:
        trend_list.append({
            "id": s.id,
            "p25": s.p25,
            "median": s.median,
            "p75": s.p75,
            "sample_size": s.sample_size,
            "estimated_share": s.estimated_share,
            "currency": s.currency,
            "fetched_at": s.fetched_at.isoformat(),
            "date": s.fetched_at.strftime("%b %d")
        })

    return {
        "role_id": role.id,
        "role_title": role.title,
        "latest": latest_dict,
        "trend": trend_list,
        "is_stale": is_stale,
        "sample_size": latest.sample_size if latest else 0,
        "disclaimer": "Figures are market indicators aggregated from live postings and benchmark datasets, not salary offers or guarantees."
    }


@router.get("/roles/{role_id}/jobs")
def get_role_jobs(
    role_id: int,
    work_mode: Optional[str] = Query(None, description="remote, hybrid, onsite, all"),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns real live job postings for a canonical role with direct attribution URLs
    (Remotive, Arbeitnow, Adzuna).
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
    Triggers an immediate background refresh of stalest roles across live job feeds.
    Protected by authentication and a 10-minute cooldown window.
    """
    cooldown = NavigatorService.check_manual_cooldown()
    if cooldown is not None:
        return {
            "status": "rate_limited",
            "message": f"Market refresh was executed recently. Cooldown active for {cooldown} more seconds.",
            "retry_after_seconds": cooldown
        }

    NavigatorService.record_manual_refresh()
    background_tasks.add_task(_run_manual_refresh)
    return {
        "status": "refresh_started",
        "message": "Live market crawl scheduled. Fresh job postings and salary distributions will be updated in background."
    }

