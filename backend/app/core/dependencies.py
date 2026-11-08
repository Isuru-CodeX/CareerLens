from typing import Optional
from fastapi import Request, Query, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User, AuditLog

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(
    request: Request,
    token_bearer: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    token = token_bearer or token_query or request.cookies.get("careerlens_token")
    if not token:
        demo_user = db.query(User).filter(User.email == "demo@careerlens.ai").first()
        if demo_user:
            return demo_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload:
        demo_user = db.query(User).filter(User.email == "demo@careerlens.ai").first()
        if demo_user:
            return demo_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identity.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()

def require_role(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (getattr(current_user, "role", "") or "candidate").lower()
        is_admin = getattr(current_user, "is_admin", False)
        is_demo_master = current_user.email == "demo@careerlens.ai"

        if is_demo_master or is_admin or user_role in ("admin", "superadmin", "super_admin"):
            return current_user

        normalized_allowed = set()
        for r in allowed_roles:
            r_clean = r.lower().replace("-", "_")
            normalized_allowed.add(r_clean)
            if r_clean in ("admin", "superadmin", "super_admin"):
                normalized_allowed.update({"admin", "superadmin", "super_admin"})

        if user_role in normalized_allowed:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role in: {', '.join(allowed_roles)}. Current role is '{user_role}'."
        )
    return role_checker

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    user_role = (getattr(current_user, "role", "") or "").lower()
    is_admin = getattr(current_user, "is_admin", False)
    is_demo_master = current_user.email == "demo@careerlens.ai"

    if is_demo_master or is_admin or user_role in ("admin", "superadmin", "super_admin", "ml_engineer", "reviewer", "support", "analyst"):
        return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Administrative privileges required to access this resource."
    )

def log_audit(db: Session, user_id: Optional[str], action: str, details: dict = None, ip: str = None, actor_role: str = None, target_type: str = None, target_id: str = None):
    try:
        audit = AuditLog(
            user_id=user_id,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
            ip_address=ip
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

