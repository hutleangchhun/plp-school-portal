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
      // Socket.io default path (proxy to attendance server port 8082)
      '/socket.io': {
        target: 'http://localhost:8082',
        ws: true,
        changeOrigin: true,
      },
      '/api/v1/socket.io': {
        target: 'http://localhost:8082',
        ws: true,
        changeOrigin: true,
      },
      // Attendance namespace for WebSocket
      '/attendance': {
        target: 'http://localhost:8082',
        ws: true,
        changeOrigin: true,
      },
      // Attendance server (port 8082) - must be listed before /api/v1 to take precedence
      '/api/v1/attendance': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/shifts': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      // GraphQL API endpoint (assuming it is on 8082, matching attendance log features)
      '/graphql': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/graphql': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      // Main server (port 8080)
      '/api/v1': {
        target: 'http://localhost:8080',
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
