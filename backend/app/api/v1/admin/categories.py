"""
DisplayDelight V2 — Admin Categories Management API.
Full administrative control over categories: create, update, reorder, delete.
Mutations are logged to audit logs and synced with the SQLite database.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_catalogue_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import Category, Product, PublishStatus, User


router = APIRouter(prefix="/categories", tags=["Admin Categories"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    return re.sub(r"[^\w\s-]", "", text).replace(" ", "-")


@router.get("", summary="Admin: List all categories with product counts")
def list_admin_categories(
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    categories = db.query(Category).order_by(Category.display_order.asc()).all()
    out = []
    for c in categories:
        prod_count = db.query(Product).filter(Product.category_id == c.id).count()
        out.append({
            "id": c.id,
            "slug": c.slug,
            "name": c.name,
            "description": c.description,
            "image_url": c.image_url,
            "parent_id": c.parent_id,
            "display_order": c.display_order,
            "status": c.status.value if hasattr(c.status, "value") else str(c.status),
            "is_visible": c.status == PublishStatus.published,
            "product_count": prod_count,
            "seo_title": c.seo_title,
            "seo_description": c.seo_description,
        })
    return out


@router.post("", summary="Admin: Create new category")
def create_category(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValidationError("Category name is required.")

    slug = (payload.get("slug") or _slugify(name)).strip()
    if db.query(Category).filter(Category.slug == slug).first():
        slug = f"{slug}-{int(request.state.start_time if hasattr(request.state, 'start_time') else 1)}"

    max_order = db.query(Category).count()
    status_val = PublishStatus.published if payload.get("visible", True) and payload.get("status") != "draft" else PublishStatus.draft

    cat = Category(
        name=name,
        slug=slug,
        description=payload.get("description") or payload.get("desc"),
        image_url=payload.get("image_url") or payload.get("img"),
        parent_id=payload.get("parent_id") or payload.get("parent") or None,
        display_order=payload.get("display_order", max_order + 1),
        status=status_val,
        seo_title=payload.get("seo_title", f"{name} | DisplayDelight"),
        seo_description=payload.get("seo_description", payload.get("description")),
    )
    db.add(cat)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="category.create",
        resource_type="category",
        resource_id=cat.id,
        detail={"name": cat.name, "slug": cat.slug},
        ip_address=request.client.host if request.client else None,
    )

    return {
        "status": "success",
        "category": {
            "id": cat.id,
            "slug": cat.slug,
            "name": cat.name,
            "description": cat.description,
            "image_url": cat.image_url,
            "parent_id": cat.parent_id,
            "display_order": cat.display_order,
            "status": cat.status.value,
        }
    }


@router.put("/{category_id}", summary="Admin: Update existing category")
def update_category(
    category_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    cat = db.query(Category).filter((Category.id == category_id) | (Category.slug == category_id)).first()
    if not cat:
        raise NotFoundError("Category not found.")

    if "name" in payload and payload["name"]:
        cat.name = payload["name"].strip()
    if "slug" in payload and payload["slug"]:
        new_slug = payload["slug"].strip()
        existing = db.query(Category).filter(Category.slug == new_slug, Category.id != cat.id).first()
        if not existing:
            cat.slug = new_slug
    if "description" in payload or "desc" in payload:
        cat.description = payload.get("description", payload.get("desc"))
    if "image_url" in payload or "img" in payload:
        cat.image_url = payload.get("image_url", payload.get("img"))
    if "parent_id" in payload or "parent" in payload:
        val = payload.get("parent_id", payload.get("parent"))
        cat.parent_id = val if val and val != cat.id else None
    if "display_order" in payload:
        cat.display_order = int(payload["display_order"])
    if "visible" in payload:
        cat.status = PublishStatus.published if payload["visible"] else PublishStatus.draft
    elif "status" in payload:
        cat.status = PublishStatus.published if payload["status"] == "published" else PublishStatus.draft

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="category.update",
        resource_type="category",
        resource_id=cat.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {
        "status": "success",
        "category": {
            "id": cat.id,
            "slug": cat.slug,
            "name": cat.name,
            "description": cat.description,
            "image_url": cat.image_url,
            "parent_id": cat.parent_id,
            "display_order": cat.display_order,
            "status": cat.status.value,
        }
    }


@router.delete("/{category_id}", summary="Admin: Delete category")
def delete_category(
    category_id: str,
    request: Request,
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    cat = db.query(Category).filter((Category.id == category_id) | (Category.slug == category_id)).first()
    if not cat:
        raise NotFoundError("Category not found.")

    # Detach products from this category
    db.query(Product).filter(Product.category_id == cat.id).update({Product.category_id: None})
    db.delete(cat)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="category.delete",
        resource_type="category",
        resource_id=category_id,
        detail={"name": cat.name},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Category deleted."}


@router.post("/reorder", summary="Admin: Reorder category display sequence")
def reorder_categories(
    order_list: List[Dict[str, Any]],
    admin_user: User = Depends(require_catalogue_manager),
    db: Session = Depends(get_db),
):
    for item in order_list:
        cid = item.get("id")
        seq = item.get("display_order", 0)
        if cid:
            cat = db.get(Category, cid)
            if cat:
                cat.display_order = seq
    db.commit()
    return {"status": "success"}
