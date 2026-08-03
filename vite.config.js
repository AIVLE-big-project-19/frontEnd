import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number)
if (nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 4)) {
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
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },

    }
  }
})
