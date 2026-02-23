import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import removeConsole from 'vite-plugin-remove-console'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), removeConsole()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      stream: 'stream-browserify',
    },
  },
  optimizeDeps: {
    exclude: ['xlsx-js-style'],
  },
  build: {
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
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
    proxy: {
      // WebSocket — proxied through nginx LB on .92
      '/api/v1/socket.io': {
        target: 'http://192.168.155.92',
        ws: true,
        changeOrigin: true,
      },
      // GraphQL
      '/api/v1/graphql': {
        target: 'http://192.168.155.92',
        changeOrigin: true,
        secure: false,
      },
      // All REST API
      '/api/v1': {
        target: 'http://192.168.155.92',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    port: 3001,
  },
})
