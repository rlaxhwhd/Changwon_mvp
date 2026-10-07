// Local-only update: build -> backup -> migrate (no seed) -> start services.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const command = process.argv[2] ?? 'up'
if (!['up', 'down', 'logs', 'ps', 'migrate'].includes(command)) throw new Error('Unknown local-stack command')
const envFile = '.env.docker.local'
if (!existsSync(envFile)) throw new Error('Run npm run docker:bootstrap first.')
const ai = /^DC_LOCAL_AI_ENABLED=(true|1)\s*$/m.test(readFileSync(envFile, 'utf8'))
const base = ['compose', '--env-file', envFile, '-f', 'compose.yaml', ...(ai ? ['-f', 'compose.ai.yaml'] : [])]
function docker(args) {
  const result = spawnSync('docker', args, { stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error(`Docker step failed (${result.status ?? result.error?.message})`)
}
const compose = args => docker([...base, ...args])
if (ai && ['up', 'migrate'].includes(command)) {
  mkdirSync('deploy/secrets', { recursive: true })
  for (const name of ['rag_key_local', 'qdrant_key_local', 'searxng_secret_local']) {
    const file = `deploy/secrets/${name}`
    if (!existsSync(file)) writeFileSync(file, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' })
  }
}
if (['up', 'migrate'].includes(command)) {
  compose(['build', 'api', ...(command === 'up' ? ['web', ...(ai ? ['rag'] : [])] : [])])
  compose(['up', '-d', '--wait', 'db'])
  const stamp = new Date().toISOString().replace(/[^0-9]/g, '')
  const backup = `/tmp/local-before-migrate-${stamp}.dump`
  mkdirSync('_workspace/db-backups', { recursive: true })
  compose(['exec', '-T', 'db', 'pg_dump', '-U', 'postgres', '-d', 'dreamcatch', '-Fc', '-f', backup])
  compose(['cp', `db:${backup}`, `_workspace/db-backups/local-before-migrate-${stamp}.dump`])
  // Never reseed an existing database during a routine code update.
  compose(['--profile', 'bootstrap', 'run', '--rm', '--no-deps', 'bootstrap', 'python', '-m', 'app.migrate'])
  if (command === 'up') compose(['up', '-d', '--wait', '--wait-timeout', '240'])
} else if (command === 'logs') compose(['logs', '--tail', '100', '-f'])
else compose([command])
