"""
DisplayDelight V2 — Admin Common Utilities.
Includes audit logging helper for RBAC actions.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.models import AuditLog, User


def log_audit(
    db: Session,
    actor: User,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    detail: Optional[Any] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Writes an immutable record to the audit_logs table."""
    try:
        detail_str = None
        if detail is not None:
            detail_str = json.dumps(detail) if isinstance(detail, (dict, list)) else str(detail)

        entry = AuditLog(
            actor_id=actor.id,
            actor_email=actor.email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail_str,
            ip_address=ip_address,
            occurred_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] Failed to record audit log: {e}")
