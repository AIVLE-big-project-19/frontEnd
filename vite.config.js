import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Node의 실험적 내장 localStorage(Web Storage API)가 jsdom의 window.localStorage를
// 덮어써서 removeItem 등이 사라지는 문제가 있다. 테스트 워커 프로세스가 이 값을 물려받도록
// vitest 설정을 로드하는 시점에 NODE_OPTIONS에 비활성화 플래그를 추가한다.
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--no-experimental-webstorage']
  .filter(Boolean)
  .join(' ')

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
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