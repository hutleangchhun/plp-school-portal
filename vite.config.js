import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000, // Default port is 5173, change if needed
    strictPort: true, // Don't try to use other ports if 3000 is in use
    open: false, // Don't open browser automatically
    hmr: {
      clientPort: 3000, // Important for HMR to work on network
    },
  },
  preview: {
    host: true,
    port: 3000,
  },
})
