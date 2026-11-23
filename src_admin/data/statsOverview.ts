// ─────────────────────────────────────────────────────────────────────────────
// 통계 현황 대시보드 — 집계는 전부 서버(GET /stats/overview)가 한다. 이 모듈은 요청 조건과
// 응답 형식만 안다. 화면은 셀렉터 없이 훅이 준 DTO를 그대로 그린다(집계는 데이터 층, 규칙 10).
// 필터가 바뀌면 이전 결과를 흐리게 유지한 채 다시 조회한다(스켈레톤 깜빡임 금지).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { api, queryString } from '../../shared/api'

export type StatsArea = 'diagnosis' | 'counsel' | 'roadmap' | 'program' | 'job'
export type StatsScope = 'mine' | 'all'

export const STATS_AREAS: { value: StatsArea; label: string }[] = [
  { value: 'diagnosis', label: '진단' }, { value: 'counsel', label: '상담' }, { value: 'roadmap', label: '로드맵' },
  { value: 'program', label: '비교과' }, { value: 'job', label: '채용' },
]

export interface StatsFilters {
  from: string
  to: string
  college: string
  dept: string
  grade: string
  type: string
}

/** 기본 기간 — 6개월 전 오늘 ~ 오늘(로컬 날짜) */
export function defaultStatsFilters(): StatsFilters {
  const pad = (n: number) => String(n).padStart(2, '0')
  const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - 6)
  return { from: key(from), to: key(to), college: '', dept: '', grade: '', type: '' }
}

export interface Bucket { key: string; label: string; count: number }
export interface MonthSeries { months: string[]; series: { key: string; values: number[] }[] }

export interface DiagnosisStats {
  kpis: { attempts: number; students: number; coreStudents: number; followups: number; c5Students: number; participationRate: number }
  byMonth: MonthSeries; byTest: Bucket[]; byType: Bucket[]; byGrade: Bucket[]
}
export interface CounselStats {
  kpis: { requested: number; waiting: number; confirmed: number; done: number; cancelled: number; students: number
    completionRate: number; cancelRate: number; avgLeadDays: number; recordedRate: number }
  byMonth: MonthSeries; byStatus: Bucket[]; byMethod: Bucket[]; byKind: Bucket[]; byTopic: Bucket[]; byDept: Bucket[]
  heatmap: { dow: number; hour: number; count: number }[]
}
export interface RoadmapStats {
  kpis: { total: number; confirmed: number; confirmRate: number; avgProgress: number; itemsDone: number; itemsTotal: number
    requests: number; requestsPending: number }
  byMonth: MonthSeries; byStatus: Bucket[]; progressBins: Bucket[]
  byAxis: { key: string; label: string; done: number; open: number }[]
}
export interface ProgramStats {
  kpis: { applied: number; students: number; programs: number; selected: number; attended: number; noShow: number
    completed: number; completionRate: number; penalty: number }
  byMonth: MonthSeries; funnel: Bucket[]; byCategory: Bucket[]; byMiddle: Bucket[]; byGrade: Bucket[]
  topPrograms: { id: string; title: string; capacity: number; selectionCapacity: number | null; applied: number; selected: number; completed: number }[]
}
export interface JobStats {
  kpis: { postings: number; recommended: number; applications: number; applicants: number; passed: number; open: number
    passRate: number; views: number; viewers: number }
  applicationsByMonth: MonthSeries; viewsByMonth: MonthSeries
  postingsByType: Bucket[]; applicationsByType: Bucket[]; applicationsByStatus: Bucket[]; byCompanyType: Bucket[]
  topPostings: { id: string; company: string; role: string; recruitType: string; views: number; applications: number }[]
}

export interface StatsOverview<T = unknown> {
  refDate: string
  role: 'career' | 'psych'
  scope: StatsScope
  area: StatsArea
  population: number
  pipeline: { students: number; stages: Bucket[] }
  data: T
}

export function statsQuery(area: StatsArea, scope: StatsScope, f: StatsFilters): string {
  return queryString({
    area, scope, from: f.from, to: f.to,
    college: f.college || undefined, dept: f.dept || undefined,
    grade: f.grade || undefined, type: f.type || undefined,
  })
}

/** 조건이 바뀌면 다시 조회. 조회 중에는 이전 데이터를 유지하고 loading 만 올린다. */
export function useStatsOverview(area: StatsArea, scope: StatsScope, filters: StatsFilters, identity: string) {
  const query = statsQuery(area, scope, filters)
  const [state, setState] = useState<{ data: StatsOverview | null; error: string; loading: boolean }>({ data: null, error: '', loading: true })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState(prev => ({ ...prev, loading: true }))
    api<StatsOverview>(`/stats/overview?${query}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ data, error: '', loading: false }) })
      .catch(error => {
        if (controller.signal.aborted) return
        setState(prev => ({ data: prev.data, loading: false, error: error instanceof Error ? error.message : '통계를 조회하지 못했습니다.' }))
      })
    return () => controller.abort()
  }, [query, identity, revision])
  return { ...state, refresh: () => setRevision(v => v + 1) }
}
