"""
DisplayDelight V2 — Pytest fixtures and test client configuration.
"""
from __future__ import annotations

import os
import sys

import pytest
from fastapi.testclient import TestClient

# Ensure backend root on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import models as _models  # noqa: F401
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    Base.metadata.create_all(bind=engine)
    return TestClient(app)


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def reset_inventory_reservations():
    session = SessionLocal()
    try:
        from app.models.models import Inventory
        session.query(Inventory).update({Inventory.reserved: 0, Inventory.quantity: 100})
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()

