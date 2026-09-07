import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'multi-spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? ''
          if (url === '/v2' || url.startsWith('/v2/')) {
            req.url = '/v2.html'
          } else if (url === '/admin' || url.startsWith('/admin/')) {
            req.url = '/admin.html'
          }
          next()
        })
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    // _workspace(브라우저 프로필 덤프 등 대량 파일)를 watch/스캔에서 제외 — HTML 서빙 hang 방지
    watch: {
      ignored: ['**/_workspace/**'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'index.html'),
        v2:    resolve(__dirname, 'v2.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
