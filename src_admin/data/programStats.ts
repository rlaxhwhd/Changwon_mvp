// ─────────────────────────────────────────────────────────────────────────
// 프로그램 관리 「통계확인」 — 선택한 프로그램들의 통계표. 집계는 여기 한 곳이다(CLAUDE.md 규칙 10).
//
// 인원·참여율·이수율: 스토어의 선발자 결과로 계산한다(programRates — 선발자 관리 탭과 같은 식).
// 만족도·역량향상률: 서버(POST /programs/survey-summary)가 프로그램별로 끝낸 값을 받는다(탭 통계와 같은 식).
// 전체 행: 인원은 합계, 순인원은 학생 중복 제거, 지표는 값이 있는 프로그램만의 평균이다
//   — 조사를 안 했거나 응답이 없는 프로그램은 그 지표 평균에서 빠진다(사용자 확정 2026-11-26).
// 만족도는 100점 환산(5점 평균 × 20)이다 — 통계(KPI) 화면의 「프로그램 만족도」와 같은 단위.
// ─────────────────────────────────────────────────────────────────────────
import { api } from '../../shared/api'
import { selectedApplicants } from './programs'
import { programRates } from './programRates'
import { collegeOf } from './studentRoster'
import type { Program } from './schema/program'
import type { StudentState } from './programManageFilter'

export const GROWTH_GROUPS = [
  { key: 'CAREER', label: '진로' },
  { key: 'JOB', label: '직무' },
  { key: 'EMPLOY', label: '취업' },
] as const
export type GrowthGroup = typeof GROWTH_GROUPS[number]['key']

interface SurveySummary {
  programId: string
  /** n = 응답자 수 */
  satisfaction: { score: number; n: number } | null
  /** n = 사전·사후를 모두 낸 학생 수 */
  growth: Record<GrowthGroup, { improvement: number | null; n: number } | null>
}

/** 지표 열 — 전체 행에서 「값이 있는 프로그램만의 평균」을 내는 대상. */
export type MetricKey = 'satisfaction' | GrowthGroup | 'participationRate' | 'completionRate'

export const METRICS: { key: MetricKey; label: string; unit: '점' | '%' }[] = [
  { key: 'satisfaction', label: '만족도', unit: '점' },
  ...GROWTH_GROUPS.map(g => ({ key: g.key, label: `역량향상률(${g.label})`, unit: '%' as const })),
  { key: 'participationRate', label: '참여율', unit: '%' },
  { key: 'completionRate', label: '이수율', unit: '%' },
]

export interface ProgramStatRow {
  program: Program
  /** 참가인원 = 수료 + 미수료(미수료·참석) — 선발자 관리 탭의 참여인원과 같다. */
  participants: number
  notCompleted: number
  completed: number
  completedStudentIds: string[]
  metrics: Record<MetricKey, number | null>
}

/** 인원 숫자를 누르면 받는 명단 — 서버 명단 엑셀(POST /programs/export)의 학생상태로 고른다. */
export type RosterKind = 'participants' | 'notCompleted' | 'completed'
export const ROSTER_STATES: Record<RosterKind, StudentState[]> = {
  participants: ['COMPLETED', 'NOT_COMPLETED', 'ATTENDED'],
  notCompleted: ['NOT_COMPLETED', 'ATTENDED'],
  completed: ['COMPLETED'],
}
export const ROSTER_LABEL: Record<RosterKind, string> = {
  participants: '참가인원', notCompleted: '미수료인원', completed: '수료인원',
}

/** 서버 한도(1000건)씩 나눠 묻는다. 결과는 프로그램 id → 요약. */
export async function fetchSurveySummary(programIds: string[]): Promise<Map<string, SurveySummary>> {
  const result = new Map<string, SurveySummary>()
  for (let start = 0; start < programIds.length; start += 1000) {
    const { items } = await api<{ items: SurveySummary[] }>('/programs/survey-summary', {
      method: 'POST', body: JSON.stringify({ programIds: programIds.slice(start, start + 1000) }),
    })
    for (const item of items) result.set(item.programId, item)
  }
  return result
}

export function buildStatRows(programs: Program[], summary: Map<string, SurveySummary>): ProgramStatRow[] {
  return programs.map(program => {
    const selected = selectedApplicants(program)
    const rates = programRates(selected)
    const survey = summary.get(program.id)
    const growth = (key: GrowthGroup) => survey?.growth[key]?.improvement ?? null
    return {
      program,
      participants: rates.participants,
      notCompleted: rates.participants - rates.completed,
      completed: rates.completed,
      completedStudentIds: selected.filter(a => a.outcomeStatus === 'COMPLETED').map(a => a.studentId),
      metrics: {
        satisfaction: survey?.satisfaction?.score ?? null,
        CAREER: growth('CAREER'), JOB: growth('JOB'), EMPLOY: growth('EMPLOY'),
        // 분모가 없거나 이수 결과를 아직 하나도 입력하지 않았으면 0% 가 아니라 「값 없음」 — 평균을 끌어내리지 않게 뺀다.
        participationRate: selected.some(a => a.outcomeStatus) ? rates.participationRate : null,
        completionRate: rates.participants ? rates.completionRate : null,
      },
    }
  })
}

