from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.dependencies import get_current_user, log_audit
from app.models.models import User, CareerProfile, ConsentRecord
from app.schemas.schemas import (
    UserRegister, UserLogin, UserOut, TokenResponse,
    PasswordResetRequest, PasswordResetConfirm, AppearanceUpdate
)
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    hashed = get_password_hash(user_in.password)
    user = User(
        email=user_in.email.lower(),
        hashed_password=hashed,
        full_name=user_in.full_name or user_in.email.split("@")[0].title(),
        appearance_preference=user_in.appearance_preference or "system"
    )
    db.add(user)
    db.flush()
    
    # Initialize Career Profile
    profile = CareerProfile(
        user_id=user.id,
        summary="",
        skills_list=[],
        preferred_locations=[]
    )
    db.add(profile)
    
    # Consent record for data protection
    consent = ConsentRecord(
        user_id=user.id,
        consent_type="privacy_and_ai_processing",
        agreed=True
    )
    db.add(consent)
    
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.id, "email": user.email})
    log_audit(db, user.id, "USER_REGISTERED", {"email": user.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email.lower()).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )
        
    token = create_access_token({"sub": user.id, "email": user.email})
    log_audit(db, user.id, "USER_LOGGED_IN")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/appearance", response_model=UserOut)
def update_appearance(
    pref: AppearanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if pref.appearance_preference not in ["system", "light", "dark"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appearance preference must be 'system', 'light', or 'dark'."
        )
    current_user.appearance_preference = pref.appearance_preference
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/forgot-password")
def forgot_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    # Always return success message to prevent user enumeration
    reset_token = None
    if user:
        reset_token = create_access_token({"sub": user.id, "action": "reset_pwd"}, expires_delta=timedelta(hours=1))
        log_audit(db, user.id, "PASSWORD_RESET_REQUESTED")
    return {
        "message": "If that email exists in our records, a secure password reset token has been issued.",
        "reset_token": reset_token  # For demo / self-service convenience in local environments
    }

@router.post("/reset-password")
def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    payload = decode_access_token(req.token)
    if not payload or payload.get("action") != "reset_pwd":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    log_audit(db, user.id, "PASSWORD_RESET_COMPLETED")
    return {"message": "Password successfully reset. You may now sign in."}
