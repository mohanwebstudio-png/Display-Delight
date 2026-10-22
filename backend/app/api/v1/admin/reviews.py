"""
DisplayDelight V3 — Admin Product Reviews Moderation API.
Allows admins with content/catalogue permissions to view, approve, and reject customer reviews.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db, require_content_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import Product, ProductReview, User


router = APIRouter(prefix="/reviews", tags=["Admin Reviews"])


@router.get("", summary="Admin: List customer reviews for moderation")
def list_admin_reviews(
    status: Optional[str] = Query(None, description="Filter by status: pending, published, rejected"),
    product_id: Optional[str] = Query(None),
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    q = db.query(ProductReview).options(selectinload(ProductReview.product))
    if status:
        q = q.filter(ProductReview.status == status)
    if product_id:
        q = q.filter(ProductReview.product_id == product_id)
    reviews = q.order_by(ProductReview.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else None,
            "author_name": r.author_name,
            "company": r.company,
            "rating": r.rating,
            "title": r.title,
            "body": r.body,
            "status": r.status,
            "is_verified_purchase": r.is_verified_purchase,
            "created_at": r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at),
        }
        for r in reviews
    ]


@router.patch("/{review_id}", summary="Admin: Moderate review (approve/reject)")
def moderate_review(
    review_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    review = db.get(ProductReview, review_id)
    if not review:
        raise NotFoundError("Review not found.")

    new_status = payload.get("status")
    if new_status in ["published", "rejected", "pending"]:
        review.status = new_status
    elif "is_approved" in payload:
        review.status = "published" if payload["is_approved"] else "rejected"
    else:
        raise ValidationError("Invalid review moderation payload. Provide 'status' or 'is_approved'.")

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action=f"review.{review.status}",
        resource_type="product_review",
        resource_id=review.id,
        detail={"status": review.status, "product_id": review.product_id},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": review.id, "review_status": review.status}


@router.delete("/{review_id}", summary="Admin: Delete review")
def delete_review(
    review_id: str,
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    review = db.get(ProductReview, review_id)
    if not review:
        raise NotFoundError("Review not found.")

    db.delete(review)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="review.delete",
        resource_type="product_review",
        resource_id=review_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Review deleted successfully."}
