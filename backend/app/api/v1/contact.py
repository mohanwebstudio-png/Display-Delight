"""
DisplayDelight V2 — Contact & General Enquiry API.
"""
from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
try:
    import email_validator
    from pydantic import EmailStr
except ImportError:
    EmailStr = str
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.services.notifications import notify


router = APIRouter(prefix="/contact", tags=["Contact"])


class ContactFormIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=10, max_length=3000)


@router.post("", summary="Submit general contact enquiry")
def submit_contact(
    payload: ContactFormIn,
    db: Session = Depends(get_db),
):
    notify(
        db=db,
        event_type="contact_form",
        recipient_email=settings.EMAIL_FROM_ADDRESS,
        context={
            "name": payload.name,
            "email": payload.email,
            "phone": payload.phone or "N/A",
            "subject": payload.subject,
            "message": payload.message,
        },
    )

    return {
        "status": "success",
        "message": "Thank you for reaching out. Our business displays team will reply using the contact details provided.",
    }