export interface MetricAverage { value: number | null; count: number }

export interface StatTotals {
  programs: number
  participants: number
  notCompleted: number
  completed: number
  uniqueCompleted: number
  metrics: Record<MetricKey, MetricAverage>
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function metricAverage(rows: ProgramStatRow[], key: MetricKey): MetricAverage {
  const values = rows.map(r => r.metrics[key]).filter((v): v is number => v !== null)
  return { value: values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null, count: values.length }
}

export function statTotals(rows: ProgramStatRow[]): StatTotals {
  const sum = (pick: (r: ProgramStatRow) => number) => rows.reduce((total, r) => total + pick(r), 0)
  return {
    programs: rows.length,
    participants: sum(r => r.participants),
    notCompleted: sum(r => r.notCompleted),
    completed: sum(r => r.completed),
    uniqueCompleted: new Set(rows.flatMap(r => r.completedStudentIds)).size,
    metrics: Object.fromEntries(METRICS.map(m => [m.key, metricAverage(rows, m.key)])) as Record<MetricKey, MetricAverage>,
  }
}

export interface Share { label: string; count: number; percent: number }

const UNKNOWN_GRADE = '학년 미상'

/** 수료인원(중복 포함) 기준 학년별·단과대학별 비율. 학년은 현재 학적, 대학은 학과에서 파생한다(명단 엑셀과 같다). */
export function completionBreakdown(rows: ProgramStatRow[]): { total: number; grade: Share[]; college: Share[] } {
  const completed = rows.flatMap(r => selectedApplicants(r.program).filter(a => a.outcomeStatus === 'COMPLETED'))
  const tally = (labelOf: (a: typeof completed[number]) => string): Share[] => {
    const counts = new Map<string, number>()
    for (const a of completed) counts.set(labelOf(a), (counts.get(labelOf(a)) ?? 0) + 1)
    return [...counts.entries()].map(([label, count]) => ({ label, count, percent: round1(count / completed.length * 100) }))
  }
  const grade = tally(a => (a.studentGrade == null ? UNKNOWN_GRADE : `${a.studentGrade}학년`))
    .sort((a, b) => (a.label === UNKNOWN_GRADE ? 1 : b.label === UNKNOWN_GRADE ? -1 : a.label.localeCompare(b.label, 'ko', { numeric: true })))
  const college = tally(a => collegeOf(a.studentMajor)).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'))
  return { total: completed.length, grade, college }
}

const cell = (value: number | null) => (value === null ? '-' : String(value))

export function programPeriod(program: Program): string {
  if (!program.runStartDate && !program.runEndDate) return '미정'
  return `${program.runStartDate || '미정'} ~ ${program.runEndDate || '미정'}`
}

const averageNote = (a: MetricAverage) => (a.value === null ? '-' : `${a.value} (${a.count}개 평균)`)

/** 통계표 전체 엑셀 — 프로그램 1행씩, 맨 아래 전체 행, 그 아래 학년별·단과대학별 비율. */
export function statsSheetRows(rows: ProgramStatRow[]): string[][] {
  const totals = statTotals(rows)
  const breakdown = completionBreakdown(rows)
  const header = ['프로그램명', '회계년도', '운영기간', '참가인원(중복포함)', '미수료인원(중복포함)', '수료인원(중복인원)', '수료인원(순인원)',
    ...METRICS.map(m => `${m.label}(${m.unit})`)]
  const body = rows.map(r => [r.program.title, r.program.fiscalYear, programPeriod(r.program),
    String(r.participants), String(r.notCompleted), String(r.completed), String(new Set(r.completedStudentIds).size),
    ...METRICS.map(m => cell(r.metrics[m.key]))])
  const total = [`전체 (${totals.programs}개 프로그램)`, '', '', String(totals.participants), String(totals.notCompleted),
    String(totals.completed), String(totals.uniqueCompleted), ...METRICS.map(m => averageNote(totals.metrics[m.key]))]
  const shares = (title: string, list: Share[]) => [[], [`${title} — 수료인원(중복인원) ${breakdown.total}명 기준`], ['구분', '인원', '비율(%)'],
    ...list.map(s => [s.label, String(s.count), String(s.percent)])]
  return [header, ...body, total,
    ['※ 지표의 전체값은 그 지표가 있는 프로그램만의 평균입니다. 만족도는 100점 환산(5점 평균 × 20)입니다.'],
    ...shares('학년별 비율', breakdown.grade), ...shares('단과대학별 비율', breakdown.college)]
}

/** 지표 하나의 엑셀 — 프로그램별 값과 맨 아래 전체 평균(값이 있는 프로그램만). */
export function metricSheetRows(rows: ProgramStatRow[], key: MetricKey): string[][] {
  const metric = METRICS.find(m => m.key === key)!
  const average = metricAverage(rows, key)
  return [
    ['프로그램명', '회계년도', '운영기간', `${metric.label}(${metric.unit})`],
    ...rows.map(r => [r.program.title, r.program.fiscalYear, programPeriod(r.program), cell(r.metrics[key])]),
    [`전체 평균 (값이 있는 ${average.count}개 프로그램)`, '', '', cell(average.value)],
  ]
}
