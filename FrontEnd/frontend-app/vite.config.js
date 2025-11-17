import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⭐️⭐️⭐️ API PROXY AYARI EKLENDİ ⭐️⭐️⭐️
  server: {
    proxy: {
      // /api ile başlayan tüm istekleri 8080 portundaki Go API'sine yönlendir
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/users -> /users olarak gönder
      },
    },
  },
  // ⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️⭐️
})