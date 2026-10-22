"""
DisplayDelight V2 — Admin Coupons Management API.
Full administrative CRUD for promotional coupons:
- List all coupons with usage metrics
- Create new percentage or fixed discount coupons
- Toggle active/inactive state
- Delete coupons
All changes are server-authoritative and immediately affect storefront pricing.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_order_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import Coupon, User


router = APIRouter(prefix="/coupons", tags=["Admin Coupons"])


@router.get("", summary="Admin: List all promotional coupons")
def list_coupons(
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    coupons = db.query(Coupon).order_by(Coupon.created_at.desc()).all()
    results = []
    for c in coupons:
        is_pct = c.discount_percent is not None
        val = float(c.discount_percent) if is_pct else round((c.discount_fixed_paise or 0) / 100)
        results.append({
            "id": c.id,
            "code": c.code,
            "description": c.description,
            "type": "percent" if is_pct else "fixed",
            "value": val,
            "discount_percent": float(c.discount_percent) if c.discount_percent is not None else None,
            "discount_fixed_paise": c.discount_fixed_paise,
            "min_order_paise": c.min_order_paise,
            "max_discount_paise": c.max_discount_paise,
            "limit": c.max_uses,
            "max_uses": c.max_uses,
            "used": c.uses_count,
            "uses_count": c.uses_count,
            "from": c.valid_from or "",
            "to": c.valid_until or "",
            "valid_from": c.valid_from,
            "valid_until": c.valid_until,
            "on": c.is_active,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at),
        })
    return results


@router.post("", summary="Admin: Create promotional coupon")
def create_coupon(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    raw_code = payload.get("code", "")
    code = raw_code.strip().upper()
    if not code:
        raise ValidationError("Coupon code is required.")

    existing = db.query(Coupon).filter(Coupon.code == code).first()
    if existing:
        raise ValidationError(f"Coupon code '{code}' already exists.")

    disc_type = payload.get("type", "percent")
    val_num = float(payload.get("value", 0))
    if val_num <= 0:
        raise ValidationError("Discount value must be greater than 0.")

    if disc_type == "percent":
        if val_num > 100:
            raise ValidationError("Percentage discount cannot exceed 100%.")
        discount_percent = Decimal(str(val_num))
        discount_fixed_paise = None
    else:
        discount_percent = None
        discount_fixed_paise = int(val_num * 100)

    limit = payload.get("limit") or payload.get("max_uses")
    max_uses = int(limit) if limit else None

    valid_from = payload.get("from") or payload.get("valid_from") or None
    valid_until = payload.get("to") or payload.get("valid_until") or None

    coupon = Coupon(
        code=code,
        description=payload.get("description"),
        discount_percent=discount_percent,
        discount_fixed_paise=discount_fixed_paise,
        min_order_paise=int(payload.get("min_order_paise", 0)) if payload.get("min_order_paise") else None,
        max_discount_paise=int(payload.get("max_discount_paise", 0)) if payload.get("max_discount_paise") else None,
        max_uses=max_uses,
        uses_count=0,
        valid_from=valid_from,
        valid_until=valid_until,
        is_active=payload.get("is_active", True) if "is_active" in payload else payload.get("on", True),
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    log_audit(
        db=db,
        actor=admin_user,
        action="coupon.create",
        resource_type="coupon",
        resource_id=coupon.id,
        detail={"code": coupon.code, "type": disc_type, "value": val_num},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": coupon.id, "code": coupon.code}


@router.patch("/{coupon_id}/toggle", summary="Admin: Toggle coupon active/inactive")
def toggle_coupon(
    coupon_id: str,
    payload: Optional[Dict[str, Any]] = None,
    request: Request = None,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    coupon = db.query(Coupon).filter((Coupon.id == coupon_id) | (Coupon.code == coupon_id.upper())).first()
    if not coupon:
        raise NotFoundError("Coupon not found.")

    if payload and "is_active" in payload:
        coupon.is_active = bool(payload["is_active"])
    elif payload and "on" in payload:
        coupon.is_active = bool(payload["on"])
    else:
        coupon.is_active = not coupon.is_active

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="coupon.toggle",
        resource_type="coupon",
        resource_id=coupon.id,
        detail={"code": coupon.code, "is_active": coupon.is_active},
        ip_address=request.client.host if request and request.client else None,
    )

    return {"status": "success", "id": coupon.id, "code": coupon.code, "is_active": coupon.is_active, "on": coupon.is_active}


@router.delete("/{coupon_id}", summary="Admin: Delete coupon")
def delete_coupon(
    coupon_id: str,
    request: Request,
    admin_user: User = Depends(require_order_manager),
    db: Session = Depends(get_db),
):
    coupon = db.query(Coupon).filter((Coupon.id == coupon_id) | (Coupon.code == coupon_id.upper())).first()
    if not coupon:
        raise NotFoundError("Coupon not found.")

    code = coupon.code
    cid = coupon.id
    db.delete(coupon)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="coupon.delete",
        resource_type="coupon",
        resource_id=cid,
        detail={"code": code},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": cid, "code": code}
