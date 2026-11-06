from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, UserActivity
from app.schemas.schemas import UserActivityPageOut, UserActivityOut

router = APIRouter(prefix="/activity", tags=["User Activity"])

@router.get("", response_model=UserActivityPageOut)
def get_user_activity(
    limit: int = Query(10, ge=1, le=100),
    page: int = Query(1, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    query = db.query(UserActivity).filter(
        UserActivity.user_id == current_user.id
    )
    total = query.count()
    items = query.order_by(UserActivity.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }
