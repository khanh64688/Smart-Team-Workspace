from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Smart Team Workspace API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str

    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Frontend chạy ở origin khác backend (5173 vs 8000) nên trình duyệt
    # chặn request nếu backend không trả header CORS.
    # Khai báo dạng chuỗi ngăn cách bởi dấu phẩy, không phải list[str]:
    # pydantic-settings sẽ cố JSON-decode env value của field kiểu list.
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    # Cấu hình nhà cung cấp AI.
    #
    # Các field này bắt buộc phải khai báo ở đây: model_config để
    # extra="ignore" nên biến AI_* trong .env sẽ bị bỏ qua âm thầm
    # nếu Settings không có field tương ứng.
    #
    # Thiếu ai_api_key thì tính năng AI trả lỗi AI_NOT_CONFIGURED (503),
    # không bao giờ im lặng trả dữ liệu bịa.
    ai_provider: str = "none"
    ai_api_key: str = ""

    # Chọn model theo quota, không theo độ mạnh.
    #
    # Free tier tính quota RIÊNG cho từng model
    # (GenerateRequestsPerDayPerProjectPerModel-FreeTier), và
    # gemini-3.6-flash chỉ được 20 request/ngày — chưa đủ để tập demo
    # một lần, vì mỗi câu hỏi tốn 2 lượt gọi.
    #
    # Bản flash-lite có hạn mức rộng hơn nhiều mà vẫn gọi tool chính xác,
    # đủ dùng cho tác vụ tra cứu task. Hết quota model này thì đổi sang
    # gemini-3.5-flash hoặc gemini-3.6-flash: mỗi model một hạn mức riêng.
    #
    # Lưu ý: gemini-2.5-flash đã ngừng cấp cho key mới (API trả 404
    # "no longer available to new users").
    ai_model: str = "gemini-3.1-flash-lite"
    ai_timeout_seconds: float = 15.0
    ai_max_output_tokens: int = 2048

    @property
    def ai_enabled(self) -> bool:
        return (
            bool(self.ai_api_key.strip())
            and self.ai_provider.strip().lower() not in ("", "none")
        )

    # Đọc cả hai vị trí .env:
    # - BASE_DIR.parent/.env là file dùng chung ở gốc repo (docker compose đọc file này).
    # - BASE_DIR/.env là file riêng của backend khi chạy uvicorn trực tiếp.
    #
    # File sau đè file trước. Thiếu file nào thì pydantic-settings bỏ qua.
    # Biến môi trường thật vẫn có độ ưu tiên cao hơn cả hai (quan trọng
    # cho container: docker compose truyền AI_API_KEY qua environment).
    model_config = SettingsConfigDict(
        env_file=(
            str(BASE_DIR.parent / ".env"),
            str(BASE_DIR / ".env"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()