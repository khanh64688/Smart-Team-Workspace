/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL backend, khai báo trong .env hoặc docker-compose.yml */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
