"""
DisplayDelight V2 — Storefront Product Variants & Option Sets API.
Provides customers with real-time options (Size, Pitch, Mounting, Touch, etc.)
configured in the admin panel and stored in the SQLite database.
"""
from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.models import VariantOptionSet


router = APIRouter(prefix="/variants", tags=["Variants"])


@router.get("", summary="List variant option sets for storefront")
def get_storefront_variants(
    category_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(VariantOptionSet)
    if category_id:
        query = query.filter(
            (VariantOptionSet.applies_to_category == category_id) | (VariantOptionSet.applies_to_category == "all")
        )
    sets = query.order_by(VariantOptionSet.display_order.asc()).all()

    out = []
    for s in sets:
        try:
            vals = json.loads(s.values_json)
        except Exception:
            vals = []
        out.append({
            "id": s.id,
            "name": s.name,
            "applies": s.applies_to_category,
            "values": vals,
            "style": s.style,
            "required": s.is_required,
        })
    return out
