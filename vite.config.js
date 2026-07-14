import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Node의 실험적 내장 localStorage(Web Storage API)가 jsdom의 window.localStorage를
// 덮어써서 removeItem 등이 사라지는 문제가 있다. 테스트 워커 프로세스가 이 값을 물려받도록
// vitest 설정을 로드하는 시점에 NODE_OPTIONS에 비활성화 플래그를 추가한다.
// 주의: `--no-experimental-webstorage`는 Node 22.4.0에서 실험적 Web Storage API와 함께 도입된
// 플래그라 그보다 낮은 버전(예: Node 20)에는 존재하지 않는다. 인식하지 못하는 플래그가
// NODE_OPTIONS에 있으면 Node가 아예 기동을 거부하므로, 반드시 Node 버전을 확인한 뒤에만 붙여야 한다.
// Node의 Web Storage API가 정식(stable)이 되거나 제거되거나, jsdom/vitest 쪽에서 이 충돌이
// 해결되면 이 워크어라운드 전체를 제거할 것.
const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor >= 22) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--no-experimental-webstorage']
    .filter(Boolean)
    .join(' ')
}

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