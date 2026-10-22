"""
DisplayDelight V2 — File & Artwork Uploads API.
Supports:
- Presigned upload issuance (/sign)
- Local direct multipart upload fallback (/direct/{id})
- Upload completion hook (/complete)
- Short-lived signed download URLs (/view and /{id}/url)
- File security checks (MIME validation, SVG script inspection)
"""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, get_optional_current_user
from app.core.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.models.models import ArtworkUpload, User
from app.schemas.schemas import UploadOut
from app.services.storage import (
    check_svg_content,
    generate_presigned_upload_url,
    generate_signed_view_url,
    sanitize_filename,
    validate_upload_request,
    verify_signed_view_url,
)


router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.get("/status", summary="Get storage provider status and fallback mode")
def get_storage_status(db: Session = Depends(get_db)):
    from app.services.storage import storage_manager
    return storage_manager.get_status(db)


@router.post("/artwork", summary="Direct single-call multipart artwork upload")
async def upload_artwork_direct(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    import uuid
    content = await file.read()
    size_bytes = len(content)
    clean_name = sanitize_filename(file.filename or "artwork.png")
    content_type = file.content_type or "image/png"

    # Strict MIME and size validation
    validate_upload_request(clean_name, content_type, size_bytes)

    # Reject executable scripts in SVG
    if content_type == "image/svg+xml" or clean_name.lower().endswith(".svg"):
        if not check_svg_content(content):
            raise ValidationError("SVG contains disallowed executable scripts or event handlers.")

    file_id = f"art_{uuid.uuid4().hex[:12]}"
    stored_name = f"{file_id}_{clean_name}"

    from app.services.storage import storage_manager
    public_url = storage_manager.save_direct_upload(content, stored_name, content_type)

    upload_rec = ArtworkUpload(
        id=file_id,
        original_filename=clean_name,
        stored_filename=stored_name,
        content_type=content_type,
        size_bytes=size_bytes,
        purpose="artwork",
        status="ready",
    )
    db.add(upload_rec)
    db.commit()

    return {
        "url": public_url,
        "public_url": public_url,
        "filename": clean_name,
        "file_id": file_id,
        "status": "ready",
    }


@router.post("/sign", summary="Get presigned upload URL for customer artwork")
def sign_upload(
    payload: Dict[str, Any],
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    filename = payload.get("filename", "artwork.png")
    mime_type = payload.get("mime_type", "image/png")
    size_bytes = payload.get("size_bytes", 0)

    validate_upload_request(filename, mime_type, size_bytes)
    owner_id = current_user.id if current_user else (x_session_id or "guest")

    from app.services.storage import storage_manager
    upload_info = storage_manager.generate_presigned_upload_url(
        owner_id=owner_id,
        filename=filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        db=db,
    )

    upload_rec = ArtworkUpload(
        id=upload_info["file_id"],
        user_id=current_user.id if current_user else None,
        original_filename=filename,
        stored_filename=upload_info["storage_key"],
        content_type=mime_type,
        size_bytes=size_bytes,
        purpose="artwork",
        status="uploading",
    )
    db.add(upload_rec)
    db.commit()

    return upload_info


@router.post("/direct/{upload_id}", summary="Direct file upload (dev / local storage mode)")
async def direct_upload(
    upload_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    upload_rec = db.get(ArtworkUpload, upload_id)
    if not upload_rec:
        raise NotFoundError("Upload record not found. Call /sign first.")

    content = await file.read()
    size_bytes = len(content)

    if size_bytes > settings.max_artwork_bytes:
        raise ValidationError(f"File exceeds maximum limit of {settings.MAX_ARTWORK_SIZE_MB}MB.")

    # Check for SVG script injection
    if upload_rec.content_type == "image/svg+xml" or file.content_type == "image/svg+xml":
        if not check_svg_content(content):
            upload_rec.status = "rejected"
            db.commit()
            raise ValidationError("SVG contains disallowed executable scripts.")

    # Save to disk
    local_path = os.path.join(settings.UPLOAD_DIR, upload_rec.stored_filename)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(content)

    upload_rec.size_bytes = size_bytes
    upload_rec.status = "ready"
    db.commit()

    view_url = generate_signed_view_url(upload_rec.stored_filename)
    return {
        "status": "ready",
        "file_id": upload_rec.id,
        "view_url": view_url,
    }


@router.post("/{upload_id}/complete", response_model=UploadOut, summary="Finalize uploaded artwork")
def complete_upload(
    upload_id: str,
    db: Session = Depends(get_db),
):
    upload_rec = db.get(ArtworkUpload, upload_id)
    if not upload_rec:
        raise NotFoundError("Upload record not found.")

    upload_rec.status = "ready"
    db.commit()

    view_url = generate_signed_view_url(upload_rec.stored_filename)
    return UploadOut(
        id=upload_rec.id,
        original_filename=upload_rec.original_filename,
        content_type=upload_rec.content_type,
        size_bytes=upload_rec.size_bytes,
        status=upload_rec.status,
        url=view_url,
    )


@router.get("/{upload_id}/url", summary="Get a fresh short-lived signed view URL for artwork")
def get_artwork_url(
    upload_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    upload_rec = db.get(ArtworkUpload, upload_id)
    if not upload_rec:
        raise NotFoundError("Artwork not found.")

    if upload_rec.user_id and current_user and upload_rec.user_id != current_user.id and current_user.role.value == "customer":
        raise ForbiddenError("You do not have permission to view this artwork.")

    view_url = generate_signed_view_url(upload_rec.stored_filename)
    return {"url": view_url, "expires_in_seconds": 900}


@router.get("/view", summary="Securely view customer artwork with signed verification")
def view_artwork_file(
    key: str = Query(...),
    exp: int = Query(...),
    sig: str = Query(...),
):
    storage_key = verify_signed_view_url(key, exp, sig)
    if not storage_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Signed download link has expired or is invalid.",
        )

    local_path = os.path.join(settings.UPLOAD_DIR, storage_key)
    if not os.path.exists(local_path):
        raise NotFoundError("File not found on storage.")

    return FileResponse(
        path=local_path,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=900",
        },
    )
