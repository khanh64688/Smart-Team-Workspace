FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci


FROM deps AS dev

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]


FROM deps AS build

COPY . .

# Vite nhúng biến VITE_* vào bundle lúc build, không đọc lúc chạy.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
