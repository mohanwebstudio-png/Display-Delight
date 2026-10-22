"""
DisplayDelight V2 — Categories and Dynamic Filter Metadata API.
Drives the storefront shop sidebar dynamically from CategoryFilterConfig
and ProductAttribute without hardcoded frontend schemas.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.exceptions import NotFoundError
from app.models.models import (
    Category,
    CategoryFilterConfig,
    ProductAttribute,
    ProductAttributeValue,
    PublishStatus,
)
from app.schemas.schemas import CategoryOut, FilterMeta, FilterOptionMeta


router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryOut], summary="List published product categories")
def list_categories(
    db: Session = Depends(get_db),
):
    categories = (
        db.query(Category)
        .filter(Category.status == PublishStatus.published)
        .order_by(Category.display_order.asc())
        .all()
    )
    out = []
    for c in categories:
        out.append(
            CategoryOut(
                id=c.id,
                slug=c.slug,
                name=c.name,
                description=c.description,
                image_url=c.image_url,
                parent_id=c.parent_id,
                display_order=c.display_order,
                status=c.status.value,
                seo_title=c.seo_title,
                seo_description=c.seo_description,
            )
        )
    return out


@router.get("/{slug}", response_model=CategoryOut, summary="Get category by slug")
def get_category(
    slug: str,
    db: Session = Depends(get_db),
):
    cat = (
        db.query(Category)
        .filter(Category.slug == slug.lower().strip(), Category.status == PublishStatus.published)
        .first()
    )
    if not cat:
        raise NotFoundError("Category not found.")
    return CategoryOut(
        id=cat.id,
        slug=cat.slug,
        name=cat.name,
        description=cat.description,
        image_url=cat.image_url,
        parent_id=cat.parent_id,
        display_order=cat.display_order,
        status=cat.status.value,
        seo_title=cat.seo_title,
        seo_description=cat.seo_description,
    )


@router.get("/{slug}/filters", response_model=List[FilterMeta], summary="Get dynamic filter definitions for category sidebar")
def get_category_filters(
    slug: str,
    db: Session = Depends(get_db),
):
    cat = (
        db.query(Category)
        .filter(Category.slug == slug.lower().strip(), Category.status == PublishStatus.published)
        .first()
    )
    if not cat:
        raise NotFoundError("Category not found.")

    # Find configs for this category
    configs = (
        db.query(CategoryFilterConfig)
        .filter(CategoryFilterConfig.category_id == cat.id, CategoryFilterConfig.is_visible == True)
        .order_by(CategoryFilterConfig.display_order.asc())
        .all()
    )

    filters_meta: List[FilterMeta] = []
    for conf in configs:
        attr: ProductAttribute = conf.attribute
        if not attr or not attr.is_filterable:
            continue

        # Get available distinct values or options
        options = []
        if attr.options:
            for opt in attr.options:
                options.append(FilterOptionMeta(label=opt.label, value=opt.value, count=0))
        else:
            # Query distinct attribute values present in products of this category
            vals = (
                db.query(ProductAttributeValue.value)
                .filter(ProductAttributeValue.attribute_id == attr.id)
                .distinct()
                .all()
            )
            for v_tuple in vals:
                v_str = str(v_tuple[0])
                options.append(FilterOptionMeta(label=v_str, value=v_str, count=0))

        filters_meta.append(
            FilterMeta(
                key=attr.key,
                label=attr.label,
                filter_type=attr.filter_type.value,
                unit=attr.unit,
                options=options,
            )
        )

    return filters_meta
