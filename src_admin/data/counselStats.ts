// ─────────────────────────────────────────────────────────────────────────────
// 상담 통계 집계 (SPEC §3-1-⑥ 상담 통계)
//
// ★ 집계는 전부 이 층에서 한다. 화면은 계산하지 않고 결과만 그린다 (SPEC §3-1-⑥ 소스 규정).
//   → DB 전환 시 이 모듈의 각 함수가 집계 SQL/엔드포인트 1개로 1:1 치환된다.
//
// 소스
//   · 신청·상태 전이 = counselRequests.getCounselRequests()  (대기/확정/완료/취소)
//   · 완료 기록      = counselRecords.getCounselRecords()    (소견·코멘트 작성 여부)
//   · 학년           = studentRoster.studentLiteOf(studentId) — 신청 레코드에 학년이 없다
//
// ⚠ 완료율·취소율의 모수는 "기간 내 신청 건"이다. 완료 기록(dc_counsel_records)만으로는
//   취소가 보이지 않아 분모가 왜곡된다.
// ─────────────────────────────────────────────────────────────────────────────
import { getCounselRecords } from './counselRecords'
import { getCounselRequests } from './counselRequests'
import type { CounselRequest, CounselMethod, CounselRequestType } from './schema/counselRequest'

/** 기간 프리셋 — 값은 개월 수, 'all'은 전체 */
export type PeriodPreset = '3' | '6' | '12' | 'all'
export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '3', label: '최근 3개월' },
  { value: '6', label: '최근 6개월' },
  { value: '12', label: '최근 12개월' },
  { value: 'all', label: '전체 기간' },
]

/** 집계 범위 — 내 배정분만 / 전 상담사 */
export type StatsScope = 'mine' | 'all'

export interface StatsParams {
  /** 'mine'일 때 기준이 되는 상담사 id */
  counselorId: string
  scope: StatsScope
  /** 유형 한정. 미지정이면 전 유형 */
  type?: CounselRequestType
  period: PeriodPreset
}

/** 이름-값 한 줄 (막대/표 공용) */
export interface Bucket {
  label: string
  count: number
}

export interface MonthBucket {
  /** YYYY-MM */
  key: string
  requested: number
  completed: number
  cancelled: number
}

export interface CounselStats {
  /** 집계 대상 기간 시작 YYYY-MM-DD (전체 기간이면 undefined) */
  from?: string
  totals: {
    requested: number
    waiting: number
    confirmed: number
    completed: number
    cancelled: number
    /** 완료 / 신청 (%) */
    completionRate: number
    /** 취소 / 신청 (%) */
    cancelRate: number
    /** 신청 → 상담일 평균 소요일 (완료 건 기준, 소수 1자리) */
    avgLeadDays: number
    /** 완료 건 중 기록지가 남은 비율 (%) */
    recordedRate: number
  }
  byMonth: MonthBucket[]
  byType: Bucket[]
  byMethod: Bucket[]
  byMajor: Bucket[]
  byGrade: Bucket[]
}

/** 기간 프리셋 → 시작일(YYYY-MM-DD). 'all'은 undefined. */
function periodStart(period: PeriodPreset): string | undefined {
  if (period === 'all') return undefined
  const d = new Date()
  d.setMonth(d.getMonth() - Number(period))
  return d.toISOString().slice(0, 10)
}

/** 신청 건의 기준일 — 신청일(YYYY-MM-DD). 기간 필터·월별 집계의 축. */
function requestDay(r: CounselRequest): string {
  return r.requestedAt.slice(0, 10)
}

function scopedRequests(params: StatsParams): CounselRequest[] {
  const from = periodStart(params.period)
  return getCounselRequests().filter(r => {
    if (params.type && r.type !== params.type) return false
    if (params.scope === 'mine' && r.assignedCounselorId !== params.counselorId) return false
    if (from && requestDay(r) < from) return false
    return true
  })
}

/** 배열을 키별 건수로 집계하고 많은 순으로 정렬 */
function tally(items: string[]): Bucket[] {
  const map = new Map<string, number>()
  for (const key of items) map.set(key, (map.get(key) ?? 0) + 1)
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100))

/** 신청일 → 상담일 소요일. 슬롯이 없으면 undefined. */
function leadDays(r: CounselRequest): number | undefined {
  if (!r.slot) return undefined
  const days = (new Date(`${r.slot.date}T00:00:00`).getTime() - new Date(requestDay(r) + 'T00:00:00').getTime()) / 86_400_000
  return Number.isFinite(days) && days >= 0 ? days : undefined
}

