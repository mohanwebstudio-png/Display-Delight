"""
DisplayDelight V3 — Public Product Reviews API.
Exposes published reviews per product and allows authenticated customers to submit reviews.
Verified-purchase badge is set automatically from completed order history.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db, get_optional_current_user
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import Order, OrderItem, Product, ProductReview, User

router = APIRouter(prefix="/reviews", tags=["Reviews"])


# ── GET /api/v1/reviews  — all published reviews (homepage testimonials) ─────
@router.get("", response_model=None, summary="List published reviews (optionally filtered by product)")
def list_public_reviews(
    product_id: Optional[str] = Query(None, description="Filter by product ID or slug"),
    rating: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    q = (
        db.query(ProductReview)
        .options(selectinload(ProductReview.product))
        .filter(ProductReview.status == "published")
    )
    if product_id:
        # Support both UUID primary key and product slug
        from app.models.models import Product as Prod
        prod = db.query(Prod).filter(
            (Prod.id == product_id) | (Prod.slug == product_id)
        ).first()
        if prod:
            q = q.filter(ProductReview.product_id == prod.id)
    if rating:
        q = q.filter(ProductReview.rating == rating)

    total = q.count()
    reviews = q.order_by(ProductReview.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [
            {
                "id": r.id,
                "product_id": r.product_id,
                "product_name": r.product.name if r.product else None,
                "product_slug": r.product.slug if r.product else None,
                "author_name": r.author_name,
                "company": r.company,
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "is_verified_purchase": r.is_verified_purchase,
                "created_at": (
                    r.created_at.isoformat()
                    if hasattr(r.created_at, "isoformat")
                    else str(r.created_at)
                ),
            }
            for r in reviews
        ],
    }


# ── GET /api/v1/reviews/{product_id_or_slug}  — per-product reviews ──────────
@router.get("/{product_ref}", response_model=None, summary="Get published reviews for a specific product")
def get_product_reviews(
    product_ref: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Any:
    product = db.query(Product).filter(
        (Product.id == product_ref) | (Product.slug == product_ref)
    ).first()
    if not product:
        raise NotFoundError("Product not found.")

    q = (
        db.query(ProductReview)
        .filter(
            ProductReview.product_id == product.id,
            ProductReview.status == "published",
        )
        .order_by(ProductReview.created_at.desc())
    )
    total = q.count()
    reviews = q.offset(offset).limit(limit).all()

    avg_rating = (
        sum(r.rating for r in reviews) / len(reviews) if reviews else 0.0
    )

    return {
        "product_id": product.id,
        "product_name": product.name,
        "total": total,
        "average_rating": round(avg_rating, 2),
        "offset": offset,
        "limit": limit,
        "items": [
            {
                "id": r.id,
                "author_name": r.author_name,
                "company": r.company,
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "is_verified_purchase": r.is_verified_purchase,
                "created_at": (
                    r.created_at.isoformat()
                    if hasattr(r.created_at, "isoformat")
                    else str(r.created_at)
                ),
            }
            for r in reviews
        ],
    }


# ── POST /api/v1/reviews/{product_id_or_slug}  — submit review ───────────────
@router.post("/{product_ref}", response_model=None, summary="Submit a product review (auth optional)")
def submit_review(
    product_ref: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    product = db.query(Product).filter(
        (Product.id == product_ref) | (Product.slug == product_ref)
    ).first()
    if not product:
        raise NotFoundError("Product not found.")

    # Validate required fields
    author_name = (payload.get("author_name") or "").strip()
    rating = payload.get("rating")
    body = (payload.get("body") or "").strip()

    if not author_name:
        raise ValidationError("author_name is required.")
    if not isinstance(rating, int) or not (1 <= rating <= 5):
        raise ValidationError("rating must be an integer between 1 and 5.")
    if not body or len(body) < 10:
        raise ValidationError("body must be at least 10 characters.")

    # Check verified purchase: authenticated user who ordered this product
    is_verified = False
    if current_user:
        completed_order = (
            db.query(Order)
            .join(OrderItem, Order.id == OrderItem.order_id)
            .filter(
                Order.user_id == current_user.id,
                Order.status.in_(["delivered", "completed"]),
                OrderItem.product_id == product.id,
            )
            .first()
        )
        is_verified = completed_order is not None

    review = ProductReview(
        id=str(uuid.uuid4()),
        product_id=product.id,
        user_id=current_user.id if current_user else None,
        author_name=author_name,
        company=(payload.get("company") or "").strip() or None,
        rating=rating,
        title=(payload.get("title") or "").strip() or None,
        body=body,
        is_verified_purchase=is_verified,
        status="pending",  # awaits admin moderation
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    return {
        "status": "success",
        "message": "Review submitted and pending moderation.",
        "id": review.id,
        "is_verified_purchase": is_verified,
    }
