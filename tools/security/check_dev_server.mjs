// Read only. Do not print response bodies: these paths used to contain secrets.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'

const base = process.env.SECURITY_DEV_URL ?? 'http://127.0.0.1:5173'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local verification only')
const absolute = resolve('deploy/secrets/api_token').replaceAll('\\', '/')
const paths = ['/deploy/secrets/api_token', '/deploy/secrets/api_token?raw',
  '/deploy/secrets/api_token?import', '/DEPLOY/SECRETS/API_TOKEN',
  '/deploy/secrets/api_token::$DATA?raw', '/deploy%2fsecrets%2fapi_token?raw',
  '/@fs/' + absolute + '?raw', '/backend/.env', '/.env.local', '/.scratch_api.log',
  '/deploy/secrets/oracle_password_local', '/tools/security/rotate_local_secrets.py']
for (const path of paths) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(10000) })
  await response.body?.cancel()
  assert.ok([403, 404].includes(response.status), `Private path not denied: ${path} (${response.status})`)
}
for (const path of ['/v2', '/admin', '/shared/api.ts', '/api/v1/health']) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) })
  await response.body?.cancel()
  assert.equal(response.status, 200, `Normal route unavailable: ${path}`)
}
console.log(`${paths.length} private paths denied; 4 normal routes available. No secret contents read.`)
