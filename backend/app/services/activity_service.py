import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import UserActivity

logger = logging.getLogger("careerlens.activity")

def record_user_activity(
    db: Session,
    user_id: str,
    event_type: str,
    description: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    commit: bool = True
) -> Optional[UserActivity]:
    """
    Records a safe, user-facing activity log entry for the user dashboard.
    Never logs sensitive information (passwords, tokens, resume full text).
    """
    try:
        activity = UserActivity(
            user_id=user_id,
            event_type=event_type,
            description=description[:255],
            entity_type=entity_type,
            entity_id=entity_id,
            activity_metadata=metadata or {}
        )
        db.add(activity)
        if commit:
            db.commit()
            db.refresh(activity)
        else:
            db.flush()
        return activity
    except Exception as e:
        logger.warning(f"Failed to record user activity ({event_type}): {e}")
        return None

