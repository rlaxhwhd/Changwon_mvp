// ─────────────────────────────────────────────────────────────────────────
// 교내공고 관리 표의 필터·탭 — 화면은 조건만 들고 있고 거르기는 여기서 한다(programManageFilter 미러).
// 탭은 채용 유형으로만 나눈다(2026-11-23 사용자 확정): 추천·일반은 마감 여부와 무관, 마감 탭은 마감 공고만.
// ─────────────────────────────────────────────────────────────────────────
import type { JobPosting } from './schema/job'
import { isJobClosed, jobDdayLabel, jobPostedDate } from './jobsSource'

export type JobManageTab = 'ALL' | 'RECOMMENDATION' | 'GENERAL' | 'CLOSED'
export const JOB_MANAGE_TABS: { value: JobManageTab; label: string }[] = [
  { value: 'ALL', label: '전체' }, { value: 'RECOMMENDATION', label: '추천' },
  { value: 'GENERAL', label: '일반' }, { value: 'CLOSED', label: '마감' },
]

export type JobSearchField = 'all' | 'company' | 'role'

export interface JobManageFilters {
  postedFrom: string
  postedTo: string
  searchField: JobSearchField
  q: string
  careerType: string
  gender: string
  employmentType: string
  companyType: string
  region: string
  categories: string[]
}

export const EMPTY_JOB_FILTERS: JobManageFilters = {
  postedFrom: '', postedTo: '', searchField: 'all', q: '',
  careerType: '', gender: '', employmentType: '', companyType: '', region: '', categories: [],
}

export function inTab(job: JobPosting, tab: JobManageTab): boolean {
  if (tab === 'CLOSED') return isJobClosed(job)
  return tab === 'ALL' || job.recruitType === tab
}

export function filterJobs(jobs: JobPosting[], f: JobManageFilters): JobPosting[] {
  const q = f.q.trim().toLowerCase()
  return jobs.filter(job => {
    const day = jobPostedDate(job)
    if (f.postedFrom && day < f.postedFrom) return false
    if (f.postedTo && day > f.postedTo) return false
    if (q) {
      const fields = f.searchField === 'company' ? [job.company] : f.searchField === 'role' ? [job.role] : [job.company, job.role]
      if (!fields.some(v => v.toLowerCase().includes(q))) return false
    }
    if (f.careerType && !job.careerTypes.includes(f.careerType)) return false
    if (f.gender && !job.genders.includes(f.gender)) return false
    if (f.employmentType && !job.employmentTypes.includes(f.employmentType)) return false
    if (f.companyType && job.companyType !== f.companyType) return false
    if (f.region && !job.regions.includes(f.region)) return false
    if (f.categories.length && !f.categories.some(c => job.jobCategories.includes(c))) return false
    return true
  }).sort((a, b) => b.postedAt.localeCompare(a.postedAt))
}

/** 마감임박 — 게시 중이고 마감까지 3일 이내(D-day 포함). 판정 문구는 jobDdayLabel 하나를 따른다. */
export function isDeadlineSoon(job: JobPosting): boolean {
  const label = jobDdayLabel(job)
  if (label === 'D-day') return true
  const days = /^D-(\d+)$/.exec(label)
  return !!days && Number(days[1]) <= 3
}
