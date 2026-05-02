import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7011',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // SignalR WebSocket — precisa de ws: true para upgrade do protocolo
      '/hubs': {
        target: 'https://localhost:7011',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})