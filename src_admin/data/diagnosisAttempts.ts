// 검사 현황·집계·코멘트·권유는 권한이 적용된 PostgreSQL API에서 조회·저장한다.
// 상세 결과는 학생별 조회 캐시, 목록은 서버 페이징을 사용한다.
import { DIAGNOSIS_MODULES, STUDENT_TYPES } from '../../src_v2/data/careerProcess'
import type { StudentType } from '../../src_v2/data/careerProcess'
import { diagnosisAttempts, diagnosisComments } from '../../shared/diagnosisStore'
import { api, queryString } from '../../shared/api'

import type { ListParams, Paginated } from './query'
import type { AttemptStatus, DiagnosisAttempt, DiagnosisComment, DiagnosisNudge } from './schema/diagnosisAttempt'
import { typeColorVar } from './studentRoster'
import type { EnrollStatus } from './studentRoster'

export function getDiagnosisAttempts(): DiagnosisAttempt[] { return diagnosisAttempts }

/** 검사 id → 검사명. 미등록 키는 id 그대로(폴백). */
const TEST_NAME = new Map(DIAGNOSIS_MODULES.map(m => [m.testId, m.name]))
export function testNameOf(testId: string): string {
  return DIAGNOSIS_MODULES.find(m => m.testId === testId)?.name ?? TEST_NAME.get(testId) ?? testId
}

/** 검사 필터 드롭다운 옵션 — 검사 단일 소스에서 파생 */
export function getTestOptions(): { testId: string; name: string }[] {
  return DIAGNOSIS_MODULES.map(m => ({ testId: m.testId, name: m.name }))
}

// ── append-only 이벤트 ────────────────────────────────────────────────────────

/** 응시 id → 최신 코멘트 */
export function getLatestComments(): Map<string, DiagnosisComment> {
  const latest = new Map<string, DiagnosisComment>()
  for (const c of diagnosisComments) {
    const prev = latest.get(c.attemptId)
    if (!prev || prev.createdAt < c.createdAt) latest.set(c.attemptId, c)
  }
  return latest
}

export async function addComment(input: { attemptId: string; studentId: string; body: string; by: string; byName: string }): Promise<DiagnosisComment> {
  const result = await api<DiagnosisComment>('/diagnosis/attempts/'+encodeURIComponent(input.attemptId)+'/comments',{method:'POST',body:JSON.stringify({body:input.body})})
  diagnosisComments.push(result)
  return result
}
const nudges: DiagnosisNudge[] = []

/** `${studentId}::${testId}` → 최신 권유 */
export function getLatestNudges(): Map<string, DiagnosisNudge> {
  const latest = new Map<string, DiagnosisNudge>()
  for (const n of nudges) {
    const key = `${n.studentId}::${n.testId}`
    const prev = latest.get(key)
    if (!prev || prev.sentAt < n.sentAt) latest.set(key, n)
  }
  return latest
}

export async function sendDiagnosisNudge(input: { studentId: string; testId: string; by: string }): Promise<DiagnosisNudge> {
  const result = await api<DiagnosisNudge>('/diagnosis/students/'+encodeURIComponent(input.studentId)+'/nudges/'+encodeURIComponent(input.testId),{method:'POST'})
  nudges.push(result)
  return result
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



const retakeRows: DiagnosisStatusRow[] = []
export function getRetakeRows(_departments: string[]): DiagnosisStatusRow[] { return retakeRows }
export async function loadRetakeNotifications() {
  const response = await api<Paginated<DiagnosisStatusRow>>('/diagnosis/status?filters.retake=Y&pageSize=100')
  retakeRows.splice(0,retakeRows.length,...response.items)
}

export interface DiagnosisStatusParams extends ListParams {
  departments?: string[]
}

/** [DB-ready] 검사 현황 목록 — 페이지 단위 조회. DB 전환 시 서버가 같은 봉투를 반환한다. */
export async function queryDiagnosisStatus(params: DiagnosisStatusParams = {}): Promise<Paginated<DiagnosisStatusRow>> {
  return api('/diagnosis/status?'+queryString(params))
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
  /**
   * 막대 색 (CSS 값). 후속진단 Cn 은 그 진단을 받는 유형 Tn 의 색을 쓴다 —
   * 홈 '담당 학생 유형 분포' 카드와 같은 색이라 화면을 오가도 유형이 같은 색으로 읽힌다.
   * C-CORE 는 전 학생 필수라 특정 유형이 없다 → 차트 기본 채움색.
   */
  color: string
}

/**
 * 후속진단 → 유형 역인덱스. STUDENT_TYPE_MAP 의 followUpTest 에서 파생한다
 * (C1=T1 같은 대응을 여기에 다시 적지 않는다 — 매핑의 단일 소스는 careerProcess).
 */
const TYPE_BY_FOLLOW_UP = new Map<string, StudentType>(
  STUDENT_TYPES.map(meta => [meta.followUpTest.toLowerCase(), meta.code]),
)

/** 검사 코드 → 막대 색. 유형이 딸린 후속진단만 유형 색을 갖는다. */
function testColor(testId: string): string {
  const type = TYPE_BY_FOLLOW_UP.get(testId.toLowerCase())
  return type ? typeColorVar(type) : 'var(--chart-fill)'
}

/** 학생 상세 화면용 — 한 학생의 검사 이력(회차 포함, 최신순) */
export function getAttemptsByStudent(studentId: string): DiagnosisAttempt[] {
  return getDiagnosisAttempts()
    .filter(a => a.studentId === studentId)
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))
}

export type { DiagnosisAttempt, DiagnosisComment, DiagnosisNudge, AttemptStatus }


export async function fetchTestSummaries(departments: string[]): Promise<TestSummary[]> {
  const rows = await api<Omit<TestSummary,'color'>[]>('/diagnosis/summary?'+queryString({departments}))
  return rows.map(row => ({...row,color:testColor(row.testId)}))
}
