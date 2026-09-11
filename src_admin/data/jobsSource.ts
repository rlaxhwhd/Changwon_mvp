// ─────────────────────────────────────────────────────────────────────────
// 채용공고 로더 — 정본은 서버(dc.job_posting · dc.company)다.
//
// 읽기는 부팅 때 적재한 스토어에서 동기로 꺼낸다(SPEC.md §5). 쓰기는 async 이고
// 서버가 판정한다 — 마감·중복·권한·전형 순서를 여기서 막지 않고 서버가 거절한다
// (CLAUDE.md 규칙 5: 정합성은 한 곳에서만 판정한다).
//
// 예전에는 교내 공고를 localStorage 'dc_jobs' 배열에 통째로 저장했고, 저장 실패는
// 조용히 false 가 됐다. 이제 실패는 예외로 올라온다 — 화면이 그 사유를 보여 준다.
// ─────────────────────────────────────────────────────────────────────────
import type {
  JobCompany,
  JobEffectiveStatus,
  JobPosting,
  JobPostingInput,
  JobStatus,
} from './schema/job'
import { JOB_HIGHLIGHT_TAGS } from './schema/job'
import { api, queryString } from '../../shared/api'
import {
  dropPosting,
  loadPostings,
  postingList,
  refreshPosting,
} from '../../shared/jobStore'
import type { ListParams, Paginated } from './query'

export { JOB_EVENT } from '../../shared/jobStore'

/** 목록 화면이 보는 갈래 */
export type JobScope = 'internal' | 'external'

/** 전체 공고(교내 + 외부) — 상세 조회·전체 집계용. */
export function getJobs(): JobPosting[] {
  return postingList()
}

/** 교내 공고 — 교직원이 직접 등록한 것만. */
export function getInternalJobs(): JobPosting[] {
  return getJobs().filter(j => j.source === 'manual')
}

/** 외부 수집 공고 — 읽기 전용(서버가 수정을 거절한다). */
export function getExternalJobs(): JobPosting[] {
  return getJobs().filter(j => j.source === 'external')
}

/** scope 별 목록 */
export function getJobsByScope(scope: JobScope): JobPosting[] {
  return scope === 'internal' ? getInternalJobs() : getExternalJobs()
}

/** id 로 1건 조회 */
export function getJobById(id: string): JobPosting | undefined {
  return getJobs().find(j => j.id === id)
}

/**
 * 마감 라벨 — 마감까지 남은 일수를 'D-N'으로 표현.
 * 판정 자체(effectiveStatus)는 서버가 KST 기준으로 한다. 여기서는 표시 문구만 만든다.
 */
export function jobDdayLabel(job: JobPosting): string {
  if (job.effectiveStatus === 'CLOSED') return '마감'
  if (job.effectiveStatus === 'UNKNOWN') return '확인 필요'
  if (job.deadlineMode === 'ALWAYS' || !job.deadline) return '상시'
  // 마감일은 날짜만 있는 값이다. 'YYYY-MM-DD'를 그대로 Date 에 넣으면 UTC 자정으로
  // 읽혀 KST 에선 오늘 마감이 D-1 로 나온다 — 로컬 자정으로 고정해서 읽는다.
  const end = new Date(`${job.deadline.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(end.getTime())) return job.deadline
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000)
  if (diff < 0) return '마감'
  if (diff === 0) return 'D-day'
  return `D-${diff}`
}

/**
 * 마감 여부 — 목록과 상세가 같은 답을 내야 한다.
 * 판정은 서버가 한 번에 한다(effectiveStatus). 화면마다 다시 판정하지 않는다.
 */
export function isJobClosed(job: JobPosting): boolean {
  return job.effectiveStatus !== 'POSTED'
}

/** 학생 목록에 보이는 상태 — 저장 상태가 아니라 서버가 계산한 실효 상태다. */
export function jobStatusOf(job: JobPosting): JobEffectiveStatus {
  return job.effectiveStatus
}

/**
 * 카드 특이사항 배지 — 오늘 마감(마감일 파생) + 강조 태그(JOB_HIGHLIGHT_TAGS).
 * 화면이 태그 문자열을 직접 비교하지 않도록 여기서 만든다.
 */
export function jobHighlights(job: JobPosting): string[] {
  const flags = jobDdayLabel(job) === 'D-day' ? ['오늘마감'] : []
  return [...flags, ...job.tags.filter(t => (JOB_HIGHLIGHT_TAGS as readonly string[]).includes(t))]
}

/** 목록 정렬 기준 — 화면 select 의 단일 소스 */
export type JobSort = 'latest' | 'deadline'
export const JOB_SORTS: JobSort[] = ['latest', 'deadline']
export const JOB_SORT_LABEL: Record<JobSort, string> = {
  latest: '최신순',
  deadline: '마감순',
}

/** 정렬 키 — 마감일 없는 공고(상시·채용시)는 맨 뒤로 보낸다. */
function deadlineKey(job: JobPosting): string {
  return job.deadline ?? '9999-12-31'
}

/**
 * 목록 정렬. 기준과 무관하게 **마감된 공고는 항상 아래로** 내린다
 * (최신은 위로 / 마감은 아래로).
 */
export function sortJobs(list: JobPosting[], sort: JobSort): JobPosting[] {
  return [...list].sort((a, b) => {
    const closed = Number(isJobClosed(a)) - Number(isJobClosed(b))
    if (closed !== 0) return closed
    return sort === 'deadline'
      ? deadlineKey(a).localeCompare(deadlineKey(b))
      : b.postedAt.localeCompare(a.postedAt)
  })
}

/** 상태별 카운트 집계 (필터 배지용). scope 생략 시 전체. */
export function countJobs(scope?: JobScope): { total: number; POSTED: number; CLOSED: number } {
  const jobs = scope ? getJobsByScope(scope) : getJobs()
  return {
    total: jobs.length,
    POSTED: jobs.filter(j => !isJobClosed(j)).length,
    CLOSED: jobs.filter(j => isJobClosed(j)).length,
  }
}

/** 공고 목록 조회(서버 페이징). 수천 건이 되면 화면은 스토어가 아니라 이쪽을 써야 한다. */
export async function queryJobs(params: ListParams = {}): Promise<Paginated<JobPosting>> {
  const query = queryString({
    page: params.page ?? 1, pageSize: params.pageSize ?? 20, q: params.q,
    source: params.filters?.source, recruitType: params.filters?.recruitType,
    status: params.filters?.status, companyId: params.filters?.companyId,
  })
  return api<Paginated<JobPosting>>(`/jobs?${query}`)
}

function requestKey(prefix: string): Record<string, string> {
  return { 'Idempotency-Key': `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}` }
}

/** 새 공고 등록 — id·postedAt·마감(채용시) 은 서버가 부여한다. */
export async function addJob(input: JobPostingInput): Promise<JobPosting> {
  const job = await api<JobPosting>('/jobs', {
    method: 'POST', headers: requestKey('job-create'), body: JSON.stringify(input),
  })
  await refreshPosting(job.id)
  return job
}

/**
 * 공고 수정. 다른 담당자가 먼저 고쳤으면 서버가 409로 거절한다.
 * ★ 「채용시 마감」의 날짜는 여기서 다시 계산되지 않는다 — 등록 시점 값이 유지된다.
 */
export async function updateJob(id: string, input: JobPostingInput, expectedVersion: number): Promise<void> {
  await api(`/jobs/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: requestKey('job-update'),
    body: JSON.stringify({ ...input, expectedVersion }),
  })
  await refreshPosting(id)
}

