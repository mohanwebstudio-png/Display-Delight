"""
DisplayDelight V2 — Customer Account, Orders, Addresses & Wishlist API.
Supports both /customer/* and /me/* endpoints for full compatibility.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user, get_db
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import Address, Order, OrderItem, OrderStatus, Payment, Product, User, WishlistItem
from app.schemas.schemas import AddressIn, AddressOut, UserOut, WishlistOut
from app.services.pricing import get_product_by_id_or_slug


router = APIRouter(tags=["Customer"])


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut, summary="Get customer profile")
@router.get("/customer/me", response_model=UserOut, summary="Get customer profile")
def get_profile(
    user: User = Depends(get_current_user),
):
    return user


@router.patch("/me", response_model=UserOut, summary="Update customer profile")
@router.patch("/customer/me", response_model=UserOut, summary="Update customer profile")
def update_profile(
    payload: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "full_name" in payload and payload["full_name"]:
        user.full_name = payload["full_name"].strip()
    if "phone" in payload:
        user.phone = payload["phone"].strip() if payload["phone"] else None

    db.commit()
    db.refresh(user)
    return user


# ── Customer Orders ───────────────────────────────────────────────────────────

@router.get("/customer/orders", summary="List customer orders matching account or email")
@router.get("/me/orders", summary="List customer orders matching account or email")
def list_customer_orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
        )
        .filter(
            or_(
                Order.user_id == user.id,
                func.lower(Order.customer_email) == func.lower(user.email),
            )
        )
        .order_by(Order.created_at.desc())
        .all()
    )
    result = []
    for o in orders:
        latest_payment = o.payments[0] if o.payments else None
        p_status = latest_payment.status.value if latest_payment else ("paid" if o.status == OrderStatus.paid else "pending")
        item_count = sum(it.quantity for it in o.items) if o.items else 1
        result.append({
            "id": o.id,
            "reference": o.reference,
            "status": o.status.value if hasattr(o.status, "value") else str(o.status),
            "payment_status": p_status,
            "total_amount_paise": o.total_paise,
            "total_amount_inr": round((o.total_paise or 0) / 100),
            "currency": "INR",
            "item_count": item_count,
            "created_at": o.created_at.isoformat() if hasattr(o.created_at, "isoformat") else str(o.created_at),
            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
        })
    return result


@router.get("/customer/orders/{order_ref}", summary="Get customer order detail")
@router.get("/me/orders/{order_ref}", summary="Get customer order detail")
def get_customer_order(
    order_ref: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
            selectinload(Order.status_history),
        )
        .filter(
            (Order.reference == order_ref.upper().strip()) | (Order.id == order_ref),
            or_(
                Order.user_id == user.id,
                func.lower(Order.customer_email) == func.lower(user.email),
            ),
        )
        .first()
    )
    if not order:
        raise NotFoundError("Order not found or unauthorized.")

    shipping_addr = json.loads(order.shipping_address) if order.shipping_address else None
    billing_addr = json.loads(order.billing_address) if order.billing_address else None
    latest_pay = order.payments[0] if order.payments else None

    items_out = []
    for it in order.items:
        items_out.append({
            "id": it.id,
            "product_name": it.product_name,
            "product_sku": it.product_sku,
            "quantity": it.quantity,
            "unit_price_inr": round((it.unit_price_paise or 0) / 100),
            "total_price_inr": round((it.total_paise or 0) / 100),
            "artwork_url": it.artwork_url,
        })

    return {
        "id": order.id,
        "reference": order.reference,
        "status": order.status.value if hasattr(order.status, "value") else str(order.status),
        "payment_status": latest_pay.status.value if latest_pay else ("paid" if order.status == OrderStatus.paid else "pending"),
        "total_amount_paise": order.total_paise,
        "total_amount_inr": round((order.total_paise or 0) / 100),
        "currency": "INR",
        "item_count": len(order.items),
        "created_at": order.created_at.isoformat() if hasattr(order.created_at, "isoformat") else str(order.created_at),
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "shipping_address": shipping_addr,
        "billing_address": billing_addr,
        "items": items_out,
        "timeline": [
            {
                "status": h.status,
                "notes": h.note,
                "created_at": h.changed_at,
            }
            for h in order.status_history
        ],
    }


# ── Addresses ─────────────────────────────────────────────────────────────────

@router.get("/me/addresses", response_model=List[AddressOut], summary="List customer addresses")
@router.get("/customer/addresses", response_model=List[AddressOut], summary="List customer addresses")
def list_addresses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Address)
        .filter(Address.user_id == user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
        .all()
    )


@router.post("/me/addresses", response_model=AddressOut, summary="Add new address")
@router.post("/customer/addresses", response_model=AddressOut, summary="Add new address")
def create_address(
    payload: AddressIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})

    addr = Address(
        user_id=user.id,
        label=payload.label,
        full_name=payload.full_name,
        phone=payload.phone or user.phone,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        state=payload.state,
        pin_code=payload.pin_code,
        country=payload.country,
        is_default=payload.is_default,
    )
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.put("/me/addresses/{address_id}", response_model=AddressOut, summary="Update address")
@router.put("/customer/addresses/{address_id}", response_model=AddressOut, summary="Update address")
def update_address(
    address_id: str,
    payload: AddressIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise NotFoundError("Address not found.")

    if payload.is_default and not addr.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})

    addr.label = payload.label
    addr.full_name = payload.full_name
    addr.phone = payload.phone
    addr.address_line1 = payload.address_line1
    addr.address_line2 = payload.address_line2
    addr.city = payload.city
    addr.state = payload.state
    addr.pin_code = payload.pin_code
    addr.country = payload.country
    addr.is_default = payload.is_default

    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/me/addresses/{address_id}", summary="Delete address")
@router.delete("/customer/addresses/{address_id}", summary="Delete address")
def delete_address(
    address_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise NotFoundError("Address not found.")

    db.delete(addr)
    db.commit()
    return {"status": "success", "message": "Address deleted."}


# ── Wishlist ──────────────────────────────────────────────────────────────────

@router.get("/me/wishlist", response_model=WishlistOut, summary="Get wishlist product IDs")
@router.get("/customer/wishlist", response_model=WishlistOut, summary="Get wishlist product IDs")
def get_wishlist(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(WishlistItem).filter(WishlistItem.user_id == user.id).all()
    return WishlistOut(product_ids=[item.product_id for item in items])


@router.post("/me/wishlist", summary="Add product to wishlist")
@router.post("/customer/wishlist", summary="Add product to wishlist")
def add_to_wishlist(
    payload: Dict[str, str],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product_id = payload.get("product_id")
    if not product_id:
        raise ValidationError("product_id is required.")

    product = get_product_by_id_or_slug(db, product_id)
    if not product:
        raise NotFoundError("Product not found.")

    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id,
        WishlistItem.product_id == product.id,
    ).first()

    if not existing:
        item = WishlistItem(user_id=user.id, product_id=product.id)
        db.add(item)
        db.commit()

    items = db.query(WishlistItem).filter(WishlistItem.user_id == user.id).all()
    return WishlistOut(product_ids=[i.product_id for i in items])


@router.delete("/me/wishlist/{product_id}", summary="Remove product from wishlist")
@router.delete("/customer/wishlist/{product_id}", summary="Remove product from wishlist")
def remove_from_wishlist(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id,
        WishlistItem.product_id == product_id,
    ).first()

    if item:
        db.delete(item)
        db.commit()

    items = db.query(WishlistItem).filter(WishlistItem.user_id == user.id).all()
    return WishlistOut(product_ids=[i.product_id for i in items])
