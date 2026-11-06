"""
app/api/cover_letters.py - Grounded Cover Letter Generator with Change Requests and Versioning.
Implements Feature 6 and Feature 4.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, CoverLetter, CoverLetterVersion
from app.schemas.schemas import (
    CoverLetterOut, CoverLetterVersionOut,
    CoverLetterCreateRequest, CoverLetterRegenerateRequest
)
from app.services.context_builder import build_candidate_context
from app.services.cover_letter_service import write_or_regenerate_cover_letter
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/cover-letters", tags=["Cover Letters"])

def format_letter_out(letter: CoverLetter) -> CoverLetterOut:
    versions = sorted(letter.versions, key=lambda v: v.version_no)
    latest_v = versions[-1] if versions else None
    latest_dto = CoverLetterVersionOut(
        id=latest_v.id,
        version_no=latest_v.version_no,
        body=latest_v.body,
        change_request=latest_v.change_request,
        notes=latest_v.notes or [],
        style=latest_v.style or "professional",
        variant=latest_v.variant or "en-GB",
        created_at=latest_v.created_at
    ) if latest_v else CoverLetterVersionOut(
        id="", version_no=1, body="", notes=[], style="professional", variant="en-GB", created_at=letter.created_at
    )

    all_dtos = [
        CoverLetterVersionOut(
            id=v.id,
            version_no=v.version_no,
            body=v.body,
            change_request=v.change_request,
            notes=v.notes or [],
            style=v.style or "professional",
            variant=v.variant or "en-GB",
            created_at=v.created_at
        )
        for v in versions
    ]

    return CoverLetterOut(
        id=letter.id,
        preset_id=letter.preset_id,
        job_title=letter.job_title,
        company=letter.company,
        job_description=letter.job_description,
        current_version=latest_dto,
        versions=all_dtos,
        created_at=letter.created_at
    )

@router.post("", response_model=CoverLetterOut, status_code=status.HTTP_201_CREATED)
async def generate_cover_letter(
    data: CoverLetterCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ctx = build_candidate_context(db, current_user.id, data.preset_id)
    if not ctx.skills and not ctx.experiences:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Your profile has no skills or experience records yet. Please import a CV or add skills first."
        )

    res = await write_or_regenerate_cover_letter(
        ctx=ctx,
        job_title=data.job_title or "Professional",
        company=data.company,
        job_description=data.job_description,
        style=data.style,
        variant=data.variant
    )

    letter = CoverLetter(
        user_id=current_user.id,
        preset_id=data.preset_id if data.preset_id != "all" else None,
        job_title=data.job_title,
        company=data.company,
        job_description=data.job_description
    )
    db.add(letter)
    db.flush()

    v1 = CoverLetterVersion(
        letter_id=letter.id,
        version_no=1,
        body=res["letter"],
        notes=res["notes"],
        style=data.style,
        variant=data.variant
    )
    db.add(v1)
    db.commit()
    db.refresh(letter)

    record_user_activity(
        db, current_user.id, "cover_letter_generated",
        f"Generated cover letter for {data.job_title} at {data.company or 'Target Company'} (Version 1)",
        entity_type="cover_letter", entity_id=letter.id
    )

    return format_letter_out(letter)

@router.post("/{letter_id}/regenerate", response_model=CoverLetterOut)
async def regenerate_cover_letter(
    letter_id: str,
    data: CoverLetterRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    letter = db.query(CoverLetter).filter(
        CoverLetter.id == letter_id,
        CoverLetter.user_id == current_user.id
    ).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")

    ctx = build_candidate_context(db, current_user.id, letter.preset_id)

    res = await write_or_regenerate_cover_letter(
        ctx=ctx,
        job_title=letter.job_title or "Professional",
        company=letter.company,
        job_description=letter.job_description,
        style=data.style,
        variant=data.variant,
        current_text=data.current_text,
        change_request=data.change_request
    )

    existing_versions = db.query(CoverLetterVersion).filter(
        CoverLetterVersion.letter_id == letter.id
    ).all()
    next_ver = (max(v.version_no for v in existing_versions) if existing_versions else 0) + 1

    new_v = CoverLetterVersion(
        letter_id=letter.id,
        version_no=next_ver,
        body=res["letter"],
        change_request=data.change_request.strip(),
        notes=res["notes"],
        style=data.style,
        variant=data.variant
    )
    db.add(new_v)
    db.commit()
    db.refresh(letter)

    record_user_activity(
        db, current_user.id, "cover_letter_regenerated",
        f"Regenerated cover letter (Version {next_ver}) with request: '{data.change_request[:40]}...'",
        entity_type="cover_letter", entity_id=letter.id
    )

    return format_letter_out(letter)

@router.get("/{letter_id}/versions", response_model=List[CoverLetterVersionOut])
def get_letter_versions(
    letter_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    letter = db.query(CoverLetter).filter(
        CoverLetter.id == letter_id,
        CoverLetter.user_id == current_user.id
    ).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")

    versions = db.query(CoverLetterVersion).filter(
        CoverLetterVersion.letter_id == letter.id
    ).order_by(CoverLetterVersion.version_no.asc()).all()

    return [
        CoverLetterVersionOut(
            id=v.id,
            version_no=v.version_no,
            body=v.body,
            change_request=v.change_request,
            notes=v.notes or [],
            style=v.style or "professional",
            variant=v.variant or "en-GB",
            created_at=v.created_at
        )
        for v in versions
    ]
