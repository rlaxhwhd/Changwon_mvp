// ─────────────────────────────────────────────────────────────────────────
// 새 컴퓨터에서 한 번 — `git clone`(또는 `git pull`) 뒤 Docker 만으로 전체 스택을 세운다.
//
// 저장소에 없는 것 세 가지를 만든다: 로컬 전용 비밀 3개(git 제외), DB 데이터 볼륨,
// 그리고 빈 DB 의 스키마·시드. 컨테이너는 기동할 때 마이그레이션을 돌리지 않는다.
//
//   node scripts/bootstrap-local.mjs     (= npm run docker:bootstrap)
//
// 여러 번 돌려도 안전하다 — 이미 있는 것은 건너뛴다. 기존 볼륨의 데이터는 지우지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const ENV_FILE = '.env.docker.local'
const SECRET_DIR = 'deploy/secrets'
const DEFAULT_VOLUME = 'dreamcatch-local_pgdata'

/** 비밀은 파일로만 오간다 — 값을 화면에 찍지 않는다. */
const secretPath = name => `${SECRET_DIR}/${name}`
const readSecret = name => readFileSync(secretPath(name), 'utf8').trim()

function ensureSecret(name) {
  if (existsSync(secretPath(name))) return false
  mkdirSync(SECRET_DIR, { recursive: true })
  writeFileSync(secretPath(name), randomBytes(24).toString('base64url'))
  return true
}

function docker(args, options = {}) {
  const result = spawnSync('docker', args, { stdio: 'inherit', ...options })
  if (result.error) throw new Error(`docker 를 실행할 수 없습니다 — Docker Desktop 이 켜져 있나요? (${result.error.message})`)
  if (result.status !== 0) throw new Error(`실패: docker ${args.slice(0, 4).join(' ')} … (exit ${result.status})`)
  return result
}

const compose = (args, options) => docker(['compose', '--env-file', ENV_FILE, ...args], options)

/** psql 에 SQL 을 표준입력으로 보낸다 — 비밀번호가 프로세스 인자에 남지 않게. */
function psql(sql, { capture = false } = {}) {
  const args = ['compose', '--env-file', ENV_FILE, 'exec', '-T', 'db', 'psql', '-U', 'postgres',
                '-d', 'dreamcatch', '-v', 'ON_ERROR_STOP=1', ...(capture ? ['-tA'] : []), '-f', '-']
  const result = spawnSync('docker', args, { input: sql, encoding: 'utf8',
                                             stdio: ['pipe', capture ? 'pipe' : 'inherit', 'inherit'] })
  if (result.status !== 0) throw new Error(`psql 실패 (exit ${result.status})`)
  return (result.stdout ?? '').trim()
}

const step = message => console.log(`\n▶ ${message}`)

// 1. 로컬 전용 비밀 — git 에 올라가지 않으므로 컴퓨터마다 새로 만든다.
step('로컬 전용 비밀 확인')
for (const name of ['postgres_password_local', 'api_db_password_local', 'api_token']) {
  console.log(`  ${ensureSecret(name) ? '새로 만듦' : '이미 있음'}  ${secretPath(name)}`)
}

// 2. 데이터 볼륨 — compose 가 external 로 잡는다(정리 명령에 딸려 지워지지 않게).
step('DB 데이터 볼륨 확인')
if (!existsSync(ENV_FILE)) writeFileSync(ENV_FILE, `DC_LOCAL_PG_VOLUME=${DEFAULT_VOLUME}\n`)
const volume = (readFileSync(ENV_FILE, 'utf8').match(/^DC_LOCAL_PG_VOLUME=(.+)$/m) ?? [])[1]?.trim()
if (!volume) throw new Error(`${ENV_FILE} 에 DC_LOCAL_PG_VOLUME 이 없습니다.`)
if (spawnSync('docker', ['volume', 'inspect', volume], { stdio: 'ignore' }).status === 0) {
  console.log(`  이미 있음  ${volume}`)
} else {
  docker(['volume', 'create', volume])
}

// 3. DB 기동 → 역할·스키마 → 앱 계정 비밀번호.
step('PostgreSQL 기동')
compose(['up', '-d', '--wait', 'db'])

step('역할·스키마 확인')
if (psql("SELECT 1 FROM pg_roles WHERE rolname='dc_app';", { capture: true }) === '1') {
  console.log('  이미 있음  dc_owner · dc_app · schema dc')
} else {
  psql(readFileSync('deploy/bootstrap.db.sql', 'utf8'))
  console.log('  만듦  dc_owner · dc_app · schema dc')
}
// 비밀 파일과 DB 쪽 비밀번호를 늘 맞춘다 — 어긋나면 api 가 붙지 못한다.
psql(`ALTER ROLE dc_app PASSWORD '${readSecret('api_db_password_local')}';`)

// 4. 테이블과 시드 — 컨테이너 기동은 이것을 하지 않는다. 시드는 두 번째부터 already_imported 다.
step('마이그레이션 · 시드')
compose(['--profile', 'bootstrap', 'run', '--rm', '--build', 'bootstrap'])

// 5. 전체 스택.
step('전체 스택 기동')
compose(['up', '-d', '--build', '--wait'])

console.log(`
준비 끝. 브라우저에서 열어 본다.
  학생    http://127.0.0.1:8080/v2/main
  교직원  http://127.0.0.1:8080/admin
  API     http://127.0.0.1:8080/api/v1/health

다음부터는 'npm run docker:up' 하나면 된다.`)
