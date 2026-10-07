import type { DiagnosisResult } from './schema/diagnosisResult'
import type { ResultRow } from './diagnosisResults'

export interface DiagnosisChartAxis {
  labels: string[]
  value: number | null
}

const CORE_PAIRS = [
  [['career_clarity', '진로명확성'], ['career_motivation', '진로동기']],
  [['competency_readiness', '역량준비도'], ['employability_readiness', '취업역량준비도']],
  [['job_fit', '직무적합성'], ['org_fit', '조직적합성']],
  [['info_search', '정보탐색 및 분석'], ['personal_branding', '개인 브랜딩']],
  [['interview', '면접역량'], ['job_strategy', '구직전략']],
] as const

/** Display-only means approved 2026-10-07; original factors and levels stay intact. */
export function getDiagnosisChartAxes(result: DiagnosisResult, rows: ResultRow[]): DiagnosisChartAxis[] {
  if (result.testId !== 'ccore') return rows.map(row => ({ labels: [row.name], value: row.tScore }))
  const factors = new Map(result.factors.map(factor => [factor.factorCode, factor]))
  return CORE_PAIRS.map(pair => {
    const members = pair.map(([code]) => factors.get(`HRTEST_SCALES_${code}`))
    const scores = members.map(member => member?.tScore)
    const complete = scores.every((value): value is number => value != null && Number.isFinite(value))
    return {
      labels: pair.map(([, name], index) => members[index]?.name ?? name),
      value: complete ? (scores[0] + scores[1]) / 2 : null,
    }
  })
}
