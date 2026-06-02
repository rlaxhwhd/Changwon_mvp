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
          } else if (url === '/v1' || url.startsWith('/v1/')) {
            req.url = '/v1.html'
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
        v1:   resolve(__dirname, 'v1.html'),
        v2:   resolve(__dirname, 'v2.html'),
      },
    },
  },
})
