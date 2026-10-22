"""
DisplayDelight V2 — Production-Ready FastAPI Application Entrypoint.
Mounts:
- Core middleware: CORS, Security Headers, Request ID & Latency Timing
- Centralized exception handlers for uniform API error responses
- API version 1 router tree (/api/v1)
- Health check endpoint (/health)
"""
from __future__ import annotations

import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1 import api_v1_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all models are registered on Base.metadata and tables exist
    import app.models.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Safe column migration for SQLite / Postgres if table already existed without placement column
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE gallery_items ADD COLUMN placement VARCHAR(20) DEFAULT 'both'"))
            conn.commit()
    except Exception:
        pass

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "artwork"), exist_ok=True)
    yield


from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="Production-grade e-commerce backend for DisplayDelight business displays and signage.",
    docs_url="/docs" if settings.DEBUG else "/docs",
    redoc_url="/redoc" if settings.DEBUG else "/redoc",
    lifespan=lifespan,
)

# Static file serving for uploads & media
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ── Middleware ────────────────────────────────────────────────────────────────

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)


# 2. Security Headers & Request ID Middleware
@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next: Callable) -> Response:
    start_time = time.time()
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

    response = await call_next(request)

    # Timing & Traceability
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Request-ID"] = request_id

    # Security Headers (Section 9 Security Checklist)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    return response


# ── Exception Handlers ────────────────────────────────────────────────────────

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    print(f"[AppError {exc.status_code}] {request.method} {request.url.path}: {exc.detail}", flush=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "error_type": exc.__class__.__name__,
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append({"field": field, "message": err.get("msg")})
    print(f"[ValidationError 422] {request.method} {request.url.path}: {errors}", flush=True)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation failed for request parameters.",
            "error_type": "ValidationError",
            "details": errors,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if settings.DEBUG:
        import traceback
        traceback.print_exc()

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "An internal server error occurred.",
            "error_type": "InternalServerError",
        },
    )



# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"], summary="System health check")
def health_check():
    db_healthy = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_healthy = True
    except Exception:
        db_healthy = False

    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timestamp": time.time(),
    }


# ── Mount Routers ─────────────────────────────────────────────────────────────

app.include_router(api_v1_router)
