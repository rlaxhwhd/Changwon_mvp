// ─────────────────────────────────────────────────────────────────────────
// 채용 스토어 — programStore 와 같은 규약이다.
//
// 부팅 때 한 번 적재하고 화면은 동기 셀렉터로 읽는다(SPEC.md §5: 로더 시그니처는
// 동기를 유지한다). 쓰기는 서버가 정본이므로 async 이고, 저장 뒤 그 공고·지원만
// 다시 읽어 스토어를 교체한다 — 응답을 신뢰하지 않고 서버 상태를 다시 확인한다.
//
// localStorage 는 더 이상 채용의 정본이 아니다. 여기서도, 로더에서도 쓰지 않는다.
//
// ⚠ 목록을 통째로 들고 있는 구조라 공고가 수천 건이 되면 이 방식은 못 버틴다.
//   그때는 화면이 queryPostings(페이징)만 쓰도록 옮겨야 한다 — programStore 와 같은 한계다.
// ─────────────────────────────────────────────────────────────────────────
import { api } from './api'
import type { JobPosting } from '../src_admin/data/schema/job'
import type { JobApplication, JobApplicationEvent } from '../src_admin/data/schema/jobApplication'

export const JOB_EVENT = 'dc_jobs_changed'

let postings: JobPosting[] = []
let applications: JobApplication[] = []
let wishlist: string[] = []
let capability: JobCapability = {
  canManage: false, canManageApplicants: false,
  canApplyWithFile: false, canApplyWithPortfolio: false, canUseTextResume: false, unavailable: [],
}

export interface JobCapability {
  canManage: boolean
  canManageApplicants: boolean
  canApplyWithFile: boolean
  canApplyWithPortfolio: boolean
  canUseTextResume: boolean
  unavailable: { code: string; message: string }[]
}

interface Page<T> { items: T[]; totalCount: number }

/** 지금 적재된 공고 전체. 화면·셀렉터의 유일한 읽기 경로. */
export function postingList(): JobPosting[] {
  return postings
}

/** 지금 적재된 지원 전체(요청자에게 인가된 것만 서버가 내려준다). */
export function applicationList(): JobApplication[] {
  return applications
}

export function wishlistIds(): string[] {
  return wishlist
}

export function jobCapability(): JobCapability {
  return capability
}

function publish(): void {
  window.dispatchEvent(new Event(JOB_EVENT))
}

async function readAll<T>(path: string): Promise<T[]> {
  const result: T[] = []
  let page = 1
  for (;;) {
    const separator = path.includes('?') ? '&' : '?'
    const response = await api<Page<T>>(`${path}${separator}page=${page}&pageSize=100`)
    result.push(...response.items)
    if (result.length >= response.totalCount || response.items.length === 0) break
    page += 1
  }
  return result
}

export async function loadPostings(): Promise<void> {
  postings = await readAll<JobPosting>('/jobs')
  publish()
}

/** 한 건만 서버에서 다시 읽어 교체한다(없으면 목록에서 뺀다). */
export async function refreshPosting(id: string): Promise<void> {
  const fresh = await api<JobPosting>(`/jobs/${encodeURIComponent(id)}`)
  postings = postings.some(p => p.id === fresh.id)
    ? postings.map(p => (p.id === fresh.id ? fresh : p))
    : [fresh, ...postings]
  publish()
}

export function dropPosting(id: string): void {
  postings = postings.filter(p => p.id !== id)
  publish()
}

/** 지원 목록 — 학생은 본인 것, 교직원은 담당 범위의 학생만 서버가 내려준다. */
export async function loadApplications(scope: 'mine' | 'managed'): Promise<void> {
  applications = await readAll<JobApplication>(scope === 'mine' ? '/job-applications/mine' : '/job-applications')
  publish()
}

export async function refreshApplication(id: string): Promise<void> {
  const fresh = await api<JobApplication>(`/job-applications/${encodeURIComponent(id)}`)
  applications = applications.some(a => a.id === fresh.id)
    ? applications.map(a => (a.id === fresh.id ? fresh : a))
    : [fresh, ...applications]
  publish()
}

export async function loadWishlist(): Promise<void> {
  wishlist = (await api<{ items: string[] }>('/job-wishlist')).items
  publish()
}

export function setWishlist(next: string[]): void {
  wishlist = next
  publish()
}

export async function loadCapability(): Promise<void> {
  capability = await api<JobCapability>('/jobs/capabilities')
  publish()
}

/** 한 지원 건의 처리 이력. 목록에 싣기에는 큰 값이라 필요할 때만 읽는다. */
export async function loadApplicationEvents(id: string): Promise<JobApplicationEvent[]> {
  return (await api<Page<JobApplicationEvent>>(
    `/job-applications/${encodeURIComponent(id)}/events?pageSize=100`)).items
}
