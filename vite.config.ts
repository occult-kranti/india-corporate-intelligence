import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Retained source receipts contain third-party HTML, not application entries.
  optimizeDeps: { entries: ['index.html'] },
  // Relative base so a built `dist/` opens directly from disk (file://) as well
  // as from a server. The hand-off bundle ships a runnable dist and relies on it.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
