from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import ChatService

router = APIRouter(
    tags=["Chat"],
)


@router.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(
    data: ChatRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> ChatResponse:
    """
    Hỏi đáp về dữ liệu dự án.

    Mô hình chỉ được chọn tool trong danh sách cố định và không bao giờ
    chạm vào database: mọi truy vấn do backend chạy qua repository, đã
    lọc theo quyền thành viên của người gọi.

    Mã lỗi có thể gặp:
      403 PROJECT_MEMBERSHIP_REQUIRED — không phải thành viên dự án
      429 AI_RATE_LIMIT_EXCEEDED     — hỏi quá nhiều trong một giờ
      503 AI_NOT_CONFIGURED          — chưa điền AI_API_KEY
      504 AI_TIMEOUT                 — nhà cung cấp AI phản hồi quá chậm
    """
    return ChatService(db).ask(
        data=data,
        actor=current_user,
    )
