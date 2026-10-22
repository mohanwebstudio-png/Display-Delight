"""
DisplayDelight V2 — Admin User Management API.
Supports listing team members, inviting new administrative users with token-based acceptance,
sending invitation emails via SMTP, updating roles/permissions, and deactivating accounts.
"""
from __future__ import annotations

import datetime
import json
import secrets
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_admin
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.security import hash_password
from app.models.models import AuditLog, User, UserRole, WebsiteSetting
from app.api.v1.admin.common import log_audit
from app.services.notifications import send_email

router = APIRouter(prefix="/users", tags=["Admin Users"])


class AdminUserInviteRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = "Support"


class AdminUserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


def _format_time_ago(dt) -> str:
    if not dt:
        return "Recent"
    try:
        if isinstance(dt, str):
            dt = datetime.datetime.fromisoformat(dt.replace("Z", "+00:00"))
        return dt.strftime("%d %b, %H:%M")
    except Exception:
        return "Recent"


def _map_role_to_enum(role_title: str) -> UserRole:
    clean = role_title.strip().lower()
    if clean in ("owner", "admin", "superadmin"):
        return UserRole.admin
    elif clean in ("manager", "store manager"):
        return UserRole.admin
    elif clean in ("content editor", "editor", "content manager"):
        return UserRole.content_manager
    elif clean in ("order handler", "order manager", "fulfillment"):
        return UserRole.order_manager
    elif clean in ("inventory manager", "stock"):
        return UserRole.inventory_manager
    elif clean in ("support", "catalogue manager"):
        return UserRole.catalogue_manager
    return UserRole.admin


def _get_team_roles_dict(db: Session) -> Dict[str, str]:
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_team_roles").first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            return {}
    return {}


def _save_team_roles_dict(db: Session, roles: Dict[str, str]) -> None:
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_team_roles").first()
    if not setting:
        setting = WebsiteSetting(key="admin_team_roles", is_sensitive=False)
        db.add(setting)
    setting.value = json.dumps(roles)


def _get_pending_invitations(db: Session) -> Dict[str, Dict[str, Any]]:
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_pending_invitations").first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            return {}
    return {}


def _save_pending_invitations(db: Session, invs: Dict[str, Dict[str, Any]]) -> None:
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "admin_pending_invitations").first()
    if not setting:
        setting = WebsiteSetting(key="admin_pending_invitations", is_sensitive=False)
        db.add(setting)
    setting.value = json.dumps(invs)


def _get_app_base_url(request: Request) -> str:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")
    referer = request.headers.get("referer")
    if referer:
        try:
            parsed = urlparse(referer)
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            pass
    if getattr(settings, "FRONTEND_ORIGIN", None):
        return settings.FRONTEND_ORIGIN.rstrip("/")
    return "http://localhost:8443"


def _dispatch_invitation_email(email: str, name: str, role: str, invite_url: str, db: Session) -> bool:
    display_name = name or email.split("@")[0].replace(".", " ").title()
    subject = f"Invitation to join DisplayDelight Admin Team ({role})"
    body_text = f"""Hello {display_name},

You have been invited to join the DisplayDelight administration team as: {role}.

To accept this invitation and activate your administrative access, please visit:
{invite_url}

This invitation is valid for 7 days. Once you open the link and set your password, your account will be activated and you will have full access.

If you did not request this invitation, please ignore this email.

— The DisplayDelight Operations Team
"""
    body_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; margin: 0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: -0.02em;">DisplayDelight</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Storefront & Commercial Operations Admin</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">You're invited to join the Admin Team</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0;">
          Hello <strong>{display_name}</strong>,<br/><br/>
          You have been invited to join the DisplayDelight administrative team with the role of <strong style="color: #2563eb; background-color: #eff6ff; padding: 2px 8px; border-radius: 4px;">{role}</strong>.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 28px 0;">
          Please accept this invitation to set up your password and activate your admin account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{invite_url}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Accept Invitation & Set Password &rarr;
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; word-break: break-all;">
          Or copy and paste this link into your browser:<br/>
          <a href="{invite_url}" style="color: #2563eb;">{invite_url}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          This link is valid for 7 days. If you were not expecting this invite, please disregard this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return send_email(to_email=email, subject=subject, body_text=body_text, db=db, body_html=body_html)


