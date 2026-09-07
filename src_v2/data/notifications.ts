// ─────────────────────────────────────────────────────────────────────────────
// 학생 알림 — 교직원이 내 신청에 한 일을 모은다.
//
// 새 스토어를 만들지 않는다. 알림은 **이미 있는 이벤트 소스에서 파생**한다
// (CLAUDE.md 규칙 10 — 집계는 데이터 층에서, 화면은 배열을 그리기만 한다).
//   상담 확정        ← 학생 owner 스토어 + dc_counsel_events (확정 시각)
//   검사 권유(재진단) ← dc_diag_nudges
//   로드맵 요청 처리  ← dc_roadmap_requests (반영완료 · 반려)
//   추천채용 진행     ← dc_job_application_events
//   비교과 선발       ← dc_programs (applicants.selectedAt)
//
// 상담사 쪽 스토어를 읽는 것은 cross-SPA 임시 비계다(counselorsRead.ts 와 같은 규약).
// DB 전환 시 이 파일의 import 만 API 조회로 바뀐다.
//
// 읽음 처리는 없다 → NotificationBell 상단 주석 참조.
// ─────────────────────────────────────────────────────────────────────────────
import type { NotificationItem } from '../components/NotificationBell'
import { jobLabel, sortRecentFirst } from '../../src_admin/data/notifications'
import { getEventsByRequest } from '../../src_admin/data/counselEvents'
import { getLatestNudges, testNameOf } from '../../src_admin/data/diagnosisAttempts'
import { getRoadmapRequests } from '../../src_admin/data/roadmapRequests'
import { getJobApplicationEvents } from '../../src_admin/data/jobApplicationEvents'
import { getPrograms, selectionOf } from '../../src_admin/data/programs'
import { getStudentCounselRequests } from './students'
import type { StudentCounselRequest } from './students'

/**
 * 상담이 확정된 시각.
 * 상담사 상담은 처리 이력(dc_counsel_events)에 확정 이벤트가 남는다.
 * 교수 상담은 이력 스토어가 없으므로(confirmProfRequest 는 상태만 바꾼다)
 * 확정된 상담 날짜로 대신한다 — "언제 승인됐나"의 근사치다.
 */
function confirmedAt(request: StudentCounselRequest): string {
  const event = getEventsByRequest(request.id)
    .filter(e => e.kind === '확정' || e.kind === '일정변경')
    .pop()
  return event?.at ?? (request.slot ? `${request.slot.date}T09:00:00` : request.requestedAt)
}

/** 확정 상담의 보조 줄 — "10월 14일 14:00 · 대면" */
function slotLine(request: StudentCounselRequest): string | undefined {
  if (!request.slot) return undefined
  return `${request.slot.date} ${request.slot.start} · ${request.method}`
}

/** 학생 본인이 지금 봐야 할 알림 — 최근 순. */
export function getStudentNotifications(studentId: string): NotificationItem[] {
  const items: NotificationItem[] = []

  // ── 상담 승인 — 신청이 확정된 건 ────────────────────────────────────────
  for (const request of getStudentCounselRequests(studentId)) {
    if (request.status !== '확정') continue
    items.push({
      id: `nf_counsel_${request.id}`,
      tone: 'counsel',
      title: `${request.type} 상담 신청이 승인되었습니다`,
      body: slotLine(request),
      at: confirmedAt(request),
      to: '/counsel/record',
    })
  }

  // ── 재진단 권유 — 상담사가 검사를 다시 보라고 보낸 건 ──────────────────
  for (const [key, nudge] of getLatestNudges()) {
    if (nudge.studentId !== studentId) continue
    items.push({
      id: `nf_nudge_${key}`,
      tone: 'diagnosis',
      title: `${testNameOf(nudge.testId)} 응시가 요청되었습니다`,
      body: '상담사가 검사를 권유했습니다. 진단센터에서 바로 응시할 수 있습니다.',
      at: nudge.sentAt,
      to: '/diagnosis/employment',
    })
  }

  // ── 로드맵 변경 요청 처리 — 반영완료 · 반려 ────────────────────────────
  for (const request of getRoadmapRequests()) {
    if (request.studentId !== studentId || request.status === '대기') continue
    items.push({
      id: `nf_roadmap_${request.id}`,
      tone: 'roadmap',
      title: request.status === '반영완료'
        ? '로드맵 변경 요청이 반영되었습니다'
        : '로드맵 변경 요청이 반려되었습니다',
      body: request.title,
      at: request.handledAt ?? request.requestedAt,
      to: '/growth/roadmap-status',
    })
  }

  // ── 추천채용 진행 — 내가 한 일(지원·취소)이 아닌 변화만 알린다 ──────────
  for (const event of getJobApplicationEvents()) {
    if (event.studentId !== studentId) continue
    if (event.kind === '지원' || event.kind === '지원취소') continue
    items.push({
      id: `nf_jobevent_${event.id}`,
      tone: 'job',
      title: `${jobLabel(event.jobId)} 지원이 ${event.kind} 처리되었습니다`,
      body: event.toStageName ?? event.reason ?? `담당: ${event.byName}`,
      at: event.at,
      to: '/mypage/applications',
    })
  }

  // ── 비교과 선발 ────────────────────────────────────────────────────────
  for (const program of getPrograms()) {
    const applicant = program.applicants.find(a => a.studentId === studentId)
    if (!applicant || selectionOf(applicant) !== '선발') continue
    const run = program.runStartDate && program.runEndDate
      ? `${program.runStartDate} ~ ${program.runEndDate}`
      : undefined
    items.push({
      id: `nf_program_${program.id}`,
      tone: 'program',
      title: `${program.title} 프로그램에 선발되었습니다`,
      body: run ?? program.location,
      at: applicant.selectedAt ?? applicant.appliedAt,
      to: '/mypage/programs',
    })
  }

  return sortRecentFirst(items)
}
