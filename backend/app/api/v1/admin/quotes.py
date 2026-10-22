"""
DisplayDelight V2 — Admin Quotation Management API.
Review bespoke display enquiries, prepare formal pricing quotations,
and communicate with prospective business clients.
"""
from __future__ import annotations

import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_order_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import QuoteRequest, QuoteStatus, User
from app.services.notifications import notify


router = APIRouter(prefix="/quotes", tags=["Admin Quotes"])


@router.get("", summary="Admin: List all quotation requests")
def list_quotes(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    query = db.query(QuoteRequest)
    if status:
        query = query.filter(QuoteRequest.status == status)

    total = query.count()
    quotes = (
        query.order_by(QuoteRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for q in quotes:
        items.append({
            "id": q.id,
            "reference": q.reference,
            "contact_name": q.contact_name,
            "business_name": q.business_name,
            "email": q.email,
            "phone": q.phone,
            "city": q.city,
            "status": q.status.value,
            "quantity": q.quantity,
            "quoted_amount_paise": q.quoted_amount_paise,
            "created_at": q.created_at.isoformat() if hasattr(q.created_at, "isoformat") else str(q.created_at),
        })

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/{quote_id}", summary="Admin: Get quote details")
def get_quote_detail(
    quote_id: str,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    q = (
        db.query(QuoteRequest)
        .filter((QuoteRequest.id == quote_id) | (QuoteRequest.reference == quote_id))
        .first()
    )
    if not q:
        raise NotFoundError("Quotation not found.")

    return {
        "id": q.id,
        "reference": q.reference,
        "contact_name": q.contact_name,
        "business_name": q.business_name,
        "email": q.email,
        "phone": q.phone,
        "city": q.city,
        "state": q.state,
        "product_id": q.product_id,
        "product_snapshot": json.loads(q.product_snapshot) if q.product_snapshot else None,
        "configuration": json.loads(q.configuration) if q.configuration else None,
        "quantity": q.quantity,
        "notes": q.notes,
        "artwork_url": q.artwork_url,
        "status": q.status.value,
        "admin_notes": q.admin_notes,
        "quoted_amount_paise": q.quoted_amount_paise,
        "created_at": q.created_at.isoformat() if hasattr(q.created_at, "isoformat") else str(q.created_at),
    }


@router.patch("/{quote_id}", summary="Admin: Update quote status and provide quote estimate")
def update_quote(
    quote_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    q = (
        db.query(QuoteRequest)
        .filter((QuoteRequest.id == quote_id) | (QuoteRequest.reference == quote_id))
        .first()
    )
    if not q:
        raise NotFoundError("Quotation not found.")

    prev_status = q.status.value
    if "status" in payload:
        try:
            q.status = QuoteStatus(payload["status"])
        except ValueError:
            raise ValidationError(f"Invalid status '{payload['status']}'.")

    if "admin_notes" in payload:
        q.admin_notes = payload["admin_notes"]

    if "quoted_amount_paise" in payload:
        q.quoted_amount_paise = payload["quoted_amount_paise"]
    elif "quoted_amount_rupees" in payload:
        q.quoted_amount_paise = int(float(payload["quoted_amount_rupees"]) * 100)

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="quote.update",
        resource_type="quote",
        resource_id=q.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    if q.status == QuoteStatus.quoted and prev_status != "quoted":
        amount_str = f"₹{q.quoted_amount_paise / 100:,.2f}" if q.quoted_amount_paise else "Provided in portal"
        try:
            notify(
                db=db,
                event_type="quote_replied",
                recipient_email=q.email,
                context={
                    "customer_name": q.contact_name,
                    "total_rupees": amount_str,
                    "notes": q.admin_notes or "Please see portal for specifications.",
                },
                user_id=q.user_id,
                resource_type="quote",
                resource_id=q.id,
            )
        except Exception:
            pass

    return {"status": "success", "quote_status": q.status.value}


@router.post("/{quote_id}/quote", summary="Admin: Reply to quotation with pricing")
def reply_quote_endpoint(
    quote_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    q = (
        db.query(QuoteRequest)
        .filter((QuoteRequest.id == quote_id) | (QuoteRequest.reference == quote_id))
        .first()
    )
    if not q:
        raise NotFoundError("Quotation not found.")

    quoted_rupees = payload.get("quoted_amount_rupees") or payload.get("amount") or 0
    notes = payload.get("notes") or payload.get("message") or ""

    if quoted_rupees:
        q.quoted_amount_paise = int(float(quoted_rupees) * 100)
    if notes:
        q.admin_notes = notes

    q.status = QuoteStatus.quoted
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="quote.reply",
        resource_type="quote",
        resource_id=q.id,
        detail={"quoted_rupees": quoted_rupees, "notes": notes},
        ip_address=request.client.host if request.client else None,
    )

    amount_str = f"₹{float(quoted_rupees):,.2f}" if quoted_rupees else "Custom estimate"
    try:
        notify(
            db=db,
            event_type="quote_replied",
            recipient_email=q.email,
            context={
                "customer_name": q.contact_name,
                "total_rupees": amount_str,
                "notes": q.admin_notes or "Please see portal for specifications.",
            },
            user_id=q.user_id,
            resource_type="quote",
            resource_id=q.id,
        )
    except Exception:
        pass

    return {
        "status": "success",
        "reference": q.reference,
        "quote_status": q.status.value,
        "quoted_amount_paise": q.quoted_amount_paise,
    }
