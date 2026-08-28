// ─────────────────────────────────────────────────────────────────────────
// 로드맵 스키마 (단일 소스) — PROCESS.md §6
//
// 로드맵은 학생당 1개, 3개 축으로 나뉜다. 축당 5칸에서 시작한다.
// IAP 실행 축만 이후에 늘어난다 — 상담사가 비교과 프로그램을 개설하면서
// '로드맵 편입'(추천/필수)을 지정하면 그 유형 학생의 IAP 축에 칸이 추가된다.
//
// ⚠️ IAP 는 이 축의 이름일 뿐이다. 폐기된 IAP 유형 R1~R6 과 무관하다.
// ⚠️ 단기/중기/장기(TermDetail) 3분할은 폐기됐다 — 이 3축이 유일한 분할이다.
// ─────────────────────────────────────────────────────────────────────────

/** 로드맵 축 — 로드맵 1개는 이 3축으로만 나뉜다 (SPEC.md §7-13) */
export type RoadmapAxis = 'IAP' | 'CORE' | 'GROWTH'

export interface RoadmapAxisMeta {
  code: RoadmapAxis
  /** 표시명 — 화면에 한글 리터럴을 박지 말고 이걸 쓴다 */
  label: string
  /** 축 설명 (카드 부제) */
  desc: string
  /** 이 축이 읽는 재료 (PROCESS.md §6-1) */
  source: string
  /** 학기 중 칸이 늘어나는 축인가 — IAP 만 true */
  growable: boolean
}

export const ROADMAP_AXIS_MAP: Record<RoadmapAxis, RoadmapAxisMeta> = {
  IAP: {
    code: 'IAP', label: 'IAP 실행', growable: true,
    desc: '비교과 프로그램 · 후속진단 · 상담 신청',
    source: '진단·상담 결과',
  },
  CORE: {
    code: 'CORE', label: '핵심역량 수행', growable: false,
    desc: '학과 개설 강의를 목표 직무에 맞춰 좁힌 수강 계획',
    source: '교과목·학과',
  },
  GROWTH: {
    code: 'GROWTH', label: '내 성장 활동', growable: false,
    desc: '자격증 · 공모전 · 어학 · AI 자소서 등 스펙업',
    source: '외부활동 스펙',
  },
}

/** 표시 순서. 화면·집계는 이 배열을 쓴다. */
export const ROADMAP_AXES: RoadmapAxisMeta[] = ['IAP', 'CORE', 'GROWTH'].map(
  code => ROADMAP_AXIS_MAP[code as RoadmapAxis],
)

/** 축 코드 → 표시명 */
export function axisLabel(code: RoadmapAxis): string {
  return ROADMAP_AXIS_MAP[code]?.label ?? code
}

/** 생성 직후 축당 기본 칸 수 */
export const BASE_CELLS_PER_AXIS = 5

// ── 로드맵 편입 (비교과 프로그램 → IAP 축) ────────────────────────────────

/** 프로그램 개설 시 지정하는 로드맵 편입 값 — PROCESS.md §6-4 */
export type RoadmapEntry = 'NONE' | 'RECOMMEND' | 'REQUIRED'

export const ROADMAP_ENTRIES: RoadmapEntry[] = ['NONE', 'RECOMMEND', 'REQUIRED']

export const ROADMAP_ENTRY_LABEL: Record<RoadmapEntry, string> = {
  NONE: '미편입',
  RECOMMEND: '추천',
  REQUIRED: '필수',
}

export const ROADMAP_ENTRY_DESC: Record<RoadmapEntry, string> = {
  NONE: '로드맵에 칸을 만들지 않습니다.',
  RECOMMEND: '신청 마감일시까지만 로드맵에 남습니다. 마감이 지나면 미수행 칸은 사라집니다.',
  REQUIRED: '마감 후에도 로드맵에 남습니다. 이행률 분모에 계속 포함됩니다.',
}

// ── 칸 ───────────────────────────────────────────────────────────────────

/** 칸 상태 — 완료 기준은 비교과 '수료'다 (PROCESS.md §6-4) */
export type CellStatus = 'TODO' | 'DONE'

export type CellPriority = 'P0' | 'P1' | 'P2'
export type CellImportance = '필수' | '중요' | '권장'

export interface RoadmapCell {
  id: string
  title: string
  priority: CellPriority
  importance: CellImportance
  /** 왜 이 칸이 필요한가 (AI 근거) */
  why: string
  status: CellStatus
  /** 프로그램 개설로 자동 생성된 칸이면 그 프로그램 id.
   *  이 칸은 상담사가 편집·삭제하지 않는다 — 정본은 프로그램 쪽이다. */
  programId?: string
  /** programId 가 있을 때의 편입 값 */
  entry?: RoadmapEntry
  /** '추천' 칸의 유효기간 = 프로그램 신청 마감일시 (ISO 또는 YYYY-MM-DD) */
  expiresAt?: string
}

export interface RoadmapAxisPlan {
  axis: RoadmapAxis
  /** 축 한 줄 요약 */
  headline: string
  /** 이 축을 이렇게 짠 이유 (AI 근거) */
  rationale: string
  cells: RoadmapCell[]
}

/** 학생 1명의 로드맵 = 축 3개 */
export type RoadmapPlan = RoadmapAxisPlan[]

// ── 이행률 ───────────────────────────────────────────────────────────────

/**
 * 칸이 아직 살아 있는가 — PROCESS.md §6-4·§6-5.
 *
 * '추천' 칸은 프로그램 신청 마감이 지나면 증발한다. 단 **이미 수행(DONE)한 칸은
 * 증발하지 않는다** — 학생이 실제로 한 실적이 이행률에서 사라지면 안 되기 때문이다.
 */
export function isCellAlive(cell: RoadmapCell, now: Date = new Date()): boolean {
  if (cell.status === 'DONE') return true
  if (cell.entry !== 'RECOMMEND' || !cell.expiresAt) return true
  const due = new Date(cell.expiresAt)
  return Number.isNaN(due.getTime()) ? true : due.getTime() >= now.getTime()
}

export interface RoadmapProgress {
  done: number
  /** 살아 있는 전체 칸 */
  total: number
  pct: number
}

/** 이행률 = 수행 완료 칸 ÷ 살아 있는 전체 칸 (PROCESS.md §6-5) */
export function progressOf(cells: RoadmapCell[], now: Date = new Date()): RoadmapProgress {
  const alive = cells.filter(c => isCellAlive(c, now))
  const done = alive.filter(c => c.status === 'DONE').length
  return {
    done,
    total: alive.length,
    pct: alive.length === 0 ? 0 : Math.round((done / alive.length) * 100),
  }
}

/** 로드맵 전체 이행률 */
export function planProgress(plan: RoadmapPlan, now: Date = new Date()): RoadmapProgress {
  return progressOf(plan.flatMap(a => a.cells), now)
}

/** 축별 이행률 */
export function axisProgress(axis: RoadmapAxisPlan, now: Date = new Date()): RoadmapProgress {
  return progressOf(axis.cells, now)
}
