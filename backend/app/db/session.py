"""SQLAlchemy engine / session factory — synchronous (psycopg2 / SQLite)."""
from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    # SQLite needs this; harmless for Postgres
    connect_args={"check_same_thread": False}
    if "sqlite" in settings.DATABASE_URL
    else {},
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

# Safe lightweight column migrations for SQLite / PostgreSQL
try:
    with engine.connect() as _conn:
        _conn.execute(text("ALTER TABLE gallery_items ADD COLUMN placement VARCHAR(20) DEFAULT 'both'"))
        _conn.commit()
except Exception:
    pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
