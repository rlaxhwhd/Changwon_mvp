// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원 처리 이력 — 정본은 서버(dc.job_application_event)다.
//
// 이력은 append-only 이고 **서버가 상태 전이와 같은 트랜잭션에서** 쌓는다
// (CLAUDE.md 규칙 11). 예전에는 화면이 전이 직후 localStorage 배열에 직접
// append 했는데, 그러면 상태 저장은 성공하고 이력만 사라지는 경우가 생긴다.
// 그 공개 append 경로는 이제 없다 — 여기는 읽기 전용이다.
//
// 목록에 싣기에는 큰 값이라 필요한 지원 건만 골라 읽는다(전량 preload 금지).
// ─────────────────────────────────────────────────────────────────────────────
import type { JobApplicationEvent, JobApplicationEventKind } from './schema/jobApplication'
import { APPLICATION_EVENT_LABEL } from './schema/jobApplication'
import { loadApplicationEvents } from '../../shared/jobStore'

/** 한 지원 건의 처리 이력 (오래된 순). 서버가 seq 순으로 내려준다. */
export async function getEventsByApplication(applicationId: string): Promise<JobApplicationEvent[]> {
  return loadApplicationEvents(applicationId)
}

/** 이력 1건의 표시 문구 — 화면이 코드로 분기하지 않도록 여기서 만든다. */
export function eventLabel(event: JobApplicationEvent): string {
  const base = APPLICATION_EVENT_LABEL[event.action] ?? event.action
  if (event.action === 'ADVANCE' && event.toStageName) return `${base} · ${event.toStageName}`
  return base
}

export { APPLICATION_EVENT_LABEL }
export type { JobApplicationEvent, JobApplicationEventKind }
