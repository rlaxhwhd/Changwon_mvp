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
  if (result.testId === 'c3') return DEFT_AREAS.map(area => ({
    labels: area.labels,
    value: mean(area.codes.map(code => result.factors.find(f => f.factorCode === `HRTEST_SCALES_${code}`)?.tScore)),
  }))
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

const DEFT_AREAS = [
  { labels: ['Direction', '진로몰입수준'], codes: ['career_clarity', 'career_motivation'] },
  { labels: ['Enrichment', '네트워킹 활용 수준'], codes: ['campus_networking', 'offline_networking', 'online_networking', 'industry_networking'] },
  { labels: ['Foundation', '문제해결능력'], codes: ['analytical_thinking', 'creative_thinking', 'execution'] },
  { labels: ['Foundation', '대인상호작용능력'], codes: ['relational_flexibility', 'collaboration'] },
  { labels: ['Target fitness', '고용적합성'], codes: ['job_fit', 'org_fit'] },
]

function mean(scores: (number | null | undefined)[]): number | null {
  return scores.every((score): score is number => score != null && Number.isFinite(score))
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
}

const CARES_GROUPS = [
  { id: 'CLT', title: '자신의 진로 학습 유형', type: 'learning_type', codes: ['learning_experience', 'learning_reflection', 'learning_abstraction'] },
  { id: 'COT', title: '자신의 진로목표 지향성 유형', type: 'goal_orientation', codes: ['goal_mastery', 'goal_performance', 'goal_avoidance'] },
  { id: 'CDT', title: '자신의 진로 의사결정 유형', type: 'decision_type', codes: ['decision_rational', 'decision_intuitive', 'decision_creative', 'decision_social'] },
]

export interface DiagnosisChartSection {
  id: string
  title?: string
  type?: string | null
  axes: DiagnosisChartAxis[]
  rows: ResultRow[]
}

export function getDiagnosisChartSections(result: DiagnosisResult, rows: ResultRow[]): DiagnosisChartSection[] {
  if (result.testId !== 'c2' || result.source !== 'hrtest') {
    return [{ id: result.testId, axes: getDiagnosisChartAxes(result, rows), rows }]
  }
  const used = new Set<string>()
  const sections: DiagnosisChartSection[] = CARES_GROUPS.map(group => {
    const members = group.codes.flatMap(code => {
      const key = `HRTEST_SCALES_${code}`
      used.add(key)
      return rows.filter(row => row.factorCode === key)
    })
    return { id: group.id, title: group.title, type: result.providerTypes?.[group.type],
      axes: members.map(row => ({ labels: [row.name], value: row.tScore })), rows: members }
  })
  const remaining = rows.filter(row => !row.factorCode || !used.has(row.factorCode))
  if (remaining.length) sections.push({ id: 'additional', title: '진로탐색행동 · 진로설계 수준', axes: [], rows: remaining })
  return sections
}
