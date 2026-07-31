// ─────────────────────────────────────────────────────────────────────────────
// 진단 응시 현황 로더 (SPEC §3-1-④ 검사 현황)
//
// 단일 소스
//   · 검사 목록      = src_v2/data/careerProcess.ts (DIAGNOSIS_MODULES, 학년별 대상 getGradeTests)
//   · 학생 로스터    = studentRoster.getFullRoster(departments)
//   · 응시 이벤트    = diagnosisAttempts.seed.json ⊕ localStorage 'dc_diag_attempts'
//   · 결과 코멘트    = localStorage 'dc_diag_comments'  (append-only)
//   · 검사 권유      = localStorage 'dc_diag_nudges'    (append-only)
//
// '미응시'는 저장하지 않는다 — (담당 학생 × 학년별 대상검사) 곱집합에서 응시 레코드를 뺀
// 나머지를 파생한다. 그래야 로스터가 늘어도 seed 를 다시 만들 필요가 없다.
// DB 전환 시 이 모듈만 API 로 교체하면 화면은 그대로 나간다.
// ─────────────────────────────────────────────────────────────────────────────
import { DIAGNOSIS_MODULES, getGradeTests } from '../../src_v2/data/careerProcess'
import seed from './diagnosisAttempts.seed.json'
import { mockLatency, paginate } from './query'
import type { ListParams, Paginated } from './query'
import type { AttemptStatus, DiagnosisAttempt, DiagnosisComment, DiagnosisNudge } from './schema/diagnosisAttempt'
import { getFullRoster } from './studentRoster'
import type { EnrollStatus } from './studentRoster'

const ATTEMPT_KEY = 'dc_diag_attempts'
const COMMENT_KEY = 'dc_diag_comments'
const NUDGE_KEY = 'dc_diag_nudges'

const SEED = seed as DiagnosisAttempt[]

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as T[]
    }
  } catch {
    /* 폴백: seed */
  }
  return fallback
}

