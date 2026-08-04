from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins. Can be restricted to localhost:5173 later.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handlers for standardized error payloads
@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
            headers=exc.headers,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": {},
            }
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Dữ liệu không hợp lệ.",
                "details": exc.errors(),
            }
        },
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
