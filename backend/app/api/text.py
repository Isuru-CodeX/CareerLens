"""
app/api/text.py - Editorial Text Polish & Style Refinement Router.
Implements Feature 8 (Better Grammar and an Optional Human Style).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User
from app.schemas.schemas import TextPolishRequest, TextPolishResponse, TextPolishChange
from app.services.polish_service import polish_text

router = APIRouter(prefix="/text", tags=["Text Polish & Grammar"])

@router.post("/polish", response_model=TextPolishResponse)
async def polish_text_endpoint(
    data: TextPolishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Polishes text for grammar, spelling, punctuation, or rewrites in a natural human style.
    Protects numbers and metrics with an anti-drift guardrail.
    """
    res = await polish_text(
        input_text=data.text,
        style=data.style,
        variant=data.variant,
        mode=data.mode
    )

    return {
        "text": res["text"],
        "changes": [
            TextPolishChange(
                before=c.get("before", ""),
                after=c.get("after", ""),
                reason=c.get("reason", "")
            )
            for c in res.get("changes", [])
        ],
        "skipped": res.get("skipped")
    }
