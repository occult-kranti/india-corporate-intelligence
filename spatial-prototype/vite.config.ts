import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    sourcemap: true,
    manifest: true,
    rollupOptions: { output: { manualChunks: { scene: ["three"] } } },
  },
});
