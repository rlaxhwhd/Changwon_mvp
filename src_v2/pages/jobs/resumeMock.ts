// ─────────────────────────────────────────────────────────────────────────
// 텍스트 자기소개서 — 정본은 서버(dc.job_resume)다.
//
// 예전에는 모듈 상수 SAVED_RESUMES(r1~r3) + localStorage 'dc_user_resumes_v1'
// 이었다. 그 저장소에도 **학생 ID 가 없어서** 계정을 바꾸면 남의 자소서가 보였고,
// 고정 예시 3건은 모든 학생에게 자기 문서인 것처럼 섞여 나왔다.
// 이제 소유자는 서버가 판정하고, 목록에는 본인 문서만 들어온다.
//
// r1·r2 는 마이그레이션 023 이 실제 소유자에게 적재했다 — dc.ai_run 이 그 ID 를
// 가리키고 있고 그 행은 append-only 라 사후 재매핑이 불가능하기 때문이다.
// (소유자가 지정되지 않은 r3 는 적재하지 않았다. 소유자를 지어내지 않는다.)
//
// 파일 이름은 예전 import 경로를 지키려고 그대로 뒀다 — mock 은 더 이상 없다.
// ─────────────────────────────────────────────────────────────────────────
import { api } from '../../../shared/api'
import { jobOptions, JOB_CODE_GROUPS } from '../../../src_admin/data/schema/job'

export interface SavedResume {
  id: string
  title: string
  company: string
  jobType: string
  position: string
  /** 분야 코드 (JOB_RESUME_CATEGORY) */
  categoryCode: string | null
  /** 분야 표시 라벨 — 서버가 코드에서 만들어 준다 */
  categoryLabel: string
  content: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface ResumeInput {
  title: string
  company?: string
  jobType?: string
  position?: string
  categoryCode?: string | null
  content?: string
}

const RESUME_EVENT = 'dc_resumes_changed'
let resumes: SavedResume[] = []

/** 자소서 분야 선택지 — 운영 코드(DB)가 정본이다. 화면이 배열을 하드코딩하지 않는다. */
export function resumeCategoryOptions() {
  return jobOptions(JOB_CODE_GROUPS.resumeCategory)
}

/** 적재된 본인 자소서 전체(최신 수정 순). */
export function getAllResumes(): SavedResume[] {
  return resumes
}

export function getResumeById(id: string): SavedResume | undefined {
  return resumes.find(r => r.id === id)
}

function publish(next: SavedResume[]): void {
  resumes = next
  window.dispatchEvent(new Event(RESUME_EVENT))
}

export async function loadResumes(): Promise<void> {
  publish((await api<{ items: SavedResume[] }>('/job-resumes')).items)
}

/** 새 자소서. createdAt·id 는 서버가 부여한다. */
export async function createResume(input: ResumeInput): Promise<SavedResume> {
  const created = await api<SavedResume>('/job-resumes', { method: 'POST', body: JSON.stringify(input) })
  await loadResumes()
  return created
}

/** 수정. 다른 창에서 먼저 저장했으면 서버가 409로 거절한다. createdAt 은 유지된다. */
export async function updateResume(id: string, input: ResumeInput): Promise<SavedResume> {
  const current = getResumeById(id)
  if (!current) throw new Error('자기소개서를 찾을 수 없습니다.')
  const updated = await api<SavedResume>(`/job-resumes/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ ...input, expectedVersion: current.version }),
  })
  await loadResumes()
  return updated
}

/** 있으면 수정, 없으면 생성. */
export async function upsertUserResume(input: ResumeInput & { id?: string }): Promise<SavedResume> {
  const { id, ...rest } = input
  return id && getResumeById(id) ? updateResume(id, rest) : createResume(rest)
}

/** 논리삭제. 이력은 남는다. */
export async function deleteUserResume(id: string): Promise<void> {
  await api(`/job-resumes/${encodeURIComponent(id)}`, { method: 'DELETE' })
  publish(resumes.filter(r => r.id !== id))
}

export { RESUME_EVENT }
