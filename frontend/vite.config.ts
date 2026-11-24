import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 개발 서버는 /api와 /ws를 Spring(8080)으로 넘긴다. 같은 오리진처럼 동작하므로 CORS 설정이 필요 없다.
const backend = process.env.BACKEND_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/ws': { target: backend, ws: true },
    },
  },
})
