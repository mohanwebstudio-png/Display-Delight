"""
DisplayDelight V2 — Admin SEO & Metadata API.
Manages search engine titles, descriptions, canonical URLs, and OpenGraph share images
for both storefront pages and catalogue products.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_admin
from app.api.v1.admin.common import log_audit
from app.models.models import ContentPage, Product, SeoMeta, User

router = APIRouter(prefix="/seo", tags=["Admin SEO"])

DEFAULT_PAGES = [
    {
        "id": "home",
        "name": "Home",
        "kind": "Page",
        "default_title": "DisplayDelight — Commercial Displays & Custom Signage",
        "default_desc": "High-impact digital standees, ultra slim light boxes, acrylic LED frames, and bespoke retail signage built for commercial enterprise.",
        "default_og": "/p/hero.jpg",
    },
    {
        "id": "shop",
        "name": "Shop Catalogue",
        "kind": "Page",
        "default_title": "Commercial Signage Catalogue | DisplayDelight",
        "default_desc": "Explore our full range of business displays, tabletop acrylic stands, backlit fabric frames, and interactive kiosks.",
        "default_og": "/p/hero.jpg",
    },
    {
        "id": "about",
        "name": "About us",
        "kind": "Page",
        "default_title": "About Us — DisplayDelight Commercial Signage Hub",
        "default_desc": "Learn about our craftsmanship, pan-India distribution hubs in Chennai & Bangalore, and enterprise clients.",
        "default_og": "/p/hero.jpg",
    },
    {
        "id": "contact",
        "name": "Contact",
        "kind": "Page",
        "default_title": "Contact DisplayDelight — Technical Consultation & Quotes",
        "default_desc": "Reach our engineering and sales teams for custom sizing, bulk commercial orders, and showroom visits.",
        "default_og": "/p/hero.jpg",
    },
    {
        "id": "quote",
        "name": "Request a Quote",
        "kind": "Page",
        "default_title": "Request a Custom Signage Quote | DisplayDelight",
        "default_desc": "Submit custom dimensions and artwork for immediate engineering estimate and formal business quotation.",
        "default_og": "/p/hero.jpg",
    },
    {
        "id": "policy-shipping",
        "name": "Shipping policy",
        "kind": "Page",
        "default_title": "Shipping & Freight Policy | DisplayDelight",
        "default_desc": "Insured nationwide commercial freight, crated packaging, and scheduled dispatch timelines across India.",
        "default_og": "/p/hero.jpg",
    },
    {
        "id": "policy-returns",
        "name": "Returns & Warranty",
        "kind": "Page",
        "default_title": "Warranty & Returns Policy | DisplayDelight",
        "default_desc": "Comprehensive 1-year commercial warranty, transit insurance, and replacement coverage for business equipment.",
        "default_og": "/p/hero.jpg",
    },
    {
        "id": "track",
        "name": "Track Order",
        "kind": "Page",
        "default_title": "Track Order Status | DisplayDelight",
        "default_desc": "Check live fabrication, testing, dispatch and carrier tracking status for your order.",
        "default_og": "/p/hero.jpg",
    },
]


@router.get("", summary="Admin: List all SEO metadata entries")
def list_seo_entries(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Fetch all stored SeoMeta records
    all_seo = {f"{s.resource_type}:{s.resource_id}": s for s in db.query(SeoMeta).all()}

    results = []

    # 1. Storefront static & CMS pages
    for p in DEFAULT_PAGES:
        key = f"page:{p['id']}"
        rec = all_seo.get(key)
        results.append({
            "id": p["id"],
            "resource_type": "page",
            "resource_id": p["id"],
            "name": p["name"],
            "kind": p["kind"],
            "t": rec.title if rec and rec.title else p["default_title"],
            "d": rec.description if rec and rec.description else p["default_desc"],
            "og": rec.og_image_url if rec and rec.og_image_url else p["default_og"],
            "canonical": rec.canonical_url if rec else "",
            "noindex": rec.noindex if rec else False,
            "has_custom": bool(rec),
        })

    # CMS pages from database
    cms_pages = db.query(ContentPage).all()
    for cp in cms_pages:
        if any(r["id"] == cp.slug for r in results):
            continue
        key = f"page:{cp.slug}"
        rec = all_seo.get(key)
        results.append({
            "id": cp.slug,
            "resource_type": "page",
            "resource_id": cp.slug,
            "name": cp.title,
            "kind": "CMS Page",
            "t": rec.title if rec and rec.title else (cp.seo_title or cp.title),
            "d": rec.description if rec and rec.description else (cp.seo_description or f"{cp.title} at DisplayDelight"),
            "og": rec.og_image_url if rec and rec.og_image_url else "/p/hero.jpg",
            "canonical": rec.canonical_url if rec else "",
            "noindex": rec.noindex if rec else False,
            "has_custom": bool(rec),
        })

    # 2. Products from database
    products = db.query(Product).order_by(Product.name.asc()).all()
    for prod in products:
        key = f"product:{prod.id}"
        rec = all_seo.get(key)
        img_url = "/p/hero.jpg"
        if prod.images and len(prod.images) > 0:
            img_url = prod.images[0].url if hasattr(prod.images[0], "url") else str(prod.images[0])

        results.append({
            "id": prod.id,
            "resource_type": "product",
            "resource_id": prod.id,
            "name": prod.name,
            "kind": "Product",
            "t": rec.title if rec and rec.title else f"{prod.name} | DisplayDelight",
            "d": rec.description if rec and rec.description else (getattr(prod, "blurb", None) or getattr(prod, "description", None) or f"Buy {prod.name} with custom signage options."),
            "og": rec.og_image_url if rec and rec.og_image_url else img_url,
            "canonical": rec.canonical_url if rec else "",
            "noindex": rec.noindex if rec else False,
            "has_custom": bool(rec),
        })

    return results


@router.put("/{resource_type}/{resource_id}", summary="Admin: Update or create SEO snippet")
def update_seo_entry(
    resource_type: str,
    resource_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    seo = (
        db.query(SeoMeta)
        .filter(SeoMeta.resource_type == resource_type, SeoMeta.resource_id == resource_id)
        .first()
    )

    if not seo:
        seo = SeoMeta(resource_type=resource_type, resource_id=resource_id)
        db.add(seo)

    if "title" in payload:
        seo.title = payload["title"]
    elif "t" in payload:
        seo.title = payload["t"]

    if "description" in payload:
        seo.description = payload["description"]
    elif "d" in payload:
        seo.description = payload["d"]

    if "og_image_url" in payload:
        seo.og_image_url = payload["og_image_url"]
    elif "og" in payload:
        seo.og_image_url = payload["og"]

    if "canonical_url" in payload:
        seo.canonical_url = payload["canonical_url"]
    elif "canonical" in payload:
        seo.canonical_url = payload["canonical"]

    if "noindex" in payload:
        seo.noindex = bool(payload["noindex"])

    db.commit()
    db.refresh(seo)

    log_audit(
        db=db,
        actor=admin_user,
        action="seo.update",
        resource_type=resource_type,
        resource_id=resource_id,
        detail={"title": seo.title, "description": seo.description},
        ip_address=request.client.host if request.client else None,
    )

    return {
        "status": "success",
        "message": "SEO metadata updated successfully.",
        "id": seo.id,
        "title": seo.title,
        "description": seo.description,
        "og_image_url": seo.og_image_url,
    }
