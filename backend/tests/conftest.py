import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import SystemRole, User


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    session = TestingSession()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db):
    def override_db():
        yield db
    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def users(db):
    records = {
        "admin": User(email="admin@test.dev", full_name="Admin", role=SystemRole.ADMIN),
        "pm": User(email="pm@test.dev", full_name="PM", role=SystemRole.PM),
        "member": User(email="member@test.dev", full_name="Member", role=SystemRole.MEMBER),
        "outsider": User(email="outside@test.dev", full_name="Outsider", role=SystemRole.MEMBER),
    }
    db.add_all(records.values()); db.commit()
    return records


def auth(user):
    return {"X-User-Id": user.id}