function persist<T>(key: string, list: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

export function getDiagnosisAttempts(): DiagnosisAttempt[] {
  return readList(ATTEMPT_KEY, SEED)
}

/** 검사 id → 검사명. 미등록 키는 id 그대로(폴백). */
const TEST_NAME = new Map(DIAGNOSIS_MODULES.map(m => [m.testId, m.name]))
export function testNameOf(testId: string): string {
  return TEST_NAME.get(testId) ?? testId
}

/** 검사 필터 드롭다운 옵션 — 검사 단일 소스에서 파생 */
export function getTestOptions(): { testId: string; name: string }[] {
  return DIAGNOSIS_MODULES.map(m => ({ testId: m.testId, name: m.name }))
}

// ── append-only 이벤트 ────────────────────────────────────────────────────────

/** 응시 id → 최신 코멘트 */
export function getLatestComments(): Map<string, DiagnosisComment> {
  const latest = new Map<string, DiagnosisComment>()
  for (const c of readList<DiagnosisComment>(COMMENT_KEY, [])) {
    const prev = latest.get(c.attemptId)
    if (!prev || prev.createdAt < c.createdAt) latest.set(c.attemptId, c)
  }
  return latest
}

export function addComment(input: { attemptId: string; studentId: string; body: string; by: string; byName: string }): DiagnosisComment {
  const comment: DiagnosisComment = { id: `dgc_${Date.now()}`, ...input, createdAt: new Date().toISOString() }
  persist(COMMENT_KEY, [...readList<DiagnosisComment>(COMMENT_KEY, []), comment])
  return comment
}

/** `${studentId}::${testId}` → 최신 권유 */
export function getLatestNudges(): Map<string, DiagnosisNudge> {
  const latest = new Map<string, DiagnosisNudge>()
  for (const n of readList<DiagnosisNudge>(NUDGE_KEY, [])) {
    const key = `${n.studentId}::${n.testId}`
    const prev = latest.get(key)
    if (!prev || prev.sentAt < n.sentAt) latest.set(key, n)
  }
  return latest
}

export function sendDiagnosisNudge(input: { studentId: string; testId: string; by: string }): DiagnosisNudge {
  const nudge: DiagnosisNudge = { id: `dgn_${Date.now()}`, ...input, sentAt: new Date().toISOString() }
  persist(NUDGE_KEY, [...readList<DiagnosisNudge>(NUDGE_KEY, []), nudge])
  return nudge
}

// ── 조회 ─────────────────────────────────────────────────────────────────────

/** 화면 1행 = 학생 × 검사 (SPEC §3-1-④ 표시 항목) */
export interface DiagnosisStatusRow {
  /** 행 키. 응시 건은 응시 id, 미응시 건은 `${studentId}::${testId}` */
  key: string
  attemptId?: string
  studentId: string
  studentNo: string
  studentName: string
  studentMajor: string
  studentGrade: number
  enrollStatus: EnrollStatus
  testId: string
  testName: string
  status: AttemptStatus
  attemptNo: number
  /** 응시일 — 완료 건은 완료일, 진행 건은 시작일 */
  date?: string
  resultSummary?: string
  /** 재검사 여부 (attemptNo ≥ 2) */
  isRetake: boolean
  comment?: DiagnosisComment
  /** 검사 권유 발송 일시 ISO (미응시 건만 의미 있음) */
  nudgedAt?: string
}

const STATUS_ORDER: Record<AttemptStatus, number> = { 미응시: 0, 진행중: 1, 완료: 2 }

/** 담당 범위의 (학생 × 학년별 대상검사) 전체 행. 미응시 포함. */
function statusRows(departments: string[]): DiagnosisStatusRow[] {
  const attempts = getDiagnosisAttempts()
  const comments = getLatestComments()
  const nudges = getLatestNudges()

  // 학생×검사당 최신 회차만 노출한다(재검사 시 이전 회차는 이력).
  const latestAttempt = new Map<string, DiagnosisAttempt>()
  for (const a of attempts) {
    const key = `${a.studentId}::${a.testId}`
    const prev = latestAttempt.get(key)
    if (!prev || prev.attemptNo < a.attemptNo) latestAttempt.set(key, a)
  }

  const rows: DiagnosisStatusRow[] = []
  for (const student of getFullRoster(departments)) {
    for (const module of getGradeTests(student.grade)) {
      const key = `${student.id}::${module.testId}`
      const attempt = latestAttempt.get(key)
      const base = {
        key,
        studentId: student.id,
        studentNo: student.studentNo,
        studentName: student.name,
        studentMajor: student.major,
        studentGrade: student.grade,
        enrollStatus: student.status,
        testId: module.testId,
        testName: module.name,
      }
      if (!attempt) {
        rows.push({ ...base, status: '미응시', attemptNo: 0, isRetake: false, nudgedAt: nudges.get(key)?.sentAt })
        continue
      }
      rows.push({
        ...base,
        key: attempt.id,
        attemptId: attempt.id,
        status: attempt.status,
        attemptNo: attempt.attemptNo,
        date: attempt.completedAt ?? attempt.startedAt,
        resultSummary: attempt.resultSummary,
        isRetake: attempt.attemptNo >= 2,
        comment: comments.get(attempt.id),
      })
    }
  }
  return rows
}

export interface DiagnosisStatusParams extends ListParams {
  departments?: string[]
}

/** [DB-ready] 검사 현황 목록 — 페이지 단위 조회. DB 전환 시 서버가 같은 봉투를 반환한다. */
export async function queryDiagnosisStatus(params: DiagnosisStatusParams = {}): Promise<Paginated<DiagnosisStatusRow>> {
  await mockLatency()
  const q = (params.q ?? '').trim().toLowerCase()
  const f = params.filters ?? {}
  const rows = statusRows(params.departments ?? [])
    .filter(row => {
      if (f.testId && row.testId !== f.testId) return false
      if (f.status && row.status !== f.status) return false
      if (f.grade && String(row.studentGrade) !== f.grade) return false
      if (f.enrollStatus && row.enrollStatus !== f.enrollStatus) return false
      if (f.retake === 'Y' && !row.isRetake) return false
      if (q && !`${row.studentName} ${row.studentNo} ${row.studentMajor}`.toLowerCase().includes(q)) return false
      return true
    })
    // 미응시 → 진행중 → 완료 순. 상담 준비에서 먼저 봐야 하는 것이 위로 온다.
    .sort((a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.studentNo.localeCompare(b.studentNo) ||
      a.testId.localeCompare(b.testId),
    )
  return paginate(rows, params)
}

/** 검사별 응시 요약(헤더 카드) — 담당 범위 전체 집합에서 집계. DB 전환 시 COUNT 쿼리. */
export interface TestSummary {
  testId: string
  testName: string
  target: number
  done: number
  inProgress: number
  notStarted: number
  /** 완료율 % (대상 0이면 0) */
  rate: number
}

export function getTestSummaries(departments: string[]): TestSummary[] {
  const rows = statusRows(departments)
  return DIAGNOSIS_MODULES.map(module => {
    const scoped = rows.filter(row => row.testId === module.testId)
    const done = scoped.filter(row => row.status === '완료').length
    return {
      testId: module.testId,
      testName: module.name,
      target: scoped.length,
      done,
      inProgress: scoped.filter(row => row.status === '진행중').length,
      notStarted: scoped.filter(row => row.status === '미응시').length,
      rate: scoped.length === 0 ? 0 : Math.round((done / scoped.length) * 100),
    }
  })
}

/** 학생 상세 화면용 — 한 학생의 검사 이력(회차 포함, 최신순) */
export function getAttemptsByStudent(studentId: string): DiagnosisAttempt[] {
  return getDiagnosisAttempts()
    .filter(a => a.studentId === studentId)
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))
}

export type { DiagnosisAttempt, DiagnosisComment, DiagnosisNudge, AttemptStatus }
