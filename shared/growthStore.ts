// ─────────────────────────────────────────────────────────────────────────
// 성장활동 스토어 — roadmapStore 와 같은 규약이다.
//
// 성장 홈·성장일지·포트폴리오·상담사 학생상세가 **같은 행**을 읽는다. 지금까지는 각자
// 다른 저장소(학생별 localStorage · 학생별 JSON · 전 학생 공통 상수 · 화면 useState)를
// 봐서 학생이 고친 내용이 상담사에게 보이지 않았다.
//
// 이 스토어가 담지 않는 것 — 서버에 정책이 없기 때문이다(04-decisions Q3):
// 오늘 미션·퀘스트·XP·레벨·랭킹. 화면 상수를 서버 값으로 승격하지 않는다.
// ─────────────────────────────────────────────────────────────────────────
import { api, queryString } from './api'

export const GROWTH_EVENT = 'dc_growth_changed'

export type GrowthKind = 'RECORD' | 'JOURNAL' | 'PROJECT' | 'SKILL' | 'CERTIFICATE' | 'LANGUAGE' | 'AWARD'

export const GROWTH_KINDS: GrowthKind[] = ['RECORD', 'JOURNAL', 'PROJECT', 'SKILL', 'CERTIFICATE',
                                           'LANGUAGE', 'AWARD']

export interface GrowthFile { id: string; name: string; size: number; contentType: string; downloadUrl: string }

export interface GrowthEntry {
  id: string
  kind: GrowthKind
  categoryCode: string | null
  title: string
  occurredOn: string | null
  dateText: string | null
  datePrecision: 'DAY' | 'MONTH' | 'YEAR' | 'RANGE' | 'UNKNOWN'
  tags: string[]
  content: Record<string, unknown>
  bookmarked: boolean
  resumeUsed: boolean
  certId: string | null
  sourceKind: 'SELF_REPORTED' | 'IMPORTED'
  version: number
  createdAt: string
  updatedAt: string
  files: GrowthFile[]
}

export interface GrowthProfile {
  name: string
  studentNo: string
  school: string
  dept: string
  grade: number | null
  gpa: string | null
  intro: string
  /** 자기입력 연락처. 본인만 받는다 — 합성 기본값을 만들지 않는다. */
  email: string | null
  phone: string | null
  version: number
  capabilities: { canEdit: boolean }
}

export interface GrowthSummary {
  byKind: Record<GrowthKind, { total: number; bookmarked: number }>
  total: number
  tags: { tag: string; n: number }[]
}

export interface StarTrackEnvelope {
  record: Record<string, unknown> | null
  selected: boolean
  summary: { steps: number; done: number } | null
  /** 선발·마일리지·장학 정책이 미확정이다(DB.md #29·#30). null 을 0점이나 탈락으로 바꾸지 않는다. */
  metricsStatus: 'POLICY_PENDING'
}

export interface GrowthState {
  profile: GrowthProfile | null
  entries: GrowthEntry[]
  summary: GrowthSummary | null
  star: StarTrackEnvelope | null
}

const states = new Map<string, GrowthState>()
const pending = new Map<string, Promise<void>>()
let wishlist: { programId: string; wished: boolean; version: number }[] = []

function publish(): void {
  window.dispatchEvent(new Event(GROWTH_EVENT))
}

export function growthState(studentId: string): GrowthState | undefined {
  return states.get(studentId)
}

export function growthEntries(studentId: string, kind?: GrowthKind): GrowthEntry[] {
  const rows = states.get(studentId)?.entries ?? []
  return kind ? rows.filter(row => row.kind === kind) : rows
}

export async function loadGrowth(studentId: string): Promise<void> {
  const base = `/students/${encodeURIComponent(studentId)}/growth`
  const [profile, entries, summary, star] = await Promise.all([
    api<GrowthProfile>(`${base}/profile`),
    api<{ items: GrowthEntry[] }>(`${base}/entries?pageSize=100`),
    api<GrowthSummary>(`${base}/summary`),
    api<StarTrackEnvelope>(`/students/${encodeURIComponent(studentId)}/star-track`),
  ])
  states.set(studentId, { profile, entries: entries.items, summary, star })
  publish()
}

export function ensureGrowth(studentId: string): void {
  if (!studentId || states.has(studentId) || pending.has(studentId)) return
  const task = loadGrowth(studentId)
    .catch(() => { /* 실패는 화면의 로드 상태가 표시한다 */ })
    .finally(() => { pending.delete(studentId) })
  pending.set(studentId, task)
}

export function clearGrowthCache(): void {
  states.clear()
  pending.clear()
  wishlist = []
  publish()
}

async function refresh(studentId: string): Promise<void> {
  states.delete(studentId)
  await loadGrowth(studentId)
}

function key(): Record<string, string> {
  return { 'Idempotency-Key': crypto.randomUUID() }
}

function profileVersion(studentId: string): number {
  return states.get(studentId)?.profile?.version ?? 0
}