/** 공고 삭제(논리삭제). 지원·회차·이력은 보존된다. */
export async function removeJob(id: string, expectedVersion: number): Promise<void> {
  await api(`/jobs/${encodeURIComponent(id)}?expectedVersion=${expectedVersion}`, { method: 'DELETE' })
  dropPosting(id)
}

/** 게시 마감 / 재게시 — 저장 상태만 바꾼다(지난 마감일은 여전히 마감이다). */
export async function setJobPosted(id: string, posted: boolean, expectedVersion: number): Promise<void> {
  await api(`/jobs/${encodeURIComponent(id)}/${posted ? 'reopen' : 'close'}`, {
    method: 'POST', body: JSON.stringify({ expectedVersion }),
  })
  await refreshPosting(id)
}

// ── 기업 사전 ────────────────────────────────────────────────────────────

export async function queryCompanies(q = ''): Promise<JobCompany[]> {
  return (await api<Paginated<JobCompany>>(`/job-companies?${queryString({ q, pageSize: 100 })}`)).items
}

export async function addCompany(input: {
  displayName: string; companyTypeCode?: string | null; websiteUrl?: string | null
}): Promise<JobCompany> {
  return api<JobCompany>('/job-companies', { method: 'POST', body: JSON.stringify(input) })
}

// ── 파일 ────────────────────────────────────────────────────────────────

/**
 * 파일 업로드 — 바이트를 그대로 보낸다. 저장 이름은 서버가 부여하고, 다운로드는
 * 권한을 확인하는 API 경로로만 나간다(정적 URL 이 아니다).
 * 공용 api() 헬퍼는 JSON 전용이라 여기서만 fetch 를 직접 쓴다.
 */
export async function uploadJobFile(slot: 'LOGO' | 'ATTACHMENT' | 'RESUME', file: File): Promise<{
  id: string; name: string; size: number; contentType: string; downloadUrl: string
}> {
  const identity = location.pathname.startsWith('/admin')
    ? localStorage.getItem('dc_active_staff')
    : localStorage.getItem('dc_active_student')
  const headers = new Headers({ 'Content-Type': file.type || 'application/octet-stream' })
  if (identity) headers.set('X-DC-Identity', identity)
  const path = `/api/v1/job-files?slot=${slot}&name=${encodeURIComponent(file.name)}`
  const response = await fetch(path, { method: 'POST', headers, body: file })
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(error?.detail ?? '파일을 올리지 못했습니다.')
  }
  return response.json()
}

export { loadPostings }
export type { JobPosting, JobStatus, JobPostingInput, JobCompany }
export type { RecruitType, JobSource } from './schema/job'
