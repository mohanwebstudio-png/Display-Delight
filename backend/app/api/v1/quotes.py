"""
DisplayDelight V2 — Quotation Enquiries API.
Handles customer submissions for bespoke display inquiries,
LED video wall sizing, and quote-only products.
"""
from __future__ import annotations

import json
import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db, get_optional_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.models import ArtworkUpload, Product, QuoteRequest, QuoteStatus, User
from app.schemas.schemas import QuoteOut, QuoteRequestIn
from app.services.notifications import notify
from app.services.pricing import get_product_by_id_or_slug


router = APIRouter(prefix="/quotes", tags=["Quotes"])


def _generate_quote_reference() -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(4))
    return f"QT-{today_str}-{suffix}"


def _quote_to_out(quote: QuoteRequest) -> QuoteOut:
    created = quote.created_at.isoformat() if hasattr(quote.created_at, "isoformat") else str(quote.created_at)
    return QuoteOut(
        id=quote.id,
        reference=quote.reference,
        contact_name=quote.contact_name,
        business_name=quote.business_name,
        email=quote.email,
        phone=quote.phone,
        city=quote.city,
        state=quote.state,
        product_id=quote.product_id,
        quantity=quote.quantity,
        notes=quote.notes,
        artwork_url=quote.artwork_url,
        status=quote.status.value,
        created_at=created,
    )


@router.post("", response_model=QuoteOut, summary="Submit quotation request")
def submit_quote(
    payload: QuoteRequestIn,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    ref = _generate_quote_reference()

    product_snapshot = None
    if payload.product_id:
        product = get_product_by_id_or_slug(db, payload.product_id)
        if product:
            product_snapshot = json.dumps({
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "price_mode": product.price_mode,
            })

    artwork_url = None
    if payload.artwork_upload_id:
        upload_rec = db.get(ArtworkUpload, payload.artwork_upload_id)
        if upload_rec:
            artwork_url = upload_rec.stored_filename

    quote = QuoteRequest(
        reference=ref,
        user_id=current_user.id if current_user else None,
        contact_name=payload.contact_name,
        business_name=payload.business_name,
        email=payload.email.lower(),
        phone=payload.phone,
        city=payload.city,
        state=payload.state,
        product_id=payload.product_id,
        product_snapshot=product_snapshot,
        configuration=json.dumps(payload.configuration) if payload.configuration else None,
        quantity=payload.quantity,
        notes=payload.notes,
        artwork_url=artwork_url,
        status=QuoteStatus.submitted,
        consent_given=payload.consent_given,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)

    notify(
        db=db,
        event_type="quote_received",
        recipient_email=payload.email,
        context={
            "customer_name": payload.contact_name,
        },
        user_id=current_user.id if current_user else None,
        resource_type="quote",
        resource_id=quote.id,
    )

    return _quote_to_out(quote)


@router.get("/me", response_model=List[QuoteOut], summary="List quotes submitted by authenticated customer")
def list_my_quotes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quotes = (
        db.query(QuoteRequest)
        .filter(QuoteRequest.user_id == current_user.id)
        .order_by(QuoteRequest.created_at.desc())
        .all()
    )
    return [_quote_to_out(q) for q in quotes]


@router.get("/{quote_id}", response_model=QuoteOut, summary="Get quotation details")
def get_quote(
    quote_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    quote = db.get(QuoteRequest, quote_id)
    if not quote:
        raise NotFoundError("Quotation not found.")

    if current_user and current_user.role.value == "customer":
        if quote.user_id != current_user.id and quote.email.lower() != current_user.email.lower():
            raise ForbiddenError("Not authorized to view this quotation.")

    return _quote_to_out(quote)
