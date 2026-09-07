// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원 처리 이력 로더 — localStorage 'dc_job_app_events' (append-only)
//
// jobApplications.ts 의 상태 전이 함수(apply/advance/reject/pass/cancel)가 전이
// 직후 이 스토어에 이벤트 1건을 추가한다. 화면은 getEventsByApplication 으로 읽는다.
// 학생 마이페이지의 진행 타임라인이 이 이력을 그대로 그린다.
// DB 전환 시 이 모듈만 이력 테이블 API로 교체한다.
//
// ⚠ 기존 이벤트를 수정·삭제하지 말 것. 이력이 곧 감사 근거다(CLAUDE.md 규칙 11).
// ─────────────────────────────────────────────────────────────────────────────
import type { JobApplicationEvent, JobApplicationEventKind } from './schema/jobApplication'

const STORAGE_KEY = 'dc_job_app_events'

export function getJobApplicationEvents(): JobApplicationEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as JobApplicationEvent[]
    }
  } catch {
    /* 이력 없음 */
  }
  return []
}

function persist(list: JobApplicationEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

/** 이벤트 1건 추가. 호출부는 상태 전이 직후에 부른다. */
export function appendJobApplicationEvent(
  input: Omit<JobApplicationEvent, 'id' | 'at'>,
): JobApplicationEvent {
  const event: JobApplicationEvent = {
    id: `jae_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    at: new Date().toISOString(),
  }
  persist([...getJobApplicationEvents(), event])
  return event
}

/** 한 지원 건의 처리 이력 (오래된 순) — 학생 진행 타임라인의 소스 */
export function getEventsByApplication(applicationId: string): JobApplicationEvent[] {
  return getJobApplicationEvents()
    .filter(event => event.applicationId === applicationId)
    .sort((a, b) => a.at.localeCompare(b.at))
}

/** 한 공고의 전체 처리 이력 (최신 순) — 상담사 지원자 관리의 활동 로그 */
export function getEventsByJob(jobId: string): JobApplicationEvent[] {
  return getJobApplicationEvents()
    .filter(event => event.jobId === jobId)
    .sort((a, b) => b.at.localeCompare(a.at))
}

/** 마지막 처리 일시 — 목록의 '최종 업데이트' 표시용. 이력이 없으면 undefined. */
export function lastEventAt(applicationId: string): string | undefined {
  return getEventsByApplication(applicationId).at(-1)?.at
}

export type { JobApplicationEvent, JobApplicationEventKind }
