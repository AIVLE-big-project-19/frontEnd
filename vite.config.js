import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
  server: {
    proxy: {
      // 기존 설정
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 새로 추가할 VWorld API 설정
      '/vworld-api': {
        target: 'https://api.vworld.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vworld-api/, '') // 요청 경로에서 /vworld-api 제거
      }
    }
  }
})