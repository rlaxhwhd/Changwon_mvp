// ─────────────────────────────────────────────────────────────────────────────
// KPI 통계 — 집계는 서버(GET /stats/kpi). 7단계 퍼널·자동 진단·지표표(목표 대비 실적).
// 목표값은 서버 상수에서 온다(사용자 확정 2026-11-23). 화면은 DTO 를 그대로 그린다.
// ─────────────────────────────────────────────────────────────────────────────
import { queryString } from '../../shared/api'
import { useStatsResource, type StatsFilters } from './statsOverview'

export type KpiStatus = 'OK' | 'WARN' | 'ALERT' | 'NONE' | 'NA'
export const KPI_STATUS_LABEL: Record<KpiStatus, string> = { OK: '정상', WARN: '주의', ALERT: '경고', NONE: '목표 미정', NA: '집계 전' }

export interface KpiIndicator {
  key: string; name: string; formula: string
  target: number | null; unit: '%' | '점' | '개사'
  value: number | null; rate: number | null; status: KpiStatus; note: string | null
}
export interface KpiStats {
  refDate: string
  enrolled: number
  graduated: number
  funnel: { key: string; label: string; count: number | null }[]
  diagnosis: { fromStage: number; toStage: number; fromLabel: string; toLabel: string; rate: number } | null
  groups: { key: string; label: string; indicators: KpiIndicator[] }[]
}

export function useKpiStats(filters: StatsFilters, identity: string) {
  const query = queryString({ from: filters.from, to: filters.to, college: filters.college || undefined,
    dept: filters.dept || undefined, grade: filters.grade || undefined, type: filters.type || undefined })
  return useStatsResource<KpiStats>(`/stats/kpi?${query}`, identity)
}

export function formatKpiValue(i: KpiIndicator): string {
  if (i.value === null) return '집계 전'
  return i.unit === '개사' ? `${i.value.toLocaleString()}개사` : `${i.value}${i.unit}`
}
export function formatKpiTarget(i: KpiIndicator): string {
  if (i.target === null) return '—'
  return i.unit === '개사' ? `${i.target}개사` : `${i.target}${i.unit}`
}

/** 성과보고서(xlsx) 행 — 화면이 표를 조립하지 않도록 여기서 만든다. */
export function kpiReportRows(data: KpiStats, filters: StatsFilters): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['CARE+7 KPI 성과보고서'], [`기간 ${filters.from} ~ ${filters.to}`, `재학생 ${data.enrolled}명`, `조회일 ${data.refDate}`], [],
    ['7단계 참여 퍼널'], ...data.funnel.map(s => [s.label, s.count ?? '집계 전']), [],
    ['구분', '지표명', '산출식', '목표값', '달성값', '달성률(%)', '상태'],
  ]
  for (const g of data.groups) for (const i of g.indicators) {
    rows.push([g.label, i.name, i.formula, formatKpiTarget(i), formatKpiValue(i), i.rate ?? '', KPI_STATUS_LABEL[i.status]])
  }
  return rows
}
