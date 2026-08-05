from __future__ import annotations

import os
import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


# Đường dẫn tới thư mục backend/
BACKEND_DIR = Path(__file__).resolve().parents[1]

# Đọc backend/.env.test
load_dotenv(
    BACKEND_DIR / ".env.test",
    override=True,
)

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

if not TEST_DATABASE_URL:
    raise RuntimeError(
        "Không tìm thấy TEST_DATABASE_URL trong backend/.env.test"
    )


# Bảo vệ: pytest tuyệt đối không được chạy trên database phát triển.
database_name = make_url(TEST_DATABASE_URL).database or ""

if not database_name.endswith("_test"):
    raise RuntimeError(
        "Pytest chỉ được phép dùng database có tên kết thúc bằng '_test'. "
        f"Database hiện tại: {database_name!r}"
    )


# Phải đặt biến môi trường trước khi import app.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["APP_ENV"] = "test"
os.environ["SECRET_KEY"] = (
    "test-secret-key-only-for-smart-team-workspace-tests"
)


from app.database import Base, get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.models import User, UserRole  # noqa: E402
from app import models as app_models  # noqa: E402, F401


test_engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
)


# Đổi thành 200 nếu lệnh kiểm tra OpenAPI của bạn hiện 200.
REGISTER_SUCCESS_STATUS = 201

DEFAULT_PASSWORD = "Password123"


@pytest.fixture(
    scope="session",
    autouse=True,
)
def prepare_test_database() -> Generator[None, None, None]:
    """
    Chuẩn bị schema test một lần cho toàn bộ phiên pytest.
    """

    # DROP SCHEMA xóa cả table, index và PostgreSQL enum user_role.
    with test_engine.begin() as connection:
        connection.execute(
            text("DROP SCHEMA IF EXISTS public CASCADE")
        )
        connection.execute(
            text("CREATE SCHEMA public")
        )

    Base.metadata.create_all(bind=test_engine)

    yield

    # Dọn sạch database test khi chạy xong.
    with test_engine.begin() as connection:
        connection.execute(
            text("DROP SCHEMA IF EXISTS public CASCADE")
        )
        connection.execute(
            text("CREATE SCHEMA public")
        )

    test_engine.dispose()


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """
    Tạo một session riêng cho từng test.

    Service có thể gọi commit(), nhưng outer transaction vẫn được
    rollback khi test kết thúc.
    """

    connection = test_engine.connect()
    outer_transaction = connection.begin()

    session = Session(
        bind=connection,
        autoflush=False,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )

    try:
        yield session

    finally:
        session.close()

        if outer_transaction.is_active:
            outer_transaction.rollback()

        connection.close()


@pytest.fixture()
def client(
    db_session: Session,
) -> Generator[TestClient, None, None]:
    """
    Ghi đè get_db để toàn bộ API sử dụng test database.
    """

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    fastapi_app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(fastapi_app) as test_client:
            yield test_client

    finally:
        fastapi_app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def register_user(client: TestClient):
    """
    Helper đăng ký một tài khoản MEMBER.
    """

    def _register(
        *,
        email: str,
        full_name: str = "Test User",
        password: str = DEFAULT_PASSWORD,
    ) -> dict:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "full_name": full_name,
                "password": password,
                "confirm_password": password,
            },
        )

        assert (
            response.status_code == REGISTER_SUCCESS_STATUS
        ), response.text

        return response.json()

    return _register


@pytest.fixture()
def login_user(client: TestClient):
    """
    Helper đăng nhập và trả về access/refresh token.
    """

    def _login(
        *,
        email: str,
        password: str = DEFAULT_PASSWORD,
    ) -> dict:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": email,
                "password": password,
            },
        )

        assert response.status_code == 200, response.text

        return response.json()

    return _login


@pytest.fixture()
def auth_headers():
    """
    Chuyển access token thành Authorization header.
    """

    def _headers(access_token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
        }

    return _headers


@pytest.fixture()
def make_admin(
    register_user,
    login_user,
    db_session: Session,
):
    """
    Đăng ký một user, đổi role trực tiếp trong test database,
    rồi đăng nhập lại để token chứa role ADMIN.
    """

    def _make_admin(
        *,
        email: str = "admin@example.com",
        password: str = "AdminPassword123",
    ) -> dict:
        user_data = register_user(
            email=email,
            full_name="Test Admin",
            password=password,
        )

        user = db_session.get(
            User,
            uuid.UUID(user_data["id"]),
        )

        assert user is not None

        user.role = UserRole.ADMIN
        db_session.commit()

        # Phải đăng nhập sau khi đổi role để JWT chứa ADMIN.
        return login_user(
            email=email,
            password=password,
        )

    return _make_admin