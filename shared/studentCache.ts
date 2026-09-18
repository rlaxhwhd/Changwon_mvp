// ─────────────────────────────────────────────────────────────────────────
// 학생 단위 조회 캐시 — 학생 상세(진단·로스터·성장·로드맵·포트폴리오)가 같은 학생을
// 여러 화면에서 열 때 같은 요청을 반복하지 않게 한다. 값은 각 도메인 스토어가 들고,
// 여기는 「언제 다시 읽을지」만 안다.
//
// dc:* 이벤트는 같은 브라우저의 변경만 즉시 잡는다(쓰기 → 스토어 refresh → 이벤트).
// 다른 사용자의 변경은 staleTime·화면 이동 시 재검증으로 보완한다(CLAUDE.md 런타임 반영 방식).
// ─────────────────────────────────────────────────────────────────────────

export const STUDENT_STALE_MS = 60_000
/** 한 브라우저 세션에서 연 학생 수만큼만 는다 — 로스터 byId 와 같은 상한으로 오래된 것부터 버린다. */
const MAX_ENTRIES = 300 * 5

export type StudentDomain = 'diagnosis' | 'roster' | 'growth' | 'roadmap' | 'portfolio'

/** 요청 시작 시점의 세대 — 완료 시 세대가 바뀌어 있으면 그 사이 무효화가 있었던 것이다. */
export interface FetchToken { key: string; gen: number; navEpoch: number }

interface Entry {
  fetchedAt: number
  navEpoch: number
  /** 같은 브라우저의 다른 도메인 쓰기가 이 값을 바꿨을 수 있다 — 값은 남기고 다음 오픈에서 다시 읽는다. */
  stale: boolean
  /** 무효화마다 1씩 는다. 진행 중이던 요청이 완료돼도 세대가 다르면 신선 처리하지 않는다. */
  gen: number
  task: Promise<void> | null
}

const entries = new Map<string, Entry>()
let navEpoch = 0

const keyOf = (domain: StudentDomain, studentId: string) => `${domain}:${studentId}`

function entryOf(key: string): Entry {
  let hit = entries.get(key)
  if (!hit) {
    hit = { fetchedAt: 0, navEpoch, stale: false, gen: 0, task: null }
    entries.set(key, hit)
    // 진행 중인 요청은 버리지 않는다 — 완료 시 entries 에 자기 항목이 있어야 한다.
    for (const [k, e] of entries) {
      if (entries.size <= MAX_ENTRIES) break
      if (!e.task && k !== key) entries.delete(k)
    }
  }
  return hit
}

/** 화면 이동을 알린다 — 그 뒤 처음 여는 학생 상세는 서버를 다시 확인한다. */
export function markNavigation(): void {
  navEpoch += 1
}

export function hasStudentCache(domain: StudentDomain, studentId: string): boolean {
  const hit = entries.get(keyOf(domain, studentId))
  return !!hit && hit.fetchedAt > 0
}

export function isStudentFresh(domain: StudentDomain, studentId: string, staleMs = STUDENT_STALE_MS): boolean {
  const hit = entries.get(keyOf(domain, studentId))
  return !!hit && hit.fetchedAt > 0 && !hit.stale && hit.navEpoch === navEpoch && Date.now() - hit.fetchedAt < staleMs
}

/** 스토어가 스스로 읽기 시작할 때 받아 두고, 읽은 뒤 touchStudentCache 에 돌려준다. */
export function beginStudentFetch(domain: StudentDomain, studentId: string): FetchToken {
  const key = keyOf(domain, studentId)
  return { key, gen: entryOf(key).gen, navEpoch }
}

/** 읽기 완료를 기록한다. 토큰의 세대가 지났으면(그 사이 무효화) 값은 있되 오래된 것으로 남긴다. */
export function touchStudentCache(domain: StudentDomain, studentId: string, token?: FetchToken): void {
  const hit = entryOf(keyOf(domain, studentId))
  const superseded = token !== undefined && token.gen !== hit.gen
  hit.fetchedAt = Date.now()
  hit.navEpoch = token?.navEpoch ?? navEpoch
  hit.stale = superseded
}

/** studentId 를 생략하면 그 도메인 전체를 오래된 것으로 표시한다. 값은 지우지 않는다 — 다음 오픈에서 다시 읽는다. */
export function invalidateStudent(domain: StudentDomain, studentId?: string): void {
  const prefix = `${domain}:`
  for (const [key, hit] of entries) {
    if (studentId ? key === prefix + studentId : key.startsWith(prefix)) { hit.stale = true; hit.gen += 1 }
  }
}

/** 로그인 사용자가 바뀌면 이전 사용자가 연 학생 기록을 남기지 않는다. 스토어 clear 와 같이 부른다. */
export function clearStudentCache(): void {
  entries.clear()
  navEpoch += 1
}

/**
 * 신선하면 아무것도 하지 않는다. 값이 있는데 오래됐으면 뒤에서 다시 읽고 즉시 돌아온다
 * (스토어가 갱신되면 이벤트로 다시 그린다). 처음이면 loader 를 기다린다.
 * 같은 키의 동시 요청은 진행 중인 하나를 공유한다.
 */
export function revalidateStudent(domain: StudentDomain, studentId: string, loader: () => Promise<unknown>,
                                  staleMs = STUDENT_STALE_MS): Promise<void> {
  if (isStudentFresh(domain, studentId, staleMs)) return Promise.resolve()
  const hit = entryOf(keyOf(domain, studentId))
  const hadValue = hit.fetchedAt > 0
  if (hit.task) return hadValue ? Promise.resolve() : hit.task

  const token = beginStudentFetch(domain, studentId)
  const task = loader()
    .then(() => { touchStudentCache(domain, studentId, token) })
    .catch(err => { if (!hadValue) entries.delete(token.key); throw err })
    .finally(() => { if (entries.get(token.key) === hit) hit.task = null })
  hit.task = task
  if (!hadValue) return task
  task.catch(() => { /* 백그라운드 재검증 실패는 기존 값을 유지한다 */ })
  return Promise.resolve()
}

// 같은 브라우저의 쓰기가 다른 도메인의 저장값을 바꾸는 경로 — 이벤트가 오면 다음 오픈에서 다시 읽는다.
// 상담 완료는 로스터의 유형·누적 건수를, 비교과 수료는 로스터 이수 건수와 로드맵 칸(DONE)을 바꾼다.
const CROSS_DOMAIN: Record<string, StudentDomain[]> = {
  'dc:counsel-updated': ['roster'],
  'dc_programs_changed': ['roster', 'roadmap'],
}
if (typeof window !== 'undefined') {
  for (const [event, domains] of Object.entries(CROSS_DOMAIN)) {
    window.addEventListener(event, () => { for (const d of domains) invalidateStudent(d) })
  }
}
