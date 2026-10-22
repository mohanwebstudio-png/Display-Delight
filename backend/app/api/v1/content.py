"""
DisplayDelight V2 — Content & CMS API.
Serves public CMS resources:
- Homepage aggregated content (/home)
- Dynamic content pages (/pages/:slug)
- Policies (/policies/:slug)
- Visual gallery (/gallery)
- Frequently asked questions (/faqs)
- Navigation menus (/navigation)
- Industries showcase (/industries)
- Footer configuration (/footer)
- Search suggestions (/search/suggest)
- SEO metadata (/seo/:path)

Enforces server-side content-integrity rules:
- Testimonials and client logos require is_published == True.
- Only published products and published categories are rendered.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_db
from app.core.exceptions import NotFoundError
from app.models.models import (
    Category,
    ClientLogo,
    ContentPage,
    Faq,
    GalleryItem,
    HomepageSection,
    IndustryShowcase,
    NavigationItem,
    Product,
    PublishStatus,
    SeoMeta,
    Testimonial,
    WebsiteSetting,
)
from app.schemas.schemas import (
    ClientLogoOut,
    ContentPageOut,
    FaqOut,
    GalleryItemOut,
    HomepageSectionOut,
    IndustryShowcaseOut,
    ProductSummary,
    TestimonialOut,
)


router = APIRouter(tags=["Content"])


@router.get("/home", summary="Get aggregated homepage components and featured items")
def get_homepage(
    db: Session = Depends(get_db),
):
    # 1. Sections
    all_sections = (
        db.query(HomepageSection)
        .order_by(HomepageSection.display_order.asc())
        .all()
    )
    visible_sections = [s for s in all_sections if s.is_visible]
    sec_vis_map = {s.section_key: s.is_visible for s in all_sections}

    # 2. Featured categories
    cats_sec = next((s for s in all_sections if s.section_key == "cats"), None)
    cats_title = (cats_sec.title if cats_sec and cats_sec.title else None) or "Shop by category"
    cats_subtitle = (cats_sec.subtitle if cats_sec and cats_sec.subtitle else None) or "Categories"

    all_published_cats = (
        db.query(Category)
        .filter(Category.status == PublishStatus.published)
        .order_by(Category.display_order.asc())
        .all()
    )

    chosen_cat_slugs = []
    if cats_sec and cats_sec.content:
        try:
            parsed_c = json.loads(cats_sec.content) if isinstance(cats_sec.content, str) else cats_sec.content
            if isinstance(parsed_c, dict):
                chosen_cat_slugs = parsed_c.get("items", [])
                if parsed_c.get("title"):
                    cats_title = parsed_c["title"]
                if parsed_c.get("subtitle"):
                    cats_subtitle = parsed_c["subtitle"]
            elif isinstance(parsed_c, list):
                chosen_cat_slugs = parsed_c
        except Exception:
            pass

    cat_map = {c.slug: c for c in all_published_cats if c.slug}
    cat_map.update({str(c.id): c for c in all_published_cats})

    if chosen_cat_slugs:
        ordered_cats = [cat_map[str(k)] for k in chosen_cat_slugs if str(k) in cat_map]
        categories = ordered_cats if ordered_cats else all_published_cats[:8]
    else:
        categories = all_published_cats[:8]

    # 3. Featured / Popular products
    products = (
        db.query(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.inventory),
        )
        .filter(Product.status == PublishStatus.published)
        .order_by(Product.created_at.desc())
        .limit(8)
        .all()
    )

    # 4. Published testimonials only (Content Integrity rule #10)
    testimonials = (
        db.query(Testimonial)
        .filter(Testimonial.is_published == True)
        .order_by(Testimonial.display_order.asc())
        .all()
    )

    # 5. Published client logos only (Content Integrity rule #10)
    logos = (
        db.query(ClientLogo)
        .filter(ClientLogo.is_published == True)
        .order_by(ClientLogo.display_order.asc())
        .all()
    )

    # 6. Published industries
    industries = (
        db.query(IndustryShowcase)
        .filter(IndustryShowcase.is_published == True)
        .order_by(IndustryShowcase.display_order.asc())
        .all()
    )

    # 7. Published gallery items (filtered for homepage or both placement)
    all_gallery = (
        db.query(GalleryItem)
        .filter(GalleryItem.is_published == True)
        .order_by(GalleryItem.display_order.asc())
        .all()
    )
    gallery_items = [
        g for g in all_gallery
        if (getattr(g, "placement", None) or "both") in ("both", "homepage")
    ][:8]

    # Format products summary
    prod_summaries = []
    for p in products:
        primary_img = next((i.url for i in p.images if i.is_primary), p.images[0].url) if p.images else None
        prod_summaries.append({
            "id": p.id,
            "sku": p.sku,
            "slug": p.slug,
            "name": p.name,
            "kind": p.kind.value if hasattr(p.kind, "value") else str(p.kind),
            "short_description": p.blurb,
            "base_price_paise": p.base_price_paise,
            "price_mode": "fixed" if p.base_price_paise else "on_request",
            "primary_image": primary_img,
            "is_customizable": p.is_customizable,
            "category_slug": p.category.slug if p.category else None,
            "category_name": p.category.name if p.category else None,
            "stock": p.inventory.quantity if p.inventory else None,
        })

    cat_summaries = []
    for c in categories:
        cat_summaries.append({
            "id": c.id,
            "slug": c.slug,
            "name": c.name,
            "description": c.description,
            "image_url": c.image_url,
        })

    # Section-specific rich models
    hero_sec = next((s for s in all_sections if s.section_key == "hero"), None)
    hero_data = None
    if hero_sec:
        extra = {}
        if hero_sec.content:
            try:
                extra = json.loads(hero_sec.content) if isinstance(hero_sec.content, str) else hero_sec.content
            except Exception:
                pass
        hero_data = {
            "headline": hero_sec.title,
            "sub": hero_sec.subtitle,
            "img": hero_sec.image_url,
            "video": extra.get("video", ""),
            "c1": hero_sec.cta_label or "Shop products",
            "c1to": hero_sec.cta_url or "/shop",
            "c2": extra.get("c2", "Request a quote"),
            "c2to": extra.get("c2to", "/quote"),
            "is_visible": hero_sec.is_visible,
        }

    announce_sec = next((s for s in all_sections if s.section_key == "announce"), None)
    announce_data = None
    if announce_sec:
        announce_data = {
            "text": announce_sec.title,
            "link": announce_sec.cta_url or "/shop",
            "is_visible": announce_sec.is_visible,
        }

    intro_sec = next((s for s in all_sections if s.section_key == "intro"), None)
    intro_data = None
    if intro_sec:
        intro_data = {
            "title": intro_sec.title or "Signage built around your brand",
            "text": intro_sec.subtitle or "We supply digital standees, illuminated and acrylic LED displays, tabletop signage, and customised branding products.",
            "img": intro_sec.image_url or "/p/backlit.jpg",
            "is_visible": intro_sec.is_visible,
        }

    video_sec = next((s for s in all_sections if s.section_key == "video"), None)
    video_data = None
    if video_sec:
        video_data = {
            "title": video_sec.title or "See it in action",
            "url": video_sec.cta_url or "",
            "poster": video_sec.image_url or "/p/i-standee.jpg",
            "is_visible": video_sec.is_visible,
        }

    benefits_sec = next((s for s in all_sections if s.section_key == "benefits"), None)
    benefits_data = None
    if benefits_sec:
        b_items = []
        if benefits_sec.content:
            try:
                b_items = json.loads(benefits_sec.content) if isinstance(benefits_sec.content, str) else benefits_sec.content
            except Exception:
                pass
        benefits_data = {
            "title": benefits_sec.title or "Built around your branding",
            "items": b_items if b_items else [
                {"t": "Made to your artwork", "d": "Upload a logo, set text, font and colour on customizable products."},
                {"t": "Right size, right mount", "d": "Wall mount, floor stand or tabletop — pick from supported sizes."},
                {"t": "Portable when you need it", "d": "Foldable roll-ups, tents and tripod stands for events and outdoor branding."},
                {"t": "Quote when it is bigger", "d": "Need a custom shape or larger quantity? Request a quote from any product page."},
            ],
            "is_visible": benefits_sec.is_visible,
        }

    contact_sec = next((s for s in all_sections if s.section_key == "contact"), None)
    contact_data = None
    if contact_sec:
        contact_data = {
            "title": contact_sec.title or "Ready to light up your brand?",
            "text": contact_sec.subtitle or "Tell us what you need — product, size, quantity — and our team will get back to you.",
            "cta": contact_sec.cta_label or "Request a quote",
            "to": contact_sec.cta_url or "/quote",
            "is_visible": contact_sec.is_visible,
        }

    featured_sec = next((s for s in all_sections if s.section_key == "featured"), None)
    if featured_sec and featured_sec.content:
        try:
            chosen_keys = json.loads(featured_sec.content) if isinstance(featured_sec.content, str) else featured_sec.content
            if isinstance(chosen_keys, list) and len(chosen_keys) > 0:
                key_order = {k: idx for idx, k in enumerate(chosen_keys)}
                prod_summaries.sort(key=lambda p: key_order.get(p["slug"], key_order.get(p["id"], 999)))
        except Exception:
            pass

    industries_out = [
        {
            "id": ind.id,
            "name": ind.name,
            "description": ind.description or "",
            "image_url": ind.image_url or "/p/i-standee.jpg",
        }
        for ind in industries
    ]

    gallery_out = []
    for g in gallery_items:
        cat_val = "Installations"
        prod_val = ""
        placement_val = getattr(g, "placement", "both") or "both"
        if g.caption:
            try:
                c_obj = json.loads(g.caption)
                if isinstance(c_obj, dict):
                    cat_val = c_obj.get("cat", "Installations")
                    prod_val = c_obj.get("prod", "")
                    if "placement" in c_obj:
                        placement_val = c_obj["placement"]
            except Exception:
                pass
        gallery_out.append({
            "id": g.id,
            "title": g.title or "Showcase",
            "media_url": g.media_url,
            "thumbnail_url": g.thumbnail_url or g.media_url,
            "embed_url": g.embed_url,
            "media_type": g.media_type,
            "placement": placement_val,
            "cat": cat_val,
            "prod": prod_val,
        })

    return {
        "sections": [HomepageSectionOut.model_validate(s) for s in visible_sections],
        "sections_order": [s.section_key for s in visible_sections],
        "sections_visibility": sec_vis_map,
        "hero": hero_data,
        "cats": {
            "title": cats_title,
            "subtitle": cats_subtitle,
            "is_visible": cats_sec.is_visible if cats_sec else True,
        },
        "announce": announce_data,
        "intro": intro_data,
        "video": video_data,
        "benefits": benefits_data,
        "contact": contact_data,
        "industries": industries_out,
        "gallery": gallery_out,
        "categories": cat_summaries,
        "featured_products": prod_summaries,
        "testimonials": [TestimonialOut.model_validate(t) for t in testimonials],
        "client_logos": [ClientLogoOut.model_validate(l) for l in logos],
    }


def _extract_page_body(page: ContentPage) -> ContentPageOut:
    body_text = page.content or ""
    if page.content and page.content.startswith("{"):
        try:
            parsed = json.loads(page.content)
            if isinstance(parsed, dict) and "body" in parsed:
                body_text = parsed.get("body", "")
        except Exception:
            pass

    return ContentPageOut(
        slug=page.slug,
        title=page.title,
        content=body_text,
        seo_title=page.seo_title,
        seo_description=page.seo_description,
    )


@router.get("/pages/{slug}", response_model=ContentPageOut, summary="Get CMS page by slug")
def get_page(
    slug: str,
    db: Session = Depends(get_db),
):
    clean = slug.lower().strip()
    candidates = [clean, clean.replace("-", ""), f"{clean}-us", clean.replace("-us", "")]
    page = (
        db.query(ContentPage)
        .filter(ContentPage.slug.in_(candidates), ContentPage.status == PublishStatus.published)
        .first()
    )
    if not page:
        if clean in ("store", "shop", "catalog", "catalogue"):
            return ContentPageOut(
                slug=clean,
                title="DisplayDelight Commercial Signage & Displays",
                content="Explore DisplayDelight commercial displays, video walls, digital standees, and signage.",
                seo_title="Store | DisplayDelight",
                seo_description="DisplayDelight official products and signage",
            )
        raise NotFoundError("Page not found.")
    return _extract_page_body(page)


@router.get("/policies/{slug}", response_model=ContentPageOut, summary="Get policy page by slug")
def get_policy(
    slug: str,
    db: Session = Depends(get_db),
):
    clean_slug = slug.lower().strip()
    candidates = [
        clean_slug,
        f"{clean_slug}-policy",
        clean_slug.replace("-policy", ""),
        "policy-" + clean_slug.replace("-policy", ""),
    ]
    if clean_slug in ("returns", "return", "refund"):
        candidates.extend(["refund-policy", "returns-policy", "refund", "returns"])
    elif clean_slug in ("terms", "tos"):
        candidates.extend(["terms-policy", "terms-and-conditions", "terms"])
    elif clean_slug == "shipping":
        candidates.extend(["shipping-policy", "shipping-freight-policy"])
    elif clean_slug == "privacy":
        candidates.extend(["privacy-policy"])
    elif clean_slug in ("warranty", "guarantee"):
        candidates.extend(["warranty-policy", "warranty"])

    page = (
        db.query(ContentPage)
        .filter(
            ContentPage.slug.in_(candidates),
            ContentPage.status == PublishStatus.published,
        )
        .first()
    )
    if not page:
        title = clean_slug.replace("-", " ").title() + " Policy"
        body_text = f"DisplayDelight provides commercial-grade display and signage solutions with standard manufacturer warranty and customer support. For full policy inquiries, please contact support@displaydelight.com or call +91 98403 27440."
        return ContentPageOut(
            slug=clean_slug,
            title=title,
            content=body_text,
            seo_title=f"{title} | DisplayDelight",
            seo_description=f"DisplayDelight official {title}",
        )
    return _extract_page_body(page)


@router.get("/navigation", summary="Get public navigation menus")
@router.get("/content/navigation", include_in_schema=False)
def get_public_navigation(
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "navigation_menus").first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            pass

    return {
        "header": [
            {"id": 1, "label": "Shop", "to": "/shop", "on": True, "d": 0},
            {"id": 2, "label": "Digital Signage", "to": "/shop", "on": True, "d": 1},
            {"id": 3, "label": "Gallery", "to": "/gallery", "on": True, "d": 0},
            {"id": 4, "label": "Contact", "to": "/contact", "on": True, "d": 0},
        ],
        "footer": [
            {"id": 5, "label": "About us", "to": "/about", "on": True, "d": 0},
            {"id": 6, "label": "Shipping policy", "to": "/policy/shipping", "on": True, "d": 0},
            {"id": 7, "label": "Privacy policy", "to": "/policy/privacy", "on": True, "d": 0},
        ],
    }


@router.get("/industries", summary="Get public industries showcase")
@router.get("/content/industries", include_in_schema=False)
def get_public_industries(
    db: Session = Depends(get_db),
):
    items = (
        db.query(IndustryShowcase)
        .filter(IndustryShowcase.is_published == True)
        .order_by(IndustryShowcase.display_order.asc())
        .all()
    )
    return [
        {
            "id": ind.id,
            "name": ind.name,
            "description": ind.description or "",
            "image_url": ind.image_url or "/p/i-standee.jpg",
        }
        for ind in items
    ]


@router.get("/footer", summary="Get public footer configuration")
@router.get("/content/footer", include_in_schema=False)
def get_public_footer(
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "footer_config").first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            pass

    # Read fallback from store_settings
    store_setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "store_settings").first()
    email_val = "support@displaydelight.in"
    phone_val = "+91 98403 27440"
    addr_val = "Plot 42, Guindy Industrial Estate, Chennai 600032"
    if store_setting and store_setting.value:
        try:
            s_data = json.loads(store_setting.value)
            email_val = s_data.get("contact_email", email_val)
            phone_val = s_data.get("contact_phone", phone_val)
            addr_val = s_data.get("business_address", addr_val)
        except Exception:
            pass

    return {
        "desc": "Digital standees, illuminated and acrylic LED displays, tabletop signage, roll-ups and customised branding products.",
        "cols": [
            {"t": "Shop", "links": [["All products", "/shop"], ["Digital standees", "/shop"], ["Request a quote", "/quote"]]},
            {"t": "Company", "links": [["About us", "/about"], ["Gallery", "/gallery"], ["Contact", "/contact"], ["FAQ", "/faq"]]},
        ],
        "pol": {
            "shipping": True,
            "returns": True,
            "warranty": True,
            "privacy": True,
            "terms": True,
        },
        "email": email_val,
        "phone": phone_val,
        "addr": addr_val,
        "soc": {
            "Instagram": True,
            "Facebook": True,
            "YouTube": False,
            "LinkedIn": False,
            "WhatsApp": True,
        },
    }


@router.get("/gallery", response_model=List[GalleryItemOut], summary="Get gallery showcase items")
def get_gallery(
    placement: Optional[str] = Query(None, description="Filter by placement: gallery, homepage, or both"),
    media_type: Optional[str] = Query(None, description="Filter by media type: image, video, instagram"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(GalleryItem)
        .filter(GalleryItem.is_published == True)
        .order_by(GalleryItem.display_order.asc())
    )
    items = query.all()
    if placement:
        items = [i for i in items if (getattr(i, "placement", "both") or "both") in (placement, "both")]
    else:
        # Default gallery page shows items marked "gallery" or "both"
        items = [i for i in items if (getattr(i, "placement", "both") or "both") in ("gallery", "both")]
    if media_type:
        items = [i for i in items if i.media_type.lower() == media_type.lower()]
    return items


@router.get("/client-logos", response_model=List[ClientLogoOut], summary="Get published client logos")
def get_client_logos(
    db: Session = Depends(get_db),
):
    return (
        db.query(ClientLogo)
        .filter(ClientLogo.is_published == True)
        .order_by(ClientLogo.display_order.asc())
        .all()
    )


@router.get("/testimonials", response_model=List[TestimonialOut], summary="Get published customer testimonials")
def get_testimonials(
    db: Session = Depends(get_db),
):
    return (
        db.query(Testimonial)
        .filter(Testimonial.is_published == True)
        .order_by(Testimonial.display_order.asc())
        .all()
    )


@router.get("/faqs", response_model=List[FaqOut], summary="Get active FAQs")
def get_faqs(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Faq).filter(Faq.is_published == True)
    if category:
        q = q.filter(Faq.category == category)
    return q.order_by(Faq.display_order.asc()).all()


@router.get("/search/suggest", summary="Live search suggestions for products and categories")
def search_suggest(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    term = f"%{q.strip()}%"
    products = (
        db.query(Product)
        .filter(
            Product.status == PublishStatus.published,
            Product.name.ilike(term) | Product.sku.ilike(term),
        )
        .limit(5)
        .all()
    )

    categories = (
        db.query(Category)
        .filter(
            Category.status == PublishStatus.published,
            Category.name.ilike(term),
        )
        .limit(3)
        .all()
    )

    return {
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "sku": p.sku,
                "base_price_paise": p.base_price_paise,
                "primary_image": p.images[0].url if p.images else None,
            }
            for p in products
        ],
        "categories": [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
            }
            for c in categories
        ],
    }


@router.get("/content/seo/{resource_key:path}", include_in_schema=False)
@router.get("/seo/{resource_key:path}", summary="Get public SEO metadata for a path, page slug or product id")
def get_public_seo(
    resource_key: str,
    db: Session = Depends(get_db),
):
    cleaned = resource_key.strip("/").lower()
    if not cleaned:
        cleaned = "home"

    # 1. Check SeoMeta table by resource_id (page or product)
    meta = (
        db.query(SeoMeta)
        .filter(
            (SeoMeta.resource_id == cleaned)
            | (SeoMeta.resource_id == cleaned.replace("/", "-"))
            | (SeoMeta.resource_id == f"page:{cleaned}")
        )
        .first()
    )

    site_name_rec = db.query(WebsiteSetting).filter(WebsiteSetting.key == "site_name").first()
    site_name = site_name_rec.value if site_name_rec and site_name_rec.value else "DisplayDelight"

    if meta and (meta.title or meta.description):
        return {
            "title": meta.title or f"{site_name}",
            "description": meta.description or "",
            "og_image_url": meta.og_image_url or "/p/hero.jpg",
            "canonical_url": meta.canonical_url or "",
            "noindex": meta.noindex,
            "site_name": site_name,
        }

    # 2. Check if product
    product = (
        db.query(Product)
        .filter((Product.id == resource_key) | (Product.slug == cleaned))
        .first()
    )
    if product:
        img = product.images[0].url if product.images and len(product.images) > 0 and hasattr(product.images[0], "url") else "/p/hero.jpg"
        return {
            "title": f"{product.name} | {site_name}",
            "description": product.blurb or product.description or f"Buy {product.name} with custom signage options.",
            "og_image_url": img,
            "canonical_url": f"/product/{product.id}",
            "noindex": False,
            "site_name": site_name,
        }

    # 3. Check if ContentPage
    cp = db.query(ContentPage).filter(ContentPage.slug == cleaned).first()
    if cp:
        return {
            "title": cp.seo_title or f"{cp.title} | {site_name}",
            "description": cp.seo_description or f"{cp.title} at {site_name}",
            "og_image_url": "/p/hero.jpg",
            "canonical_url": f"/{cp.slug}",
            "noindex": False,
            "site_name": site_name,
        }

    # 4. Default fallback
    page_titles = {
        "home": f"{site_name} — Commercial Displays & Custom Signage",
        "shop": f"Commercial Signage Catalogue | {site_name}",
        "about": f"About Us | {site_name}",
        "contact": f"Contact Us | {site_name}",
        "quote": f"Request a Quote | {site_name}",
        "track": f"Track Order | {site_name}",
        "faq": f"Frequently Asked Questions | {site_name}",
        "cart": f"Your Cart | {site_name}",
        "checkout": f"Checkout | {site_name}",
    }

    return {
        "title": page_titles.get(cleaned, f"{cleaned.title()} | {site_name}"),
        "description": "High-impact digital standees, ultra slim light boxes, acrylic LED frames, and bespoke retail signage built for commercial enterprise.",
        "og_image_url": "/p/hero.jpg",
        "canonical_url": f"/{cleaned if cleaned != 'home' else ''}",
        "noindex": False,
        "site_name": site_name,
    }
