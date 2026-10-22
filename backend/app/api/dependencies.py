"""
FastAPI dependency injection helpers:
- Database session
- Current authenticated user
- Role / permission guards
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.models import User, UserRole


def _get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate JWT; return the User record."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or invalid Authorization header.")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type.")
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise UnauthorizedError("Token is invalid or expired.")

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive.")
    return user


def get_current_user(
    user: User = Depends(_get_current_user),
) -> User:
    return user


def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns the authenticated User if valid Bearer token provided, else None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = db.get(User, user_id)
        if user and user.is_active:
            return user
    except Exception:
        return None
    return None


def get_current_verified_user(
    user: User = Depends(_get_current_user),
) -> User:
    if not user.is_email_verified:
        raise ForbiddenError("Email address not verified.")
    return user


def _require_role(*roles: UserRole):
    def dependency(
        authorization: Optional[str] = Header(None),
        db: Session = Depends(get_db),
    ) -> User:
        if not authorization or not authorization.startswith("Bearer "):
            raise UnauthorizedError("Authentication required. Please sign in with an administrator account.")
        
        user = _get_current_user(authorization, db)
        if user.role not in roles:
            raise ForbiddenError(f"Access denied. User role '{user.role.value if hasattr(user.role, 'value') else user.role}' does not have administrative permissions.")
        return user
    return dependency


require_admin = _require_role(UserRole.admin)
require_catalogue_manager = _require_role(UserRole.admin, UserRole.catalogue_manager)
require_order_manager = _require_role(UserRole.admin, UserRole.order_manager)
require_content_manager = _require_role(UserRole.admin, UserRole.content_manager)
require_inventory_manager = _require_role(UserRole.admin, UserRole.inventory_manager)
require_any_staff = _require_role(
    UserRole.admin,
    UserRole.catalogue_manager,
    UserRole.order_manager,
    UserRole.content_manager,
    UserRole.inventory_manager,
)