export interface EntryInput {
  kind: GrowthKind
  title: string
  categoryCode?: string | null
  occurredOn?: string | null
  dateText?: string | null
  datePrecision?: GrowthEntry['datePrecision']
  tags?: string[]
  content?: Record<string, unknown>
  bookmarked?: boolean
  resumeUsed?: boolean
  certId?: string | null
}

export async function saveGrowthProfile(studentId: string,
                                        input: { intro: string; email?: string | null; phone?: string | null }): Promise<void> {
  await api(`/students/${encodeURIComponent(studentId)}/growth/profile`, {
    method: 'PATCH', headers: key(),
    body: JSON.stringify({ ...input, expectedVersion: profileVersion(studentId) }),
  })
  await refresh(studentId)
}

export async function createGrowthEntry(studentId: string, input: EntryInput): Promise<void> {
  await api(`/students/${encodeURIComponent(studentId)}/growth/entries`, {
    method: 'POST', headers: key(),
    body: JSON.stringify({ ...input, expectedProfileVersion: profileVersion(studentId) }),
  })
  await refresh(studentId)
}

export async function updateGrowthEntry(studentId: string, entry: GrowthEntry,
                                        input: EntryInput): Promise<void> {
  await api(`/students/${encodeURIComponent(studentId)}/growth/entries/${encodeURIComponent(entry.id)}`, {
    method: 'PATCH', headers: key(),
    body: JSON.stringify({ ...input, expectedVersion: entry.version,
                           expectedProfileVersion: profileVersion(studentId) }),
  })
  await refresh(studentId)
}

/** 삭제는 논리삭제 + 사건이다. 제출·AI 입력에 쓰인 과거 본문이 사라지면 안 된다. */
export async function deleteGrowthEntry(studentId: string, entry: GrowthEntry): Promise<void> {
  await api(`/students/${encodeURIComponent(studentId)}/growth/entries/${encodeURIComponent(entry.id)}/delete`, {
    method: 'POST', headers: key(),
    body: JSON.stringify({ expectedVersion: entry.version,
                           expectedProfileVersion: profileVersion(studentId) }),
  })
  await refresh(studentId)
}

// ── 포트폴리오 · 추천 ────────────────────────────────────────────────────

export interface PortfolioResume {
  id: string; title: string; company: string | null; position: string | null
  categoryCode: string | null; categoryLabel: string | null; content: string
  origin: 'USER' | 'LEGACY'; updatedAt: string; version: number
}

export interface PortfolioDTO {
  profile: GrowthProfile
  skills: GrowthEntry[]
  certs: GrowthEntry[]
  languages: GrowthEntry[]
  awards: GrowthEntry[]
  projects: GrowthEntry[]
  records: GrowthEntry[]
  journals: GrowthEntry[]
  resumes: PortfolioResume[]
  academicCerts: { certId: string; label: string; issuer: string; acquiredAt: string | null
                   certNo: string | null; verified: boolean }[]
  version: number
  capabilities: { canEdit: boolean }
}

export function loadPortfolio(studentId: string): Promise<PortfolioDTO> {
  return api<PortfolioDTO>(`/students/${encodeURIComponent(studentId)}/portfolio`)
}

export interface Recommendation { category: string | null; title: string; reason: string | null
                                  meta: Record<string, unknown> }

/** 기존 ACTIVITY_RECO 산출물을 읽는다. 없는 결과를 시간 경과로 만들어 내지 않는다. */
export function loadRecommendations(studentId: string): Promise<{
  runId: string | null; model: string | null; items: Recommendation[]; available: boolean
}> {
  return api(`/students/${encodeURIComponent(studentId)}/growth/recommendations`)
}

export function queryGrowthEntries(studentId: string, query: {
  page?: number; pageSize?: number; kind?: GrowthKind; categoryCode?: string
  tag?: string; bookmarked?: boolean; q?: string
} = {}): Promise<{ items: GrowthEntry[]; totalCount: number; page: number; pageSize: number }> {
  return api(`/students/${encodeURIComponent(studentId)}/growth/entries?` + queryString(query))
}

// ── 비교과 찜 ────────────────────────────────────────────────────────────
// 현행 localStorage 키에는 학생 ID 가 아예 없어 계정을 바꿔도 같은 찜이 보였다.

export function wishedProgramIds(): string[] {
  return wishlist.filter(row => row.wished).map(row => row.programId)
}

export async function loadWishlist(): Promise<void> {
  wishlist = (await api<{ items: typeof wishlist }>('/program-wishlist')).items
  publish()
}

export async function setWish(programId: string, wished: boolean): Promise<void> {
  const current = wishlist.find(row => row.programId === programId)
  await api(`/program-wishlist/${encodeURIComponent(programId)}`, {
    method: 'PUT', body: JSON.stringify({ wished, expectedVersion: current?.version ?? 0 }),
  })
  await loadWishlist()
}
