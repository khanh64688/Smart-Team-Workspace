# =============================================================
#  Frontend — React + Vite
#  Ảnh nhiều tầng: deps -> dev (compose)  |  deps -> builder -> runtime (deploy)
# =============================================================

# ---------- Tầng 1: deps — cài dependency ----------
FROM node:22-alpine AS deps

WORKDIR /app

# Chỉ copy manifest trước để Docker cache lại tầng npm ci.
# Sửa code trong src/ sẽ không phải cài lại dependency.
COPY package.json package-lock.json ./

# RUN npm install instead of npm ci to automatically resolve and install added packages
RUN npm install --legacy-peer-deps


# ---------- Tầng 2: dev — vite dev server, hot reload ----------
FROM deps AS dev

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]


# ---------- Tầng 3: builder — build ra file tĩnh ----------
FROM deps AS builder

COPY . .

# Vite nhúng biến VITE_* vào bundle NGAY LÚC BUILD, không đọc lúc chạy.
# Nên URL backend phải truyền vào đây bằng build arg.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


# ---------- Tầng 4: runtime — nginx phục vụ file tĩnh ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
