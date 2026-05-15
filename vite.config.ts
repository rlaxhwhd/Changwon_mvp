import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'v2-spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? ''
          if (url === '/v2' || url.startsWith('/v2/')) {
            req.url = '/v2.html'
          }
          next()
        })
      },
    },
  ],
  server: {
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v2:   resolve(__dirname, 'v2.html'),
      },
    },
  },
})
