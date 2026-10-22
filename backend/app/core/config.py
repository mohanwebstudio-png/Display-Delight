"""
DisplayDelight V2 — Application Configuration
Loaded from environment variables or a .env file.
Sensitive values are never returned to the frontend.
"""
from __future__ import annotations

import secrets
from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, field_validator
try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    from pydantic import BaseModel as BaseSettings
    def SettingsConfigDict(**kwargs):
        return {"extra": "ignore"}


import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = BACKEND_DIR / "displaydelight.db"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    ) if "SettingsConfigDict" in globals() else {"extra": "ignore"}

    # ── Application ────────────────────────────────────────────────────────────
    APP_NAME: str = "DisplayDelight V2"
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_hex(32)

    # ── Database ───────────────────────────────────────────────────────────────
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_FILE.as_posix()}"

    # ── CORS ───────────────────────────────────────────────────────────────────
    FRONTEND_ORIGIN: str = "http://localhost:8443"
    ALLOWED_ORIGINS: str = (
        "http://localhost:8443,http://127.0.0.1:8443,http://localhost:5173,http://127.0.0.1:5173,*"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── JWT ────────────────────────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── File Uploads ───────────────────────────────────────────────────────────
    UPLOAD_DIR: str = str(BACKEND_DIR / "uploads")
    MAX_ARTWORK_SIZE_MB: int = 20
    ALLOWED_ARTWORK_TYPES: str = (
        "image/jpeg,image/png,image/webp,image/svg+xml,application/pdf"
    )

    @property
    def allowed_artwork_content_types(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_ARTWORK_TYPES.split(",")]

    @property
    def max_artwork_bytes(self) -> int:
        return self.MAX_ARTWORK_SIZE_MB * 1024 * 1024

    # ── Razorpay ───────────────────────────────────────────────────────────────
    RAZORPAY_KEY_ID: str = "rzp_test_Tq2xyBU7kvMX7q"
    RAZORPAY_KEY_SECRET: str = "W4N2aajElPsDN4T64f0oPZx3"
    RAZORPAY_WEBHOOK_SECRET: str = "Sequvar@2004"
    RAZORPAY_CURRENCY: str = "INR"

    @property
    def razorpay_configured(self) -> bool:
        return bool(self.RAZORPAY_KEY_ID and self.RAZORPAY_KEY_SECRET)

    # ── SMTP / Email ───────────────────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "DisplayDelight"
    EMAIL_FROM_ADDRESS: str = "notifications@displaydelight.in"

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    # ── Cloudflare ─────────────────────────────────────────────────────────────
    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_TOKEN: str = ""
    CLOUDFLARE_R2_BUCKET: str = ""
    CLOUDFLARE_IMAGES_HASH: str = ""
    CLOUDFLARE_STREAM_TOKEN: str = ""

    @property
    def cloudflare_configured(self) -> bool:
        return bool(self.CLOUDFLARE_ACCOUNT_ID and self.CLOUDFLARE_API_TOKEN)

    # ── WhatsApp ───────────────────────────────────────────────────────────────
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v18.0"
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""

    @property
    def whatsapp_configured(self) -> bool:
        return bool(self.WHATSAPP_TOKEN and self.WHATSAPP_PHONE_NUMBER_ID)

    # ── GST / Business ─────────────────────────────────────────────────────────
    DEFAULT_GST_RATE: int = 18
    COMPANY_GSTIN: str = ""
    COMPANY_NAME: str = "DisplayDelight Pvt Ltd"
    COMPANY_ADDRESS: str = "Bangalore, Karnataka, India"

    # ── Shipping ───────────────────────────────────────────────────────────────
    DEFAULT_SHIPPING_CHARGE: int = 600
    FREE_SHIPPING_ABOVE: int = 50000

    # ── Logging ────────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"

    # ── Redis ──────────────────────────────────────────────────────────────────
    REDIS_URL: str = ""


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
