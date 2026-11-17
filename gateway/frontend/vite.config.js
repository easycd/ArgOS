import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Vite 설정
// - '@' 별칭: import 경로를 '@/api/http' 처럼 src 기준으로 쓰기 위함
// - 개발 서버 프록시: /api 요청을 연계 서버(gateway/backend, 기본 8080)로 전달
//   (mock 모드에서는 요청을 보내지 않으므로 백엔드가 꺼져 있어도 됨)
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
