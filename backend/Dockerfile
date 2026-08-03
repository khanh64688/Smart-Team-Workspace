# =============================================================
#  Backend — FastAPI
#  Ảnh nhiều tầng: builder -> runtime (prod) -> dev
#  docker-compose.yml dùng `target: dev`, deploy dùng mặc định (runtime).
# =============================================================

# ---------- Tầng 1: builder — biên dịch dependency ----------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# build-essential + libpq-dev để psycopg2 tự biên dịch được nếu thiếu wheel.
# Các gói này chỉ nằm ở tầng builder, không đi vào ảnh cuối.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Cài vào virtualenv riêng để copy nguyên khối sang tầng sau.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt


# ---------- Tầng 2: runtime — ảnh chạy thật ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# libpq5 là thư viện runtime của psycopg2 (không cần bản -dev ở đây).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 appuser

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=appuser:appuser . .

COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER appuser
EXPOSE 8000

# Dùng chính Python để healthcheck, khỏi phải cài thêm curl vào ảnh.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/', timeout=4).status == 200 else 1)"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# ---------- Tầng 3: dev — thêm pytest, ruff, hot reload ----------
FROM runtime AS dev

USER root
COPY requirements-dev.txt ./
RUN pip install -r requirements-dev.txt
USER appuser

# --reload để sửa code trên máy host là container tự nạp lại.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
