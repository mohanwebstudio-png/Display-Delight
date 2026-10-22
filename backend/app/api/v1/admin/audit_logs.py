"""
DisplayDelight V2 — Admin Audit Logs API.
Provides immutable accountability record of administrative mutations.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_admin
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogOut, PaginatedResponse


router = APIRouter(prefix="/audit-logs", tags=["Admin Audit Logs"])


@router.get("", summary="Admin: Query audit logs with pagination and filters")
def list_audit_logs(
    page: int = 1,
    page_size: int = 25,
    actor_email: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if actor_email:
        query = query.filter(AuditLog.actor_email.ilike(f"%{actor_email.strip()}%"))
    if action:
        query = query.filter(AuditLog.action == action.strip())
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type.strip())

    total = query.count()
    logs = (
        query.order_by(AuditLog.occurred_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        AuditLogOut(
            id=log.id,
            actor_id=log.actor_id,
            actor_email=log.actor_email,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            detail=log.detail,
            ip_address=log.ip_address,
            occurred_at=log.occurred_at,
        )
        for log in logs
    ]

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }
