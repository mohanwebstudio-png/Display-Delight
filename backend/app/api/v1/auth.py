"""
Authentication router — register, login, logout, refresh, me,
password reset, email verification.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError, ValidationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_secure_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.models import EmailVerification, PasswordReset, RefreshToken, User, UserRole, WebsiteSetting
from app.schemas.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
    VerifyEmailRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _expires_iso(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).isoformat()


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise ConflictError("An account with this email already exists.")
    user = User(
        email=body.email.lower(),
        full_name=body.full_name,
        phone=body.phone,
        hashed_password=hash_password(body.password),
        role=UserRole.customer,
        is_active=True,
        is_email_verified=False,
    )
    db.add(user)
    db.flush()

    # Create email-verification record
    raw = generate_secure_token()
    ev = EmailVerification(
        user_id=user.id,
        token_hash=_hash_token(raw),
        expires_at=_expires_iso(timedelta(hours=24)),
    )
    db.add(ev)

    # Issue login tokens so customer is immediately authenticated upon registration
    access = create_access_token(user.id, {"role": user.role, "email": user.email})
    raw_refresh = generate_secure_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(raw_refresh),
        expires_at=_expires_iso(timedelta(days=30)),
    )
    db.add(rt)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "is_email_verified": user.is_email_verified,
        "access_token": access,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        },
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password.")
    if not user.is_active:
        raise UnauthorizedError("Your account has been deactivated.")

    access = create_access_token(user.id, {"role": user.role, "email": user.email})
    raw_refresh = generate_secure_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(raw_refresh),
        expires_at=_expires_iso(timedelta(days=30)),
    )
    db.add(rt)
    db.commit()

    return {
        "access_token": access,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_email_verified": user.is_email_verified,
        },
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    hashed = _hash_token(body.refresh_token)
    rt = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hashed,
        RefreshToken.revoked == False,
    ).first()
    if not rt or rt.expires_at < datetime.now(timezone.utc).isoformat():
        raise UnauthorizedError("Refresh token is invalid or expired.")
    rt.revoked = True

    user = db.get(User, rt.user_id)
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive.")

    access = create_access_token(user.id, {"role": user.role, "email": user.email})
    raw_refresh = generate_secure_token()
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(raw_refresh),
        expires_at=_expires_iso(timedelta(days=30)),
    )
    db.add(new_rt)
    db.commit()
    return TokenResponse(access_token=access, refresh_token=raw_refresh)


@router.post("/logout", status_code=204)
def logout(
    body: RefreshRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hashed = _hash_token(body.refresh_token)
    rt = db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.token_hash == hashed,
    ).first()
    if rt:
        rt.revoked = True
        db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/password/forgot", status_code=202)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Always return 202 to avoid email enumeration
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user:
        raw = generate_secure_token()
        pr = PasswordReset(
            user_id=user.id,
            token_hash=_hash_token(raw),
            expires_at=_expires_iso(timedelta(hours=1)),
        )
        db.add(pr)
        db.commit()
        # TODO: send password-reset email with raw token
    return {"detail": "If an account exists, reset instructions have been sent."}


@router.post("/password/reset", status_code=200)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    hashed = _hash_token(body.token)
    pr = db.query(PasswordReset).filter(
        PasswordReset.token_hash == hashed,
        PasswordReset.used == False,
    ).first()
    if not pr or pr.expires_at < datetime.now(timezone.utc).isoformat():
        raise ValidationError("Reset token is invalid or expired.")
    pr.used = True
    user = db.get(User, pr.user_id)
    if user:
        user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password updated successfully."}


@router.post("/email/verify", status_code=200)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    hashed = _hash_token(body.token)
    ev = db.query(EmailVerification).filter(
        EmailVerification.token_hash == hashed,
        EmailVerification.used == False,
    ).first()
    if not ev or ev.expires_at < datetime.now(timezone.utc).isoformat():
        raise ValidationError("Verification token is invalid or expired.")
    ev.used = True
    user = db.get(User, ev.user_id)
    if user:
        user.is_email_verified = True
    db.commit()
    return {"detail": "Email verified successfully."}


class AcceptInviteRequest(BaseModel):
    token: str
    password: str
    name: Optional[str] = None


@router.get("/invite/{token}", summary="Public: Verify admin invitation token")
def get_invitation_details(token: str, db: Session = Depends(get_db)):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_pending_invitations").first()
    if not setting or not setting.value:
        raise NotFoundError("Invitation token not found or already accepted.")
    try:
        invitations = json.loads(setting.value)
    except Exception:
        invitations = {}

    inv = invitations.get(token)
    if not inv:
        raise NotFoundError("Invitation not found or has expired.")

    # Check expiration if present
    expires_at = inv.get("expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                raise ValidationError("This invitation link has expired. Please ask the admin to resend it.")
        except Exception:
            pass

    return {
        "valid": True,
        "email": inv.get("email"),
        "name": inv.get("name") or "",
        "role": inv.get("role") or "Support",
        "expires_at": inv.get("expires_at"),
    }


@router.post("/invite/accept", summary="Public: Accept admin invitation and set password")
def accept_admin_invitation(
    body: AcceptInviteRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_pending_invitations").first()
    if not setting or not setting.value:
        raise ValidationError("Invitation link is invalid or has already been used.")
    try:
        invitations = json.loads(setting.value)
    except Exception:
        invitations = {}

    inv = invitations.get(body.token)
    if not inv:
        raise ValidationError("Invitation link is invalid or has already been used.")

    expires_at = inv.get("expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                raise ValidationError("This invitation link has expired. Please request a new invitation.")
        except Exception:
            pass

    user_id = inv.get("user_id")
    email = inv.get("email")

    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email.lower()).first()

    if not user:
        raise NotFoundError("Associated user account not found.")

    if len(body.password) < 6:
        raise ValidationError("Password must be at least 6 characters.")

    # Set password and activate account
    user.hashed_password = hash_password(body.password)
    if body.name and body.name.strip():
        user.full_name = body.name.strip()
    user.is_active = True
    user.is_email_verified = True

    # Remove token from pending invitations
    del invitations[body.token]
    setting.value = json.dumps(invitations)

    # Log audit
    try:
        from app.api.v1.admin.common import log_audit
        log_audit(
            db=db,
            actor=user,
            action="user.invite_accept",
            resource_type="admin_user",
            resource_id=user.id,
            detail={"email": user.email, "role": inv.get("role")},
            ip_address=request.client.host if request.client else None,
        )
    except Exception as e:
        print(f"[AUDIT LOG WARNING] Failed to record invite acceptance audit: {e}")

    # Generate login tokens
    access = create_access_token(user.id, {"role": user.role, "email": user.email})
    raw_refresh = generate_secure_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(raw_refresh),
        expires_at=_expires_iso(timedelta(days=30)),
    )
    db.add(rt)
    db.commit()

    return {
        "access_token": access,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
        },
        "message": "Account activated successfully! Redirecting to admin dashboard...",
    }
