import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "API_");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": env.API_PROXY_TARGET ?? "http://127.0.0.1:3000" },
    },
    preview: { port: 4173, strictPort: true },
  };
});
