"""
DisplayDelight V2 — Admin Media Library API.
Central asset repository for storefront hero banners, gallery showcases, product media,
and video clips with real disk persistence and metadata editing.
"""
from __future__ import annotations

import os
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_admin
from app.api.v1.admin.common import log_audit
from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.models.models import MediaAsset, Product, User, WebsiteSetting
from app.services.storage import sanitize_filename

router = APIRouter(prefix="/media", tags=["Admin Media"])

# Initial curated seed assets when library is fresh
SEED_ASSETS = [
    {"name": "hero-signage-display.jpg", "url": "/p/hero.jpg", "media_type": "image", "mime": "image/jpeg", "dims": "1920 × 1080", "size": 245000, "title": "Storefront Hero LED", "tags": "hero, banner, exterior"},
    {"name": "digital-standee-commercial.jpg", "url": "/p/standee.jpg", "media_type": "image", "mime": "image/jpeg", "dims": "1200 × 1600", "size": 185000, "title": "Digital Standee 55-inch", "tags": "standee, digital, retail"},
    {"name": "ultra-slim-lightbox.jpg", "url": "/p/lightbox.jpg", "media_type": "image", "mime": "image/jpeg", "dims": "1600 × 1200", "size": 192000, "title": "Ultra Slim Snap Lightbox", "tags": "lightbox, slim, wall"},
    {"name": "acrylic-card-stand.jpg", "url": "/p/acrylic.jpg", "media_type": "image", "mime": "image/jpeg", "dims": "1200 × 1200", "size": 142000, "title": "Counter Acrylic Card Stand", "tags": "tabletop, acrylic, qsr"},
    {"name": "rollup-fabric-banner.jpg", "url": "/p/rollup.jpg", "media_type": "image", "mime": "image/jpeg", "dims": "1200 × 1800", "size": 210000, "title": "Retractable Rollup Banner", "tags": "rollup, portable, expo"},
    {"name": "crystal-frameless-frame.jpg", "url": "/p/crystal.jpg", "media_type": "image", "mime": "image/jpeg", "dims": "1400 × 1400", "size": 178000, "title": "Crystal Edge LED Frame", "tags": "crystal, frameless, luxury"},
    {"name": "hologram-3d-fan.jpg", "url": "/p/hologram.jpg", "media_type": "image", "mime": "image/jpeg", "dims": "1920 × 1080", "size": 320000, "title": "3D Hologram Fan Showcase", "tags": "3d, hologram, innovation"},
    {"name": "commercial-showcase-clip.mp4", "url": "/p/hologram.jpg", "media_type": "video", "mime": "video/mp4", "dims": "1920 × 1080", "size": 14200000, "title": "Retail Signage Demo Video", "tags": "video, demo, showcase"},
]


def _ensure_seed_media(db: Session):
    count = db.query(MediaAsset).count()
    if count == 0:
        for sa in SEED_ASSETS:
            rec = MediaAsset(
                filename=sa["name"],
                url=sa["url"],
                mime_type=sa["mime"],
                media_type=sa["media_type"],
                size_bytes=sa["size"],
                dimensions=sa["dims"],
                title=sa["title"],
                alt_text=sa["title"],
                tags=sa["tags"],
                is_published=True,
            )
            db.add(rec)
        db.commit()


@router.get("", summary="Admin: List media library assets")
def list_media(
    type: Optional[str] = Query(None, description="'all', 'images', 'videos'"),
    q: Optional[str] = Query(None, description="Search keyword"),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _ensure_seed_media(db)

    query = db.query(MediaAsset).order_by(MediaAsset.created_at.desc())

    if type and type != "all":
        target_kind = "video" if "video" in type.lower() else "image"
        query = query.filter(MediaAsset.media_type == target_kind)

    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            (MediaAsset.filename.ilike(term))
            | (MediaAsset.title.ilike(term))
            | (MediaAsset.tags.ilike(term))
            | (MediaAsset.alt_text.ilike(term))
        )

    assets = query.all()

    return [
        {
            "id": a.id,
            "name": a.filename,
            "src": a.url,
            "type": "Video" if a.media_type == "video" else "Image",
            "dims": a.dimensions or "1600 × 1200",
            "size": f"{round(a.size_bytes / 1024)} KB" if a.size_bytes > 0 else "—",
            "size_bytes": a.size_bytes,
            "alt": a.alt_text or "",
            "title": a.title or "",
            "tags": a.tags or "",
            "pub": a.is_published,
            "st": "ready",
            "pr": 100,
            "created_at": str(a.created_at),
        }
        for a in assets
    ]


