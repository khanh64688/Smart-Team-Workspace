import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // 0.0.0.0 để truy cập được từ ngoài container.
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      // Bind mount trên Windows/macOS không phát ra inotify event,
      // thiếu dòng này thì hot reload im lặng không hoạt động.
      usePolling: true,
      interval: 300,
    },
  },
  preview: {
    host: true,
    port: 5173,
  },
});
