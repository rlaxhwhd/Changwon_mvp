// ─────────────────────────────────────────────────────────────────────────
// 채용공고 소스 로더 — Counsel_README §6 jobsSource
//
// 공고는 출처(source)로 두 갈래이고, 갈래마다 저장소가 다르다.
//   external : 외부 채용 API(잡코리아 등) 수집분. jobs.seed.json = 불변 원본.
//              교직원도 수정·삭제할 수 없다(읽기 전용).
//   manual   : 상담사·관리자가 직접 등록한 교내 공고. localStorage 'dc_jobs' 오버레이.
//
// 학생(/jobs)과 교직원(/admin/jobs)은 같은 소스를 구독하고, 보는 목록만 scope 로 갈린다.
// ─────────────────────────────────────────────────────────────────────────
import type { JobPosting, JobStatus, JobSource } from './schema/job'
import { JOB_HIGHLIGHT_TAGS } from './schema/job'
import seed from './jobs.seed.json'

const STORAGE_KEY = 'dc_jobs'

/** 외부 API 수집 공고(불변 원본) */
const EXTERNAL = seed as JobPosting[]

/** 목록 화면이 보는 갈래 */
export type JobScope = 'internal' | 'external'

/** 교내 공고 — 상담사가 직접 등록한 것만. 등록 전에는 빈 목록. */
export function getInternalJobs(): JobPosting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 오버레이에 외부 공고가 섞여 있던 구버전 데이터를 위해 manual 만 추린다.
      if (Array.isArray(parsed)) return (parsed as JobPosting[]).filter(j => j.source === 'manual')
    }
  } catch {
    /* localStorage 접근 실패 시 빈 목록 */
  }
  return []
}

/** 외부 공고 — 읽기 전용. */
export function getExternalJobs(): JobPosting[] {
  return EXTERNAL
}

/** scope 별 목록 */
export function getJobsByScope(scope: JobScope): JobPosting[] {
  return scope === 'internal' ? getInternalJobs() : getExternalJobs()
}

/** 전체 공고(교내 + 외부) — 상세 조회·전체 집계용. */
export function getJobs(): JobPosting[] {
  return [...getInternalJobs(), ...EXTERNAL]
}

/** id 로 1건 조회 */
export function getJobById(id: string): JobPosting | undefined {
  return getJobs().find(j => j.id === id)
}

/**
 * 마감 라벨 — 마감까지 남은 일수를 'D-N'으로 표현.
 * 채용시 마감이어도 마감일(+1개월 자동)이 있으면 D-N을 우선 표시한다.
 * 날짜가 없을 때만 「채용시 마감」/「상시」로 폴백. 지났거나 마감상태=「마감」.
 */
export function jobDdayLabel(job: JobPosting): string {
  if (job.status === '마감') return '마감'
  if (!job.deadline || job.deadline === '채용시') return job.deadlineOnHire ? '채용시 마감' : '상시'
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
 * 카드 특이사항 배지 — 오늘 마감(마감일 파생) + 강조 태그(JOB_HIGHLIGHT_TAGS).
 * 화면이 태그 문자열을 직접 비교하지 않도록 여기서 만든다.
 */
/**
 * 마감 여부 — 목록과 상세가 같은 답을 내야 한다.
 * 운영 상태(status='마감')와 마감일 경과를 둘 다 본다. 화면마다 다시 판정하지 않는다
 * (예전에 상세가 status 만 보다가 「접수중」인데 D-day 는 「마감」인 모순이 났다).
 */
export function isJobClosed(job: JobPosting): boolean {
  return jobDdayLabel(job) === '마감'
}

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
  const d = job.deadline
  return d && !Number.isNaN(new Date(d).getTime()) ? d : '9999-12-31'
}

/**
 * 목록 정렬. 기준과 무관하게 **마감된 공고는 항상 아래로** 내린다
 * (최신은 위로 / 마감은 아래로).
 */
export function sortJobs(list: JobPosting[], sort: JobSort): JobPosting[] {
  return [...list].sort((a, b) => {
    const closed = Number(a.status === '마감') - Number(b.status === '마감')
    if (closed !== 0) return closed
    return sort === 'deadline'
      ? deadlineKey(a).localeCompare(deadlineKey(b))
      : b.postedAt.localeCompare(a.postedAt)
  })
}

/** 상태별 카운트 집계 (필터 배지용). scope 생략 시 전체. */
export function countJobs(scope?: JobScope): { total: number; 게시: number; 마감: number } {
  const jobs = scope ? getJobsByScope(scope) : getJobs()
  return {
    total: jobs.length,
    게시: jobs.filter(j => j.status === '게시').length,
    마감: jobs.filter(j => j.status === '마감').length,
  }
}

function persist(list: JobPosting[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* localStorage 접근 실패 시 무시 (데모 범위) */
  }
}

/** 새 공고 등록 — id·postedAt 자동 부여 후 교내 목록 맨 앞에 추가. */
export function addJob(input: Omit<JobPosting, 'id' | 'postedAt'>): JobPosting {
  const job: JobPosting = {
    ...input,
    source: 'manual',
    id: `job_${Date.now()}`,
    postedAt: new Date().toISOString(),
  }
  persist([job, ...getInternalJobs()])
  return job
}

/** 공고 수정 — 교내 공고만. 외부 공고는 원본이 API라 수정하지 않는다. */
export function updateJob(id: string, patch: Partial<Omit<JobPosting, 'id'>>): void {
  const internal = getInternalJobs()
  if (!internal.some(j => j.id === id)) return
  persist(internal.map(j => (j.id === id ? { ...j, ...patch, source: 'manual' } : j)))
}

/** 공고 삭제 — 교내 공고만. */
export function removeJob(id: string): void {
  persist(getInternalJobs().filter(j => j.id !== id))
}

export type { JobPosting, JobStatus, JobSource }
export type { RecruitType } from './schema/job'