@router.post("/upload", summary="Admin: Upload image or video asset to Media Library")
async def upload_media_asset(
    file: UploadFile = File(...),
    request: Request = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    content = await file.read()
    size_bytes = len(content)

    if size_bytes > 50 * 1024 * 1024:
        raise ValidationError("File size exceeds 50 MB maximum limit.")

    file_id = f"med_{uuid.uuid4().hex[:12]}"
    clean_name = sanitize_filename(file.filename or "media_upload.png")
    stored_name = f"{file_id}_{clean_name}"

    content_type = file.content_type or "image/png"
    from app.services.storage import ALLOWED_MEDIA_MIMES, check_svg_content, storage_manager, validate_upload_request

    # Validate file type and extension against ALLOWED_MEDIA_MIMES
    validate_upload_request(
        clean_name,
        content_type,
        size_bytes,
        max_bytes=50 * 1024 * 1024,
        allowed_mimes=ALLOWED_MEDIA_MIMES,
    )

    # SVG script check
    if content_type == "image/svg+xml" or clean_name.lower().endswith(".svg"):
        if not check_svg_content(content):
            raise ValidationError("SVG contains disallowed executable scripts or event handlers.")

    is_video = (
        content_type.startswith("video/")
        or clean_name.lower().endswith((".mp4", ".webm", ".mov"))
    )
    media_type = "video" if is_video else "image"

    storage_manager.save_direct_upload(content, stored_name, content_type)

    cdn_host = (
        db.query(WebsiteSetting)
        .filter(WebsiteSetting.key == "storage_images_cdn")
        .first()
    )
    if cdn_host and cdn_host.value and not is_video:
        public_url = f"https://{cdn_host.value.rstrip('/')}/{stored_name}"
    else:
        public_url = f"/uploads/{stored_name}"

    dims = "1920 × 1080" if is_video else "1600 × 1200"

    asset = MediaAsset(
        id=file_id,
        filename=clean_name,
        url=public_url,
        mime_type=content_type,
        media_type=media_type,
        size_bytes=size_bytes,
        dimensions=dims,
        title=clean_name.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title(),
        alt_text=clean_name,
        tags="upload, storefront",
        is_published=True,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    log_audit(
        db=db,
        actor=admin_user,
        action="media.upload",
        resource_type="media_asset",
        resource_id=asset.id,
        detail={"filename": clean_name, "size": size_bytes, "type": media_type},
        ip_address=request.client.host if request and request.client else None,
    )

    return {
        "id": asset.id,
        "name": asset.filename,
        "src": asset.url,
        "type": "Video" if asset.media_type == "video" else "Image",
        "dims": asset.dimensions,
        "size": f"{round(asset.size_bytes / 1024)} KB",
        "alt": asset.alt_text,
        "title": asset.title,
        "tags": asset.tags,
        "pub": asset.is_published,
        "st": "ready",
        "pr": 100,
    }


@router.patch("/{item_id}", summary="Admin: Update media metadata")
def update_media_asset(
    item_id: str,
    payload: Dict[str, Any],
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    asset = db.get(MediaAsset, item_id)
    if not asset:
        raise NotFoundError("Media asset not found.")

    if "title" in payload:
        asset.title = payload["title"]
    if "alt" in payload or "alt_text" in payload:
        asset.alt_text = payload.get("alt") or payload.get("alt_text")
    if "tags" in payload:
        asset.tags = payload["tags"]
    if "pub" in payload or "is_published" in payload:
        v = payload.get("pub") if "pub" in payload else payload.get("is_published")
        asset.is_published = bool(v)

    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="media.update",
        resource_type="media_asset",
        resource_id=asset.id,
        detail={"title": asset.title, "tags": asset.tags, "pub": asset.is_published},
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "id": asset.id}


@router.delete("/{item_id}", summary="Admin: Delete media asset")
def delete_media_asset(
    item_id: str,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    asset = db.get(MediaAsset, item_id)
    if not asset:
        raise NotFoundError("Media asset not found.")

    # Remove local file if stored locally
    if asset.url.startswith("/uploads/"):
        fname = asset.url.replace("/uploads/", "")
        local_path = os.path.join(settings.UPLOAD_DIR, fname)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception:
                pass

    db.delete(asset)
    db.commit()

    log_audit(
        db=db,
        actor=admin_user,
        action="media.delete",
        resource_type="media_asset",
        resource_id=item_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"status": "success", "message": "Media item deleted."}
