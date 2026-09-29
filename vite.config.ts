import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'node:fs'

const tokenFile = process.env.DC_API_TOKEN_FILE ?? resolve(__dirname, 'deploy/secrets/api_token')

// API 프록시 대상은 개발자마다 다르다 — 로컬 백엔드를 띄웠는지, SSH 터널을 쓰는지.
// `.env.local`(git 무시)에 DC_API_TARGET 을 두면 `npm run dev` 만으로 그쪽을 본다.
// 우선순위: 셸 환경변수 > .env.local > 기본값(터널 포트).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'DC_')
  const apiTarget = process.env.DC_API_TARGET ?? env.DC_API_TARGET ?? 'http://127.0.0.1:18000'
  return {
    plugins: [
      tailwindcss(),
      react(),
      {
        name: 'multi-spa-fallback',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Check before Vite/plugin decoding and SPA fallback, including encoded separators.
            let path = (req.url ?? '').split('?')[0].split('#')[0]
            try {
              for (let pass = 0; pass < 3 && path.includes('%'); pass++) path = decodeURIComponent(path)
            } catch {
              res.writeHead(400).end('Invalid path')
              return
            }
            const privateParts = new Set(['deploy', 'backend', 'origin', 'docs', 'tools', 'scripts',
              '_workspace', '.git', '.claude', '.ai', '.graft', 'graft'])
            if (path.replaceAll('\\', '/').toLowerCase().split('/').some(part =>
              privateParts.has(part) || part.startsWith('.env') || part.startsWith('.scratch') || part.endsWith('.log'))) {
              res.writeHead(403, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }).end('Forbidden')
              return
            }
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
      host: '127.0.0.1',
      fs: {
        strict: true,
        // These files are read by server processes, never by the browser.
        deny: ['**/.env', '**/.env.*', '**/*.{crt,pem,key,p12,pfx,cer,der}', '**/.npmrc',
          '**/.yarnrc.yml', '**/.git/**', '**/deploy/**', '**/backend/**',
          '**/.scratch*', '**/_workspace/**', '**/.claude/**', '**/.ai/**', '**/*.log',
          '**/origin/**', '**/docs/**', '**/tools/**', '**/scripts/**', '**/.graft/**', '**/graft/**'],
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('X-DC-Token')
              const apiToken = existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : ''
              if (apiToken) proxyReq.setHeader('X-DC-Token', apiToken)
            })
          },
        },
      },
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
  }
})