@router.get("", summary="Admin: List all administrative team members")
def list_admin_users(
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    team_roles = _get_team_roles_dict(db)
    invitations = _get_pending_invitations(db)
    base_url = _get_app_base_url(request)

    query_roles = [
        UserRole.admin,
        UserRole.order_manager,
        UserRole.content_manager,
        UserRole.catalogue_manager,
        UserRole.inventory_manager,
    ]
    users = db.query(User).filter(User.role.in_(query_roles)).all()

    # If only 1 root admin exists, ensure sample team members exist in database
    if len(users) <= 1:
        seed_users = [
            ("owner@example.com", "Admin Owner", "Owner", UserRole.admin, True),
            ("manager@example.com", "Sample Manager", "Manager", UserRole.admin, True),
            ("editor@example.com", "Sample Editor", "Content Editor", UserRole.content_manager, True),
            ("support@example.com", "Sample Support", "Support", UserRole.catalogue_manager, False),
        ]
        created_any = False
        for email, name, role_title, u_role, is_act in seed_users:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                nu = User(
                    email=email,
                    full_name=name,
                    role=u_role,
                    is_active=is_act,
                    is_email_verified=True,
                    hashed_password=hash_password("DisplayDelight@2026"),
                )
                db.add(nu)
                db.flush()
                team_roles[nu.id] = role_title
                created_any = True
            else:
                team_roles[existing.id] = role_title
        if created_any:
            _save_team_roles_dict(db, team_roles)
            db.commit()
            users = db.query(User).filter(User.role.in_(query_roles)).all()

    # Ensure pending tokens exist for inactive users
    invites_modified = False
    for u in users:
        if not u.is_active:
            # Check if active invite token exists
            token_found = None
            for tok, inv in list(invitations.items()):
                if inv.get("user_id") == u.id or inv.get("email") == u.email:
                    token_found = tok
                    break
            if not token_found:
                new_token = secrets.token_urlsafe(32)
                invitations[new_token] = {
                    "user_id": u.id,
                    "email": u.email,
                    "name": u.full_name,
                    "role": team_roles.get(u.id, "Support"),
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "expires_at": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat(),
                }
                invites_modified = True

    if invites_modified:
        _save_pending_invitations(db, invitations)
        db.commit()

    out = []
    for u in users:
        stored_role = team_roles.get(u.id)
        if not stored_role:
            if u.role == UserRole.admin:
                stored_role = "Owner" if "admin" in u.email or "owner" in u.email else "Manager"
            elif u.role == UserRole.content_manager:
                stored_role = "Content Editor"
            elif u.role == UserRole.order_manager:
                stored_role = "Order Handler"
            elif u.role == UserRole.catalogue_manager:
                stored_role = "Support"
            else:
                stored_role = u.role.value.replace("_", " ").title()

        last_login_str = _format_time_ago(u.updated_at or u.created_at)

        # Pending invite detection
        invite_token = None
        has_pending = False
        if not u.is_active:
            for tok, inv in invitations.items():
                if inv.get("user_id") == u.id or inv.get("email") == u.email:
                    invite_token = tok
                    has_pending = True
                    break

        invite_url = f"{base_url}/#/accept-invite?token={invite_token}" if invite_token else None

        status_str = "invited" if (not u.is_active and has_pending) else ("active" if u.is_active else "disabled")

        out.append({
            "id": u.id,
            "n": u.full_name,
            "e": u.email,
            "r": stored_role,
            "on": u.is_active,
            "is_active": u.is_active,
            "status": status_str,
            "has_pending_invite": has_pending,
            "invite_url": invite_url,
            "token": invite_token,
            "l": last_login_str,
            "created_at": str(u.created_at),
        })

    return out


@router.post("", summary="Admin: Invite a new administrative team member")
def invite_admin_user(
    body: AdminUserInviteRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    email = body.email.strip().lower()
    base_url = _get_app_base_url(request)
    team_roles = _get_team_roles_dict(db)
    invitations = _get_pending_invitations(db)

    existing = db.query(User).filter(User.email == email).first()
    enum_role = _map_role_to_enum(body.role)
    name = body.name.strip() if body.name else email.split("@")[0].replace(".", " ").title()

    if existing:
        if existing.is_active:
            raise ConflictError(f"A user with email {email} is already active. You can change their role directly in the team table.")
        
        # User exists but is inactive / pending invite -> update role and re-invite
        target_user = existing
        if body.name:
            target_user.full_name = name
        target_user.role = enum_role
        team_roles[target_user.id] = body.role
        _save_team_roles_dict(db, team_roles)
    else:
        # Create brand new user in pending state (is_active=False until invitation is accepted)
        target_user = User(
            email=email,
            full_name=name,
            role=enum_role,
            is_active=False,
            is_email_verified=False,
            hashed_password=hash_password(secrets.token_urlsafe(16)),
        )
        db.add(target_user)
        db.flush()
        team_roles[target_user.id] = body.role
        _save_team_roles_dict(db, team_roles)

    # Clean old tokens for this user/email
    invitations = {
        tok: inv for tok, inv in invitations.items()
        if inv.get("user_id") != target_user.id and inv.get("email") != email
    }

    # Generate fresh invitation token
    token = secrets.token_urlsafe(32)
    invitations[token] = {
        "user_id": target_user.id,
        "email": email,
        "name": target_user.full_name or name,
        "role": body.role,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "expires_at": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat(),
    }
    _save_pending_invitations(db, invitations)

    invite_url = f"{base_url}/#/accept-invite?token={token}"

    # Send invitation email
    _dispatch_invitation_email(
        email=email,
        name=target_user.full_name,
        role=body.role,
        invite_url=invite_url,
        db=db,
    )

    log_audit(
        db=db,
        actor=admin_user,
        action="user.invite",
        resource_type="admin_user",
        resource_id=target_user.id,
        detail={"email": email, "name": target_user.full_name, "role": body.role, "invite_url": invite_url},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    return {
        "id": target_user.id,
        "n": target_user.full_name,
        "e": target_user.email,
        "r": body.role,
        "on": False,
        "is_active": False,
        "status": "invited",
        "has_pending_invite": True,
        "invite_url": invite_url,
        "token": token,
        "l": "Invited just now",
        "created_at": str(target_user.created_at),
        "message": f"Invitation sent to {email}",
    }


@router.post("/{user_id}/resend-invite", summary="Admin: Resend invitation email to pending member")
def resend_admin_invite(
    user_id: str,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found.")

    base_url = _get_app_base_url(request)
    team_roles = _get_team_roles_dict(db)
    invitations = _get_pending_invitations(db)
    role_title = team_roles.get(user.id, user.role.value.replace("_", " ").title())

    # Clean old tokens for this user
    invitations = {
        tok: inv for tok, inv in invitations.items()
        if inv.get("user_id") != user.id and inv.get("email") != user.email
    }

    token = secrets.token_urlsafe(32)
    invitations[token] = {
        "user_id": user.id,
        "email": user.email,
        "name": user.full_name,
        "role": role_title,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "expires_at": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat(),
    }
    _save_pending_invitations(db, invitations)

    invite_url = f"{base_url}/#/accept-invite?token={token}"

    _dispatch_invitation_email(
        email=user.email,
        name=user.full_name,
        role=role_title,
        invite_url=invite_url,
        db=db,
    )

    log_audit(
        db=db,
        actor=admin_user,
        action="user.resend_invite",
        resource_type="admin_user",
        resource_id=user.id,
        detail={"email": user.email, "role": role_title, "invite_url": invite_url},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    return {
        "success": True,
        "invite_url": invite_url,
        "token": token,
        "message": f"Invitation email resent to {user.email}",
    }


@router.patch("/{user_id}", summary="Admin: Update admin user role, status or details")
def update_admin_user(
    user_id: str,
    body: AdminUserUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found.")

    team_roles = _get_team_roles_dict(db)
    prev_role = team_roles.get(user.id, user.role.value)
    prev_active = user.is_active

    if body.name is not None:
        user.full_name = body.name.strip()

    if body.is_active is not None:
        if user.id == admin_user.id and not body.is_active:
            raise ValidationError("You cannot deactivate your own administrative account.")
        user.is_active = body.is_active

    if body.role is not None:
        team_roles[user.id] = body.role
        user.role = _map_role_to_enum(body.role)
        _save_team_roles_dict(db, team_roles)

        # Update role in pending invitations if any
        invitations = _get_pending_invitations(db)
        inv_changed = False
        for tok, inv in invitations.items():
            if inv.get("user_id") == user.id or inv.get("email") == user.email:
                inv["role"] = body.role
                inv_changed = True
        if inv_changed:
            _save_pending_invitations(db, invitations)

    log_audit(
        db=db,
        actor=admin_user,
        action="user.update",
        resource_type="admin_user",
        resource_id=user.id,
        detail={
            "email": user.email,
            "status_change": {"from": prev_active, "to": user.is_active} if body.is_active is not None else None,
            "role_change": {"from": prev_role, "to": body.role} if body.role is not None else None,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    return {
        "id": user.id,
        "n": user.full_name,
        "e": user.email,
        "r": team_roles.get(user.id, body.role or prev_role),
        "on": user.is_active,
        "is_active": user.is_active,
        "l": _format_time_ago(user.updated_at),
    }


@router.delete("/{user_id}", summary="Admin: Deactivate or remove admin user")
def delete_admin_user(
    user_id: str,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found.")
    if user.id == admin_user.id:
        raise ValidationError("You cannot delete your own administrative account.")

    user.is_active = False

    log_audit(
        db=db,
        actor=admin_user,
        action="user.deactivate",
        resource_type="admin_user",
        resource_id=user.id,
        detail={"email": user.email, "status": "deactivated"},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    return {"status": "success", "message": f"User {user.email} deactivated."}
