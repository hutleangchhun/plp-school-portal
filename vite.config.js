import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3001, // Use port 3001
    strictPort: false, // Allow fallback to other ports if 3001 is in use
    open: false, // Don't open browser automatically
    hmr: {
      clientPort: 3001, // Important for HMR to work on network
    },
  },
  preview: {
    host: true,
    port: 3001,
  },
})
