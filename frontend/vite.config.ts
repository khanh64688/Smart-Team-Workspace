import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      // Bind mount trên Windows/macOS không phát inotify event, thiếu dòng này
      // thì hot reload trong Docker im lặng không hoạt động.
      usePolling: true,
      interval: 300,
    },
  },
});
