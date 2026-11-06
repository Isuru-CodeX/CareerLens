"""
app/api/presets.py - User Details Preset Router.
Implements Feature 4 (Multi-CV Memory and Presets).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Preset, PresetResume, Resume
from app.schemas.schemas import PresetOut, PresetCreate, PresetUpdate
from app.services.context_builder import build_candidate_context
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/presets", tags=["Candidate Presets"])

@router.get("", response_model=List[PresetOut])
def list_presets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    presets = db.query(Preset).filter(
        Preset.user_id == current_user.id
    ).order_by(Preset.created_at.asc()).all()

    out = []
    for p in presets:
        links = db.query(PresetResume).filter(PresetResume.preset_id == p.id).all()
        r_ids = [l.resume_id for l in links]
        out.append(PresetOut(
            id=p.id,
            name=p.name,
            target_role=p.target_role,
            include_manual=p.include_manual,
            resume_count=len(r_ids),
            resume_ids=r_ids,
            created_at=p.created_at
        ))
    return out

@router.post("", response_model=PresetOut, status_code=status.HTTP_201_CREATED)
def create_preset(
    data: PresetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify that all resume IDs belong to current_user
    clean_ids = list(dict.fromkeys(data.resume_ids))
    if clean_ids:
        owned_count = db.query(Resume).filter(
            Resume.user_id == current_user.id,
            Resume.id.in_(clean_ids)
        ).count()
        if owned_count != len(clean_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more selected resumes do not belong to your account."
            )

    preset = Preset(
        user_id=current_user.id,
        name=data.name.strip(),
        target_role=data.target_role.strip() if data.target_role else None,
        include_manual=data.include_manual
    )
    db.add(preset)
    db.flush()

    for rid in clean_ids:
        db.add(PresetResume(preset_id=preset.id, resume_id=rid))

    db.commit()
    db.refresh(preset)

    record_user_activity(
        db, current_user.id, "preset_created",
        f"Created preset '{preset.name}' with {len(clean_ids)} CVs",
        entity_type="preset", entity_id=preset.id
    )

    return PresetOut(
        id=preset.id,
        name=preset.name,
        target_role=preset.target_role,
        include_manual=preset.include_manual,
        resume_count=len(clean_ids),
        resume_ids=clean_ids,
        created_at=preset.created_at
    )

@router.put("/{preset_id}", response_model=PresetOut)
def update_preset(
    preset_id: str,
    data: PresetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    preset = db.query(Preset).filter(
        Preset.id == preset_id,
        Preset.user_id == current_user.id
    ).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found.")

    if data.name is not None:
        preset.name = data.name.strip()
    if data.target_role is not None:
        preset.target_role = data.target_role.strip() if data.target_role else None
    if data.include_manual is not None:
        preset.include_manual = data.include_manual

    if data.resume_ids is not None:
        clean_ids = list(dict.fromkeys(data.resume_ids))
        if clean_ids:
            owned = db.query(Resume).filter(
                Resume.user_id == current_user.id,
                Resume.id.in_(clean_ids)
            ).count()
            if owned != len(clean_ids):
                raise HTTPException(status_code=400, detail="Unknown resume in list.")

        db.query(PresetResume).filter(PresetResume.preset_id == preset.id).delete()
        for rid in clean_ids:
            db.add(PresetResume(preset_id=preset.id, resume_id=rid))

    db.commit()
    db.refresh(preset)

    links = db.query(PresetResume).filter(PresetResume.preset_id == preset.id).all()
    r_ids = [l.resume_id for l in links]

    return PresetOut(
        id=preset.id,
        name=preset.name,
        target_role=preset.target_role,
        include_manual=preset.include_manual,
        resume_count=len(r_ids),
        resume_ids=r_ids,
        created_at=preset.created_at
    )

@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(
    preset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    preset = db.query(Preset).filter(
        Preset.id == preset_id,
        Preset.user_id == current_user.id
    ).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found.")

    db.delete(preset)
    db.commit()
    return None

@router.get("/{preset_id}/context")
def get_preset_context(
    preset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ctx = build_candidate_context(db, current_user.id, preset_id)
    return ctx.to_dict()
