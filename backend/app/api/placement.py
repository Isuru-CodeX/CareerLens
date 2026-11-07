"""
backend/app/api/placement.py
-----------------------------
API routes for Module 12: University Placement Cell & Multi-Tenant Career Services Portal.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User
from app.services.placement_service import PlacementService

router = APIRouter(prefix="/placement", tags=["Placement Cell & Multi-Tenant Portal"])


@router.get("/telemetry")
def get_cohort_telemetry(
    batch: Optional[str] = Query("Class of 2026", description="Cohort batch year"),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregate cohort readiness analytics, skill deficit alerts, and candidate roster.
    """
    return PlacementService.get_cohort_telemetry(batch=batch or "Class of 2026")


@router.get("/export-csv")
def export_cohort_roster(
    batch: Optional[str] = Query("Class of 2026", description="Cohort batch year"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exports pre-vetted cohort candidates as a CSV file for corporate recruiters.
    """
    csv_data = PlacementService.export_csv(batch=batch or "Class of 2026")
    log_audit(db, current_user.id, "PLACEMENT_ROSTER_EXPORTED", {"batch": batch})
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=careerlens_cohort_{batch.replace(' ', '_').lower()}.csv"}
    )

