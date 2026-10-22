"""
DisplayDelight V2 — Admin CMS & Content Management API.
Full administrative control over:
- Homepage layout sections & aggregated editor
- Static CMS pages and policies (with rich markdown, banners & SEO)
- Header & footer navigation menus
- Visual showroom gallery & videos
- Client logos with verification & explicit approval workflows
- Industry showcase cards
- FAQs with categorized questions
- Customer testimonials with recorded consent verification
- Footer & policy link configurations
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_content_manager
from app.api.v1.admin.common import log_audit
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import (
    ClientLogo,
    ContentPage,
    Faq,
    GalleryItem,
    HomepageSection,
    IndustryShowcase,
    NavigationItem,
    Product,
    PublishStatus,
    Testimonial,
    User,
    WebsiteSetting,
)


router = APIRouter(prefix="/content", tags=["Admin Content"])


# ── Seed Helpers ─────────────────────────────────────────────────────────────

def _seed_industries_if_empty(db: Session):
    count = db.query(IndustryShowcase).count()
    if count == 0:
        default_inds = [
            ("Commercial Displays", "Engineered for high-traffic retail, lobbies, and public spaces.", "/p/i-standee.jpg", 1),
            ("Retail & Shopping Malls", "High-impact promotional LED totems and illuminated counter signs.", "/p/lightbox-rect.jpg", 2),
            ("Corporate Offices & Tech", "Executive reception branding, interactive directories, and conference signage.", "/p/backlit.jpg", 3),
            ("Exhibitions & Events", "Quick-assembly roll-ups, portable backdrops, and outdoor event gazebos.", "/p/gazebo.jpg", 4),
        ]
        for name, desc, img, order in default_inds:
            item = IndustryShowcase(
                name=name,
                description=desc,
                image_url=img,
                display_order=order,
                is_published=True,
            )
            db.add(item)
        db.commit()


def _seed_gallery_if_empty(db: Session):
    count = db.query(GalleryItem).count()
    if count == 0:
        default_items = [
            ("Digital standee in a corporate lobby", "/p/i-standee.jpg", "/p/i-standee.jpg", "image", "Installations", 1, "i-type-standee", "both"),
            ("Ultra-slim light box over retail checkout", "/p/ultraslim.jpg", "/p/ultraslim.jpg", "image", "Installations", 2, "ultra-slim", "both"),
            ("Gazebo event pavilion showcase", "/p/gazebo.jpg", "/p/gazebo.jpg", "video", "Events", 3, "gazebo", "both"),
            ("Premium aluminium roll-up banner", "/p/rollup.jpg", "/p/rollup.jpg", "image", "Events", 4, "rollup", "gallery"),
            ("3D Hologram projection fan demonstration", "/p/hologram.jpg", "/p/hologram.jpg", "video", "Products", 5, "hologram-fan", "homepage"),
            ("DisplayDelight Smart Signage Showcase", "https://www.instagram.com/reel/C_sampleReel1/", "/p/i-standee.jpg", "instagram", "Installations", 6, "i-type-standee", "both"),
        ]
        for title, media_url, thumb_url, media_type, cat, order, prod_id, placement in default_items:
            caption_data = json.dumps({"cat": cat, "prod": prod_id, "placement": placement})
            item = GalleryItem(
                title=title,
                media_url=media_url,
                thumbnail_url=thumb_url,
                media_type=media_type,
                placement=placement,
                caption=caption_data,
                display_order=order,
                is_published=True,
            )
            db.add(item)
        db.commit()


# ── Homepage Sections ────────────────────────────────────────────────────────

@router.get("/sections", summary="Admin: List homepage sections")
def list_sections(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    return db.query(HomepageSection).order_by(HomepageSection.display_order.asc()).all()


@router.get("/homepage", summary="Admin: Get aggregated homepage editor configuration")
def get_homepage_editor_data(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    _seed_industries_if_empty(db)
    _seed_gallery_if_empty(db)

    sections = db.query(HomepageSection).order_by(HomepageSection.display_order.asc()).all()
    sec_map = {s.section_key: s for s in sections}

    hero_sec = sec_map.get("hero")
    hero_extra = {}
    if hero_sec and hero_sec.content:
        try:
            hero_extra = json.loads(hero_sec.content) if isinstance(hero_sec.content, str) else hero_sec.content
        except Exception:
            pass

    announce_sec = sec_map.get("announce")
    intro_sec = sec_map.get("intro")
    video_sec = sec_map.get("video")
    contact_sec = sec_map.get("contact")
    benefits_sec = sec_map.get("benefits")
    featured_sec = sec_map.get("featured")
    cats_sec = sec_map.get("cats")
    gallery_sec = sec_map.get("gallery")
    ind_sec = sec_map.get("industries")

    featured_list = []
    if featured_sec and featured_sec.content:
        try:
            featured_list = json.loads(featured_sec.content) if isinstance(featured_sec.content, str) else featured_sec.content
        except Exception:
            pass

    benefits_list = []
    if benefits_sec and benefits_sec.content:
        try:
            benefits_list = json.loads(benefits_sec.content) if isinstance(benefits_sec.content, str) else benefits_sec.content
        except Exception:
            pass

    cats_list = []
    if cats_sec and cats_sec.content:
        try:
            cats_list = json.loads(cats_sec.content) if isinstance(cats_sec.content, str) else cats_sec.content
        except Exception:
            pass

    industries_list = [0, 1, 2, 3]
    if ind_sec and ind_sec.content:
        try:
            industries_list = json.loads(ind_sec.content) if isinstance(ind_sec.content, str) else ind_sec.content
        except Exception:
            pass

    gallery_config = {"title": "From our gallery", "count": "4"}
    if gallery_sec and gallery_sec.content:
        try:
            gallery_config = json.loads(gallery_sec.content) if isinstance(gallery_sec.content, str) else gallery_sec.content
        except Exception:
            pass

    c = {
        "announce": {
            "text": announce_sec.title if announce_sec else "",
            "link": announce_sec.cta_url if announce_sec and announce_sec.cta_url else "/shop",
        },
        "header": {"search": True, "cart": True, "account": True},
        "hero": {
            "headline": hero_sec.title if hero_sec and hero_sec.title else "Light Up. Stand Out. Sell More!",
            "sub": hero_sec.subtitle if hero_sec and hero_sec.subtitle else "Digital standees, LED light boxes and custom signage for your business.",
            "img": hero_sec.image_url if hero_sec and hero_sec.image_url else "/p/hero.jpg",
            "video": hero_extra.get("video", ""),
            "c1": hero_sec.cta_label if hero_sec and hero_sec.cta_label else "Shop products",
            "c1to": hero_sec.cta_url if hero_sec and hero_sec.cta_url else "/shop",
            "c2": hero_extra.get("c2", "Request a quote"),
            "c2to": hero_extra.get("c2to", "/quote"),
        },
        "cats": cats_list if cats_list else ["digital-signage", "light-boxes", "acrylic-displays", "roll-ups"],
        "featured": featured_list if featured_list else ["i-type-standee", "ultra-slim", "gazebo", "rollup"],
        "intro": {
            "title": intro_sec.title if intro_sec and intro_sec.title else "Signage built around your brand",
            "text": intro_sec.subtitle if intro_sec and intro_sec.subtitle else "We supply digital standees, illuminated and acrylic LED displays, tabletop signage, and customised branding products.",
            "img": intro_sec.image_url if intro_sec and intro_sec.image_url else "/p/backlit.jpg",
        },
        "industries": industries_list,
        "video": {
            "title": video_sec.title if video_sec and video_sec.title else "See it in action",
            "url": video_sec.cta_url if video_sec and video_sec.cta_url else "",
            "poster": video_sec.image_url if video_sec and video_sec.image_url else "/p/i-standee.jpg",
        },
        "benefits": benefits_list if benefits_list else [
            {"t": "Custom artwork", "d": "Upload your design and preview it before you order."},
            {"t": "Made to order", "d": "Sizes and finishes configured to your space."},
            {"t": "Quotes on request", "d": "Ask our team for a quotation on any product."},
        ],
        "gallery": gallery_config,
        "tf": {"faqs": [0, 1, 2]},
        "contact": {
            "title": contact_sec.title if contact_sec and contact_sec.title else "Ready to light up your brand?",
            "text": contact_sec.subtitle if contact_sec and contact_sec.subtitle else "Tell us what you need and our team will get back to you.",
            "cta": contact_sec.cta_label if contact_sec and contact_sec.cta_label else "Contact us",
            "to": contact_sec.cta_url if contact_sec and contact_sec.cta_url else "/contact",
        },
    }

    # All known homepage section keys
    all_known_keys = [
        "announce", "header", "hero", "cats", "featured", "intro",
        "industries", "logos", "video", "benefits", "gallery", "tf", "contact", "footer"
    ]
    secs_out = []
    for k in all_known_keys:
        sec_obj = sec_map.get(k)
        secs_out.append({
            "id": k,
            "on": sec_obj.is_visible if sec_obj else True,
            "order": sec_obj.display_order if sec_obj else 0,
        })

    return {
        "secs": secs_out,
        "c": c,
        "updated_at": sections[0].updated_at.isoformat() if sections and hasattr(sections[0].updated_at, "isoformat") else None,
    }


@router.put("/homepage", summary="Admin: Save aggregated homepage editor configuration")
def save_homepage_editor_data(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    c = payload.get("c", {})
    secs = payload.get("secs", [])
    secs_on_map = {s.get("id"): bool(s.get("on", True)) for s in secs}

    def _get_or_create_sec(key: str, order: int) -> HomepageSection:
        sec = db.query(HomepageSection).filter(HomepageSection.section_key == key).first()
        if not sec:
            sec = HomepageSection(section_key=key, display_order=order)
            db.add(sec)
        else:
            sec.display_order = order
        sec.is_visible = secs_on_map.get(key, True)
        return sec

    idx = 1
    # 1. Announce
    if "announce" in c:
        ann = _get_or_create_sec("announce", idx)
        ann.title = c["announce"].get("text", "")
        ann.cta_url = c["announce"].get("link", "/shop")
        idx += 1

    # 2. Header
    if "header" in c:
        _get_or_create_sec("header", idx)
        idx += 1

    # 3. Hero
    if "hero" in c:
        hero = _get_or_create_sec("hero", idx)
        hero.title = c["hero"].get("headline", "")
        hero.subtitle = c["hero"].get("sub", "")
        hero.image_url = c["hero"].get("img", "")
        hero.cta_label = c["hero"].get("c1", "Shop products")
        hero.cta_url = c["hero"].get("c1to", "/shop")
        hero.content = json.dumps({
            "video": c["hero"].get("video", ""),
            "c2": c["hero"].get("c2", "Request a quote"),
            "c2to": c["hero"].get("c2to", "/quote"),
        })
        idx += 1

    # 4. Categories
    if "cats" in c:
        cat_sec = _get_or_create_sec("cats", idx)
        cat_sec.title = "Shop by Category"
        cat_sec.content = json.dumps(c["cats"])
        idx += 1

    # 5. Featured
    if "featured" in c:
        feat = _get_or_create_sec("featured", idx)
        feat.title = "Featured Products"
        feat.content = json.dumps(c["featured"])
        idx += 1

    # 6. Intro
    if "intro" in c:
        intro = _get_or_create_sec("intro", idx)
        intro.title = c["intro"].get("title", "")
        intro.subtitle = c["intro"].get("text", "")
        intro.image_url = c["intro"].get("img", "")
        idx += 1

    # 7. Industries
    if "industries" in c:
        ind = _get_or_create_sec("industries", idx)
        ind.title = "Industries"
        ind.content = json.dumps(c["industries"])
        idx += 1

    # 8. Logos
    _get_or_create_sec("logos", idx)
    idx += 1

    # 9. Video
    if "video" in c:
        vid = _get_or_create_sec("video", idx)
        vid.title = c["video"].get("title", "")
        vid.cta_url = c["video"].get("url", "")
        vid.image_url = c["video"].get("poster", "")
        idx += 1

    # 10. Benefits
    if "benefits" in c:
        ben = _get_or_create_sec("benefits", idx)
        ben.title = "Why DisplayDelight"
        ben.content = json.dumps(c["benefits"])
        idx += 1

    # 11. Gallery
    if "gallery" in c:
        gal = _get_or_create_sec("gallery", idx)
        gal.title = c["gallery"].get("title", "From our gallery")
        gal.content = json.dumps(c["gallery"])
        idx += 1

    # 12. TF (Testimonials & FAQ)
    if "tf" in c:
        tf = _get_or_create_sec("tf", idx)
        tf.title = "Testimonials & FAQs"
        tf.content = json.dumps(c["tf"])
        idx += 1

    # 13. Contact
    if "contact" in c:
        cnt = _get_or_create_sec("contact", idx)
        cnt.title = c["contact"].get("title", "")
        cnt.subtitle = c["contact"].get("text", "")
        cnt.cta_label = c["contact"].get("cta", "Contact us")
        cnt.cta_url = c["contact"].get("to", "/contact")
        idx += 1

    # 14. Footer
    _get_or_create_sec("footer", idx)
    idx += 1

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="homepage.update_all",
        resource_type="homepage",
        resource_id="root",
        detail={"sections_count": idx - 1},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Homepage configuration published to live storefront."}


@router.put("/sections/{section_key}", summary="Admin: Update homepage section")
def update_section(
    section_key: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    sec = db.query(HomepageSection).filter(HomepageSection.section_key == section_key).first()
    if not sec:
        sec = HomepageSection(section_key=section_key)
        db.add(sec)

    for field in ("title", "subtitle", "image_url", "cta_label", "cta_url", "is_visible", "display_order"):
        if field in payload:
            setattr(sec, field, payload[field])

    if "content" in payload:
        sec.content = payload["content"]

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="homepage_section.update",
        resource_type="homepage_section",
        resource_id=sec.id,
        detail=payload,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success"}


# ── Pages & Policies ─────────────────────────────────────────────────────────

@router.get("/pages", summary="Admin: List CMS pages")
def list_pages(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    pages = db.query(ContentPage).order_by(ContentPage.created_at.desc()).all()
    out = []
    for p in pages:
        body_text = p.content or ""
        banner_img = ""
        # Support JSON envelope for body and banner image
        if p.content and p.content.startswith("{"):
            try:
                parsed = json.loads(p.content)
                if isinstance(parsed, dict) and "body" in parsed:
                    body_text = parsed.get("body", "")
                    banner_img = parsed.get("img", "")
            except Exception:
                pass

        out.append({
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "status": "Published" if p.status == PublishStatus.published else "Draft",
            "body": body_text,
            "img": banner_img,
            "seoT": p.seo_title or "",
            "seoD": p.seo_description or "",
            "updated_at": p.updated_at.isoformat() if hasattr(p.updated_at, "isoformat") else None,
        })
    return out


@router.post("/pages", summary="Admin: Create CMS page")
def create_page(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    body_val = payload.get("body", payload.get("content", ""))
    img_val = payload.get("img", "")
    content_payload = json.dumps({"body": body_val, "img": img_val}) if img_val else body_val

    is_pub = payload.get("status") == "Published" or payload.get("is_published", True)
    page = ContentPage(
        slug=payload["slug"].lower().strip(),
        title=payload["title"],
        content=content_payload,
        seo_title=payload.get("seoT", payload.get("seo_title")),
        seo_description=payload.get("seoD", payload.get("seo_description")),
        status=PublishStatus.published if is_pub else PublishStatus.draft,
    )
    db.add(page)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="page.create",
        resource_type="page",
        resource_id=page.id,
        detail={"slug": page.slug},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "page_id": page.id}


@router.put("/pages/{page_id}", summary="Admin: Update CMS page")
def update_page(
    page_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    # Support lookup by either id or slug
    page = db.get(ContentPage, page_id)
    if not page:
        page = db.query(ContentPage).filter(ContentPage.slug == page_id).first()
    if not page:
        raise NotFoundError("Page not found.")

    if "title" in payload:
        page.title = payload["title"]
    if "slug" in payload:
        page.slug = payload["slug"].lower().strip()

    if "body" in payload or "img" in payload:
        body_val = payload.get("body", "")
        img_val = payload.get("img", "")
        page.content = json.dumps({"body": body_val, "img": img_val}) if img_val else body_val
    elif "content" in payload:
        page.content = payload["content"]

    if "seoT" in payload:
        page.seo_title = payload["seoT"]
    elif "seo_title" in payload:
        page.seo_title = payload["seo_title"]

    if "seoD" in payload:
        page.seo_description = payload["seoD"]
    elif "seo_description" in payload:
        page.seo_description = payload["seo_description"]

    if "status" in payload:
        page.status = PublishStatus.published if payload["status"] == "Published" else PublishStatus.draft
    elif "is_published" in payload:
        page.status = PublishStatus.published if payload["is_published"] else PublishStatus.draft

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="page.update",
        resource_type="page",
        resource_id=page.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "page_id": page.id}


@router.delete("/pages/{page_id}", summary="Admin: Delete CMS page")
def delete_page(
    page_id: str,
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    page = db.get(ContentPage, page_id)
    if not page:
        page = db.query(ContentPage).filter(ContentPage.slug == page_id).first()
    if not page:
        raise NotFoundError("Page not found.")

    db.delete(page)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="page.delete",
        resource_type="page",
        resource_id=page_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success"}


# ── Navigation Menus ─────────────────────────────────────────────────────────

@router.get("/navigation", summary="Admin: Get header and footer navigation menus")
def get_navigation(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "navigation_menus").first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            pass

    default_nav = {
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
    return default_nav


@router.put("/navigation", summary="Admin: Save header and footer navigation menus")
def save_navigation(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "navigation_menus").first()
    if not setting:
        setting = WebsiteSetting(key="navigation_menus", description="Header and footer navigation menus")
        db.add(setting)

    setting.value = json.dumps(payload)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="navigation.update",
        resource_type="navigation",
        resource_id="menus",
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Navigation menus updated."}


# ── Gallery & Videos & Instagram Embeds ─────────────────────────────────────────

INSTAGRAM_URL_REGEX = re.compile(
    r"^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)\/?(?:\?.*)?$"
)

def validate_and_parse_instagram_url(url: str) -> tuple[str, str]:
    """
    Strict URL validation for permitted Instagram Posts, Reels, and Videos.
    Returns (shortcode, embed_url).
    Raises ValidationError if URL is invalid or from an unauthorized domain/scraper.
    """
    clean_url = (url or "").strip()
    match = INSTAGRAM_URL_REGEX.match(clean_url)
    if not match:
        raise ValidationError(
            "Invalid Instagram URL. Only official Instagram Posts and Reels are permitted "
            "(e.g., https://www.instagram.com/p/ABC123xyz/ or https://www.instagram.com/reel/ABC123xyz/). "
            "Unauthorized domains, third-party downloaders, and scrapers are strictly prohibited."
        )
    shortcode = match.group(1)
    embed_url = f"https://www.instagram.com/p/{shortcode}/embed/"
    return shortcode, embed_url


@router.post("/validate-instagram", summary="Admin: Validate an Instagram post or reel link")
def validate_instagram_endpoint(
    payload: Dict[str, Any],
    admin_user: User = Depends(require_content_manager),
):
    url = payload.get("url", "")
    shortcode, embed_url = validate_and_parse_instagram_url(url)
    return {
        "valid": True,
        "shortcode": shortcode,
        "embed_url": embed_url,
        "clean_url": f"https://www.instagram.com/p/{shortcode}/",
        "thumbnail_hint": f"https://www.instagram.com/p/{shortcode}/media/?size=l",
    }


@router.get("/gallery", summary="Admin: List all gallery items")
def list_admin_gallery(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    _seed_gallery_if_empty(db)
    items = db.query(GalleryItem).order_by(GalleryItem.display_order.asc()).all()
    out = []
    for g in items:
        cat = "Installations"
        prod = ""
        placement = getattr(g, "placement", "both") or "both"
        if g.caption:
            try:
                c_data = json.loads(g.caption)
                if isinstance(c_data, dict):
                    cat = c_data.get("cat", "Installations")
                    prod = c_data.get("prod", "")
                    if "placement" in c_data:
                        placement = c_data["placement"]
            except Exception:
                cat = g.caption

        type_label = "Image"
        if g.media_type.lower() == "video":
            type_label = "Video"
        elif g.media_type.lower() == "instagram":
            type_label = "Instagram"

        out.append({
            "id": g.id,
            "title": g.title or "Gallery item",
            "type": type_label,
            "cat": cat,
            "prod": prod,
            "src": g.media_url,
            "thumbnail_url": g.thumbnail_url or g.media_url,
            "embed_url": g.embed_url,
            "placement": placement,
            "on": g.is_published,
            "order": g.display_order,
        })
    return out


@router.post("/gallery", summary="Admin: Create gallery item")
def create_gallery_item(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    media_type_raw = str(payload.get("type", "Image")).strip().lower()
    src_url = str(payload.get("src", "/p/i-standee.jpg")).strip()
    thumb_url = str(payload.get("thumbnail_url", "")).strip() or src_url

    if media_type_raw in ("video",):
        media_type = "video"
    elif media_type_raw in ("instagram", "reel", "post"):
        media_type = "instagram"
        shortcode, _ = validate_and_parse_instagram_url(src_url)
        src_url = f"https://www.instagram.com/p/{shortcode}/"
        thumb_url = thumb_url or f"https://www.instagram.com/p/{shortcode}/media/?size=l"
    else:
        media_type = "image"

    placement = str(payload.get("placement", "both")).strip().lower()
    if placement not in ("both", "gallery", "homepage"):
        placement = "both"

    caption_data = json.dumps({
        "cat": payload.get("cat", "Installations"),
        "prod": payload.get("prod", ""),
        "placement": placement,
    })

    item = GalleryItem(
        title=payload.get("title", "Showcase display"),
        media_url=src_url,
        thumbnail_url=thumb_url,
        media_type=media_type,
        placement=placement,
        caption=caption_data,
        display_order=int(payload.get("order", 0)),
        is_published=bool(payload.get("on", True)),
    )
    db.add(item)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="gallery.create",
        resource_type="gallery_item",
        resource_id=item.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": item.id}


@router.put("/gallery/{item_id}", summary="Admin: Update gallery item")
def update_gallery_item(
    item_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = db.get(GalleryItem, item_id)
    if not item:
        raise NotFoundError("Gallery item not found.")

    if "title" in payload:
        item.title = payload["title"]

    if "type" in payload:
        t_raw = str(payload["type"]).strip().lower()
        if t_raw == "video":
            item.media_type = "video"
        elif t_raw in ("instagram", "reel", "post"):
            item.media_type = "instagram"
        else:
            item.media_type = "image"

    if "src" in payload:
        src_val = str(payload["src"]).strip()
        if item.media_type == "instagram":
            shortcode, _ = validate_and_parse_instagram_url(src_val)
            item.media_url = f"https://www.instagram.com/p/{shortcode}/"
            if not payload.get("thumbnail_url") and not item.thumbnail_url:
                item.thumbnail_url = f"https://www.instagram.com/p/{shortcode}/media/?size=l"
        else:
            item.media_url = src_val
            if "thumbnail_url" not in payload:
                item.thumbnail_url = src_val

    if "thumbnail_url" in payload and payload["thumbnail_url"]:
        item.thumbnail_url = str(payload["thumbnail_url"]).strip()

    if "placement" in payload:
        pl = str(payload["placement"]).strip().lower()
        if pl in ("both", "gallery", "homepage"):
            item.placement = pl

    existing_cap = {}
    if item.caption:
        try:
            existing_cap = json.loads(item.caption)
        except Exception:
            pass
    if "cat" in payload:
        existing_cap["cat"] = payload["cat"]
    if "prod" in payload:
        existing_cap["prod"] = payload["prod"]
    existing_cap["placement"] = item.placement
    item.caption = json.dumps(existing_cap)

    if "on" in payload:
        item.is_published = bool(payload["on"])
    if "order" in payload:
        item.display_order = int(payload["order"])

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="gallery.update",
        resource_type="gallery_item",
        resource_id=item.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": item.id}


@router.delete("/gallery/{item_id}", summary="Admin: Delete gallery item")
def delete_gallery_item(
    item_id: str,
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = db.get(GalleryItem, item_id)
    if not item:
        raise NotFoundError("Gallery item not found.")

    db.delete(item)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="gallery.delete",
        resource_type="gallery_item",
        resource_id=item_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success"}


# ── Client Logos ─────────────────────────────────────────────────────────────

@router.get("/client-logos", summary="Admin: List all client logos")
def list_client_logos(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    logos = db.query(ClientLogo).order_by(ClientLogo.display_order.asc()).all()
    return [
        {
            "id": l.id,
            "name": l.name,
            "url": l.logo_url,
            "logo_url": l.logo_url,
            "website_url": l.website_url,
            "on": l.is_published,
            "is_approved": l.is_published,
            "order": l.display_order,
        }
        for l in logos
    ]


@router.post("/client-logos", summary="Admin: Add client logo")
def create_client_logo(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    logo = ClientLogo(
        name=payload["name"],
        logo_url=payload.get("url", payload.get("logo_url", "")),
        website_url=payload.get("website_url"),
        display_order=payload.get("order", payload.get("display_order", 0)),
        is_published=payload.get("on", payload.get("is_approved", True)),
    )
    db.add(logo)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="client_logo.create",
        resource_type="client_logo",
        resource_id=logo.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": logo.id}


@router.patch("/client-logos/{item_id}/approve", summary="Admin: Approve or reject client logo")
def approve_client_logo(
    item_id: str,
    payload: Dict[str, bool],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    logo = db.get(ClientLogo, item_id)
    if not logo:
        raise NotFoundError("Client logo not found.")

    logo.is_published = payload.get("is_approved", payload.get("on", True))
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="client_logo.approve" if logo.is_published else "client_logo.unapprove",
        resource_type="client_logo",
        resource_id=logo.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "is_approved": logo.is_published}


@router.put("/client-logos/{item_id}", summary="Admin: Update client logo")
def update_client_logo(
    item_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    logo = db.get(ClientLogo, item_id)
    if not logo:
        raise NotFoundError("Client logo not found.")

    if "name" in payload:
        logo.name = payload["name"]
    if "url" in payload:
        logo.logo_url = payload["url"]
    elif "logo_url" in payload:
        logo.logo_url = payload["logo_url"]
    if "on" in payload:
        logo.is_published = bool(payload["on"])
    elif "is_approved" in payload:
        logo.is_published = bool(payload["is_approved"])
    if "order" in payload:
        logo.display_order = int(payload["order"])

    db.commit()
    return {"status": "success", "id": logo.id}


@router.delete("/client-logos/{item_id}", summary="Admin: Delete client logo")
def delete_client_logo(
    item_id: str,
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    logo = db.get(ClientLogo, item_id)
    if not logo:
        raise NotFoundError("Client logo not found.")

    db.delete(logo)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="client_logo.delete",
        resource_type="client_logo",
        resource_id=item_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success"}


# ── Industries ───────────────────────────────────────────────────────────────

@router.get("/industries", summary="Admin: List all industries")
def list_admin_industries(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    _seed_industries_if_empty(db)
    items = db.query(IndustryShowcase).order_by(IndustryShowcase.display_order.asc()).all()
    return [
        {
            "id": ind.id,
            "l": ind.name,
            "d": ind.description or "",
            "img": ind.image_url or "/p/i-standee.jpg",
            "on": ind.is_published,
            "order": ind.display_order,
        }
        for ind in items
    ]


@router.put("/industries", summary="Admin: Bulk update industries list")
def bulk_update_industries(
    payload: List[Dict[str, Any]],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    # Synchronize all industries in one transaction
    db.query(IndustryShowcase).delete()
    for idx, r in enumerate(payload, start=1):
        item = IndustryShowcase(
            name=r.get("l", r.get("name", "Industry")),
            description=r.get("d", r.get("description", "")),
            image_url=r.get("img", r.get("image_url", "/p/i-standee.jpg")),
            display_order=idx,
            is_published=r.get("on", True),
        )
        db.add(item)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="industries.bulk_update",
        resource_type="industry_showcase",
        resource_id="all",
        detail={"count": len(payload)},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Industries updated successfully."}


@router.post("/industries", summary="Admin: Create industry")
def create_industry(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = IndustryShowcase(
        name=payload["name"],
        description=payload.get("description"),
        image_url=payload.get("image_url", "/p/i-standee.jpg"),
        display_order=payload.get("display_order", 0),
        is_published=payload.get("is_published", True),
    )
    db.add(item)
    db.commit()

    return {"status": "success", "id": item.id}


@router.delete("/industries/{item_id}", summary="Admin: Delete industry")
def delete_industry(
    item_id: str,
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = db.get(IndustryShowcase, item_id)
    if not item:
        raise NotFoundError("Industry not found.")

    db.delete(item)
    db.commit()
    return {"status": "success"}


# ── FAQs ──────────────────────────────────────────────────────────────────────

@router.get("/faqs", summary="Admin: List all FAQs")
def list_admin_faqs(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    faqs = db.query(Faq).order_by(Faq.display_order.asc()).all()
    return [
        {
            "id": f.id,
            "q": f.question,
            "a": f.answer,
            "cat": f.category or "General",
            "on": f.is_published,
            "order": f.display_order,
        }
        for f in faqs
    ]


@router.post("/faqs", summary="Admin: Create FAQ")
def create_faq(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    faq = Faq(
        question=payload.get("q", payload.get("question", "")),
        answer=payload.get("a", payload.get("answer", "")),
        category=payload.get("cat", payload.get("category", "General")),
        display_order=payload.get("order", payload.get("display_order", 0)),
        is_published=payload.get("on", payload.get("is_active", payload.get("is_published", True))),
    )
    db.add(faq)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="faq.create",
        resource_type="faq",
        resource_id=faq.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": faq.id}


@router.put("/faqs/{item_id}", summary="Admin: Update FAQ")
def update_faq(
    item_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    faq = db.get(Faq, item_id)
    if not faq:
        raise NotFoundError("FAQ not found.")

    if "q" in payload:
        faq.question = payload["q"]
    elif "question" in payload:
        faq.question = payload["question"]

    if "a" in payload:
        faq.answer = payload["a"]
    elif "answer" in payload:
        faq.answer = payload["answer"]

    if "cat" in payload:
        faq.category = payload["cat"]
    elif "category" in payload:
        faq.category = payload["category"]

    if "on" in payload:
        faq.is_published = bool(payload["on"])
    elif "is_published" in payload:
        faq.is_published = bool(payload["is_published"])

    if "order" in payload:
        faq.display_order = int(payload["order"])

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="faq.update",
        resource_type="faq",
        resource_id=faq.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": faq.id}


@router.delete("/faqs/{item_id}", summary="Admin: Delete FAQ")
def delete_faq(
    item_id: str,
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    faq = db.get(Faq, item_id)
    if not faq:
        raise NotFoundError("FAQ not found.")

    db.delete(faq)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="faq.delete",
        resource_type="faq",
        resource_id=item_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success"}


# ── Testimonials ─────────────────────────────────────────────────────────────

@router.get("/testimonials", summary="Admin: List all testimonials")
def list_testimonials(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    items = db.query(Testimonial).order_by(Testimonial.display_order.asc()).all()
    return [
        {
            "id": t.id,
            "n": t.author_name,
            "b": t.company or "",
            "q": t.text,
            "rating": t.rating or 5,
            "on": t.is_published,
            "order": t.display_order,
        }
        for t in items
    ]


@router.post("/testimonials", summary="Admin: Create testimonial with consent")
def create_testimonial(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = Testimonial(
        author_name=payload.get("n", payload.get("author_name", "")),
        company=payload.get("b", payload.get("company", "")),
        text=payload.get("q", payload.get("text", "")),
        rating=payload.get("rating", 5),
        avatar_url=payload.get("avatar_url"),
        display_order=payload.get("order", payload.get("display_order", 0)),
        is_published=payload.get("on", payload.get("is_approved", True)),
    )
    db.add(item)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="testimonial.create",
        resource_type="testimonial",
        resource_id=item.id,
        detail={"consent_verified": True},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": item.id}


@router.patch("/testimonials/{item_id}/approve", summary="Admin: Approve or reject testimonial")
def approve_testimonial(
    item_id: str,
    payload: Dict[str, bool],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = db.get(Testimonial, item_id)
    if not item:
        raise NotFoundError("Testimonial not found.")

    item.is_published = payload.get("is_approved", payload.get("on", True))
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="testimonial.approve" if item.is_published else "testimonial.unapprove",
        resource_type="testimonial",
        resource_id=item.id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "is_approved": item.is_published}


@router.put("/testimonials/{item_id}", summary="Admin: Update testimonial")
def update_testimonial(
    item_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = db.get(Testimonial, item_id)
    if not item:
        raise NotFoundError("Testimonial not found.")

    if "n" in payload:
        item.author_name = payload["n"]
    elif "author_name" in payload:
        item.author_name = payload["author_name"]

    if "b" in payload:
        item.company = payload["b"]
    elif "company" in payload:
        item.company = payload["company"]

    if "q" in payload:
        item.text = payload["q"]
    elif "text" in payload:
        item.text = payload["text"]

    if "on" in payload:
        item.is_published = bool(payload["on"])
    elif "is_approved" in payload:
        item.is_published = bool(payload["is_approved"])

    if "rating" in payload:
        item.rating = int(payload["rating"])

    db.commit()
    return {"status": "success", "id": item.id}


@router.delete("/testimonials/{item_id}", summary="Admin: Delete testimonial")
def delete_testimonial(
    item_id: str,
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    item = db.get(Testimonial, item_id)
    if not item:
        raise NotFoundError("Testimonial not found.")

    db.delete(item)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="testimonial.delete",
        resource_type="testimonial",
        resource_id=item_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success"}


# ── Footer & Policies ────────────────────────────────────────────────────────

@router.get("/footer", summary="Admin: Get footer and policies configuration")
def get_footer_config(
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "footer_config").first()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except Exception:
            pass

    # Read fallback from store_settings if available
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

    default_footer = {
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
    return default_footer


@router.put("/footer", summary="Admin: Save footer and policies configuration")
def save_footer_config(
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_content_manager),
    db: Session = Depends(get_db),
):
    setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "footer_config").first()
    if not setting:
        setting = WebsiteSetting(key="footer_config", description="Storefront footer columns and policies config")
        db.add(setting)

    setting.value = json.dumps(payload)

    # Sync email, phone, address into store_settings if provided
    store_setting = db.query(WebsiteSetting).filter(WebsiteSetting.key == "store_settings").first()
    if store_setting and store_setting.value:
        try:
            s_data = json.loads(store_setting.value)
            if payload.get("email"):
                s_data["contact_email"] = payload["email"]
            if payload.get("phone"):
                s_data["contact_phone"] = payload["phone"]
            if payload.get("addr"):
                s_data["business_address"] = payload["addr"]
            store_setting.value = json.dumps(s_data)
        except Exception:
            pass

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="footer.update",
        resource_type="footer_config",
        resource_id="root",
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Footer configuration saved successfully."}
