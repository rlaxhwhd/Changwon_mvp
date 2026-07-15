// ─────────────────────────────────────────────────────────────────────────
// 채용공고 소스 로더 (localStorage 'dc_jobs') — Counsel_README §6 jobsSource
// roadmapRequests.ts 패턴 미러: localStorage 우선, 없으면 seed 폴백.
//
// ⚠️ 실제 공고 데이터는 사용자 추후 제공(§8). seed 는 빈 배열로 시작하며,
// 상담사가 직접 등록(add)한 공고는 dc_jobs 에 누적된다. 학생 /jobs 가 나중에
// 이 소스를 그대로 소비할 수 있도록 shape 은 학생 Job 과 호환된다.
// ─────────────────────────────────────────────────────────────────────────
import type { JobPosting, JobStatus, JobSource } from './schema/job'
import seed from './jobs.seed.json'

const STORAGE_KEY = 'dc_jobs'

const SEED = seed as JobPosting[]

/** 전체 공고. localStorage 우선, 없으면 seed(빈 배열) 폴백. */
export function getJobs(): JobPosting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as JobPosting[]
    }
  } catch {
    /* localStorage 접근 실패 시 seed 폴백 */
  }
  return SEED
}

/** id 로 1건 조회 */
export function getJobById(id: string): JobPosting | undefined {
  return getJobs().find(j => j.id === id)
}

/** 상태별 카운트 집계 (필터 배지용) */
export function countJobs(): { total: number; 게시: number; 마감: number } {
  const jobs = getJobs()
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

/** 새 공고 등록 — id·postedAt 자동 부여 후 목록 맨 앞에 추가. */
export function addJob(input: Omit<JobPosting, 'id' | 'postedAt'>): JobPosting {
  const job: JobPosting = {
    ...input,
    id: `job_${Date.now()}`,
    postedAt: new Date().toISOString(),
  }
  persist([job, ...getJobs()])
  return job
}

/** 공고 수정 — id 매칭 항목을 patch 병합. */
export function updateJob(id: string, patch: Partial<Omit<JobPosting, 'id'>>): void {
  const next = getJobs().map(j => (j.id === id ? { ...j, ...patch } : j))
  persist(next)
}

/** 공고 삭제 */
export function removeJob(id: string): void {
  persist(getJobs().filter(j => j.id !== id))
}

export type { JobPosting, JobStatus, JobSource }