/** 최근 12개월 이내 월 키 목록을 만든다(빈 달도 0으로 표시되도록). */
function monthKeys(requests: CounselRequest[], period: PeriodPreset): string[] {
  const days = requests.map(requestDay).sort()
  if (days.length === 0) return []
  const span = period === 'all' ? undefined : Number(period)
  const last = new Date()
  const first = span ? new Date(last.getFullYear(), last.getMonth() - (span - 1), 1) : new Date(`${days[0]}T00:00:00`)
  const keys: string[] = []
  for (const d = new Date(first.getFullYear(), first.getMonth(), 1); d <= last; d.setMonth(d.getMonth() + 1)) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

/** 상담 통계 집계 — 화면은 이 결과만 그린다. */
export function getCounselStats(params: StatsParams): CounselStats {
  const requests = scopedRequests(params)
  const completed = requests.filter(r => r.status === '완료')
  const cancelled = requests.filter(r => r.status === '취소')

  const leads = completed.map(leadDays).filter((n): n is number => n !== undefined)
  const recordedIds = new Set(getCounselRecords().filter(rec => rec.status === '완료').map(rec => rec.requestId))

  const byMonthMap = new Map<string, MonthBucket>(
    monthKeys(requests, params.period).map(key => [key, { key, requested: 0, completed: 0, cancelled: 0 }]),
  )
  for (const r of requests) {
    const key = requestDay(r).slice(0, 7)
    const bucket = byMonthMap.get(key) ?? { key, requested: 0, completed: 0, cancelled: 0 }
    bucket.requested += 1
    if (r.status === '완료') bucket.completed += 1
    if (r.status === '취소') bucket.cancelled += 1
    byMonthMap.set(key, bucket)
  }

  return {
    from: periodStart(params.period),
    totals: {
      requested: requests.length,
      waiting: requests.filter(r => r.status === '대기').length,
      confirmed: requests.filter(r => r.status === '확정').length,
      completed: completed.length,
      cancelled: cancelled.length,
      completionRate: pct(completed.length, requests.length),
      cancelRate: pct(cancelled.length, requests.length),
      avgLeadDays: leads.length === 0 ? 0 : Math.round((leads.reduce((a, b) => a + b, 0) / leads.length) * 10) / 10,
      recordedRate: pct(completed.filter(r => recordedIds.has(r.id)).length, completed.length),
    },
    byMonth: [...byMonthMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
    byType: tally(requests.map(r => r.type as string)),
    byMethod: tally(requests.map(r => r.method as CounselMethod as string)),
    byMajor: tally(requests.map(r => r.studentMajor)),
    byGrade: tally(requests.map(r => {
      const grade = r.studentGrade
      return grade ? `${grade}학년` : '미상'
    })).sort((a, b) => a.label.localeCompare(b.label)),
  }
}

/** 통계 CSV — 화면이 문자열을 조립하지 않도록 여기서 만든다. */
export function toStatsCsv(stats: CounselStats): string {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const section = (title: string, rows: (string | number)[][]) => [[title], ...rows, []]
  const rows: (string | number)[][] = [
    ...section('요약', [
      ['신청', stats.totals.requested],
      ['대기', stats.totals.waiting],
      ['확정', stats.totals.confirmed],
      ['완료', stats.totals.completed],
      ['취소', stats.totals.cancelled],
      ['완료율(%)', stats.totals.completionRate],
      ['취소율(%)', stats.totals.cancelRate],
      ['평균 소요일', stats.totals.avgLeadDays],
      ['기록지 작성률(%)', stats.totals.recordedRate],
    ]),
    ...section('월별', [['월', '신청', '완료', '취소'], ...stats.byMonth.map(m => [m.key, m.requested, m.completed, m.cancelled])]),
    ...section('유형별', [['유형', '건수'], ...stats.byType.map(b => [b.label, b.count])]),
    ...section('방식별', [['방식', '건수'], ...stats.byMethod.map(b => [b.label, b.count])]),
    ...section('학년별', [['학년', '건수'], ...stats.byGrade.map(b => [b.label, b.count])]),
    ...section('학과별', [['학과', '건수'], ...stats.byMajor.map(b => [b.label, b.count])]),
  ]
  return rows.map(row => row.map(escape).join(',')).join('\n')
}
