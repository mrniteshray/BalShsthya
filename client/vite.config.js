import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    'process.env': {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "events": path.resolve(__dirname, "./src/node-shims.js"),
      "util": path.resolve(__dirname, "./src/node-shims.js"),
      "process": path.resolve(__dirname, "./src/node-shims.js"),
    },
  },
})
