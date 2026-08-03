from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)


app.include_router(
    api_router,
    prefix=settings.api_v1_prefix,
)

@app.get("/")
def root():
    return {"message": "Welcome to Smart Team Workspace API"}

@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}