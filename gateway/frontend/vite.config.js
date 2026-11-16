import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Vite 설정
// - '@' 별칭: import 경로를 '@/api/http' 처럼 src 기준으로 쓰기 위함
// - 개발 서버 프록시(/api → 백엔드)는 백엔드 포트가 정해지면 server.proxy 에 추가 예정
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
