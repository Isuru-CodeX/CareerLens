import os
import time
import shutil
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit
from app.models.models import (
    User, CareerProfile, Resume, AnalysisRun, JobMatch, Application
)
from app.schemas.schemas import (
    UserOut, CareerProfileOut, CareerProfileUpdate, DataExportOut, AvatarUploadResponse
)
from app.services.activity_service import record_user_activity

router = APIRouter(prefix="/users", tags=["User Profile & Data"])

ALLOWED_AVATAR_MIMES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate MIME type
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_AVATAR_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPEG, PNG, and WebP images are allowed."
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file size exceeds the 5 MB limit."
        )
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Ensure avatar directory exists
    avatars_dir = os.path.join(settings.RESOLVED_UPLOAD_DIR, "avatars")
    os.makedirs(avatars_dir, exist_ok=True)

    # Clean up previous avatar if present
    if current_user.avatar_path and os.path.exists(current_user.avatar_path):
        try:
            os.remove(current_user.avatar_path)
        except Exception:
            pass

    ext = ALLOWED_AVATAR_MIMES[content_type]
    timestamp = int(time.time())
    safe_filename = f"avatar_{current_user.id}_{timestamp}{ext}"
    dest_path = os.path.join(avatars_dir, safe_filename)

    with open(dest_path, "wb") as f:
        f.write(contents)

    # Store safe relative endpoint URL (accessible directly by <img> tags)
    avatar_url = f"/api/users/avatar/{safe_filename}"
    current_user.avatar_path = dest_path
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    record_user_activity(
        db, current_user.id, "avatar_updated",
        "Updated profile photo",
        entity_type="user", entity_id=current_user.id
    )

    return {
        "avatar_url": avatar_url,
        "message": "Profile image uploaded and updated successfully."
    }

@router.get("/avatar/{filename}")
def serve_avatar_image(filename: str):
    """
    Publicly serve user avatars by safe filename so <img> tags render cleanly
    without requiring Authorization headers.
    """
    safe_name = os.path.basename(filename)
    avatars_dir = os.path.join(settings.RESOLVED_UPLOAD_DIR, "avatars")
    filepath = os.path.join(avatars_dir, safe_name)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Avatar image not found.")

    ext = os.path.splitext(filepath)[1].lower()
    media_type = "image/jpeg"
    if ext == ".png":
        media_type = "image/png"
    elif ext == ".webp":
        media_type = "image/webp"

    return FileResponse(filepath, media_type=media_type)

@router.get("/me/avatar/image")
def get_user_avatar(
    token: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_user = current_user
    if token:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            u = db.query(User).filter(User.id == payload.get("sub")).first()
            if u:
                target_user = u

    if not target_user or not target_user.avatar_path or not os.path.exists(target_user.avatar_path):
        raise HTTPException(status_code=404, detail="No profile image uploaded.")

    ext = os.path.splitext(target_user.avatar_path)[1].lower()
    media_type = "image/jpeg"
    if ext == ".png":
        media_type = "image/png"
    elif ext == ".webp":
        media_type = "image/webp"

    return FileResponse(target_user.avatar_path, media_type=media_type)

@router.delete("/me/avatar")
def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.avatar_path and os.path.exists(current_user.avatar_path):
        try:
            os.remove(current_user.avatar_path)
        except Exception:
            pass

    current_user.avatar_path = None
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)

    record_user_activity(
        db, current_user.id, "avatar_updated",
        "Removed profile photo",
        entity_type="user", entity_id=current_user.id
    )

    return {"message": "Profile image removed successfully."}

@router.get("/profile", response_model=CareerProfileOut)
def get_career_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile", response_model=CareerProfileOut)
def update_career_profile(
    data: CareerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CareerProfile(user_id=current_user.id)
        db.add(profile)
    
    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(profile, field, val)
        
    db.commit()
    db.refresh(profile)
    log_audit(db, current_user.id, "CAREER_PROFILE_UPDATED")

    record_user_activity(
        db, current_user.id, "profile_updated",
        "Updated career profile and contact information",
        entity_type="profile", entity_id=profile.id
    )

    return profile

@router.get("/export", response_model=DataExportOut)
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(CareerProfile).filter(CareerProfile.user_id == current_user.id).first()
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
    analyses = db.query(AnalysisRun).filter(AnalysisRun.user_id == current_user.id).all()
    matches = db.query(JobMatch).filter(JobMatch.user_id == current_user.id).all()

    profile_dict = {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url,
        "phone": profile.phone if profile else "",
        "linkedin_url": profile.linkedin_url if profile else "",
        "github_url": profile.github_url if profile else "",
        "portfolio_url": profile.portfolio_url if profile else "",
        "other_links": profile.other_links if profile else [],
        "target_title": profile.target_title if profile else "",
        "skills": profile.skills_list if profile else [],
        "education": profile.education_history if profile else [],
        "experience": profile.work_history if profile else []
    }

    log_audit(db, current_user.id, "DATA_EXPORT_REQUESTED")

    return {
        "exported_at": datetime.now(timezone.utc),
        "user_profile": profile_dict,
        "resumes": [
            {
                "id": r.id,
                "title": r.title,
                "target_role": r.target_role,
                "file_name": r.file_name,
                "file_type": r.file_type,
                "created_at": str(r.created_at)
            } for r in resumes
        ],
        "applications": [
            {
                "id": a.id,
                "company": a.company,
                "role": a.role,
                "stage": a.stage,
                "location": a.location,
                "salary_range": a.salary_range,
                "notes": a.notes
            } for a in apps
        ],
        "analyses": [
            {
                "id": an.id,
                "resume_id": an.resume_id,
                "overall_score": an.overall_score,
                "structure_score": an.structure_score,
                "impact_score": an.impact_score,
                "findings": an.findings
            } for an in analyses
        ],
        "job_matches": [
            {
                "id": m.id,
                "resume_id": m.resume_id,
                "overall_score": m.overall_score,
                "matched_skills": m.matched_skills,
                "missing_skills": m.missing_skills
            } for m in matches
        ]
    }

@router.delete("/account")
def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Clean up uploaded files on disk
    user_resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    for r in user_resumes:
        file_path = r.file_path
        if not file_path or not os.path.exists(file_path):
            candidate = os.path.join(settings.RESOLVED_UPLOAD_DIR, os.path.basename(file_path or ""))
            if os.path.exists(candidate):
                file_path = candidate
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    if current_user.avatar_path and os.path.exists(current_user.avatar_path):
        try:
            os.remove(current_user.avatar_path)
        except Exception:
            pass

    db.delete(current_user)
    db.commit()
    return {"message": "Account and all associated documents permanently deleted."}
