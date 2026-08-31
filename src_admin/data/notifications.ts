// ─────────────────────────────────────────────────────────────────────────────
// 교직원 알림 — 학생이 나에게 한 일을 모은다.
//
// 새 스토어를 만들지 않는다. 알림은 **이미 있는 이벤트 소스에서 파생**한다
// (CLAUDE.md 규칙 10 — 집계는 데이터 층에서, 화면은 배열을 그리기만 한다).
//   상담 신청(대기)      ← 학생 owner 스토어 투영
//   로드맵 변경 요청(대기) ← dc_roadmap_requests
//   재진단 응시(회차 ≥ 2)  ← dc_diag_attempts
//   추천채용 지원         ← dc_job_applications
//
// ★ 범위는 역할별로 격리한다 — navConfig 의 섹션 노출 역할과 같은 경계다.
//   교수가 상담사의 접수함을 알림으로 엿보게 되면 그 자체가 권한 누수다.
//   각 갈래는 그 화면이 쓰는 스코프를 그대로 따른다(여기서 새 스코프를 발명하지 않는다).
//
// 읽음 처리는 없다 → NotificationBell 상단 주석 참조.
// ─────────────────────────────────────────────────────────────────────────────
import type { NotificationItem, NotificationTone } from '../../src_v2/components/NotificationBell'
import type { StaffUser } from './schema/staff'
import { getCounselorById } from './counselors'
import { getRequestsByAssignee } from './counselRequests'
import { getProfRequestsByStatus } from './profCounselRequests'
import { getRoadmapRequestsByStatus } from './roadmapRequests'
import { getRetakeRows } from './diagnosisAttempts'
import { getApplications } from './jobApplications'
import { getJobById } from './jobsSource'

/** 벨에 담는 최대 건수. */
const LIMIT = 12
/**
 * 갈래당 최대 건수.
 * 총량만 자르면 건수가 많은 갈래(대기 상담신청)가 벨을 독차지해서 로드맵·진단·채용이
 * 한 건도 못 보인다. 갈래마다 자리를 보장해야 "무슨 일이 있었나"가 한눈에 읽힌다.
 */
const PER_TONE = 4

/** 공고 한 줄 표기 — JobPosting 에는 제목 필드가 없다(회사 + 직무로 부른다). */
export function jobLabel(jobId: string): string {
  const job = getJobById(jobId)
  return job ? `${job.company} ${job.role}` : '지원 공고'
}

/**
 * 활성 교직원이 지금 봐야 할 알림 — 최근 순.
 * 역할에 없는 갈래는 아예 만들지 않는다(빈 배열이 아니라 조회 자체를 하지 않는다).
 */
export function getStaffNotifications(user: StaffUser): NotificationItem[] {
  const items: NotificationItem[] = []
  const isCounselor = user.role === 'career' || user.role === 'psych'

  // ── 상담 신청 — 나에게 배정된 대기 건 (상담사) ──────────────────────────
  if (isCounselor) {
    for (const request of getRequestsByAssignee(user.id)) {
      if (request.status !== '대기') continue
      items.push({
        id: `nf_counsel_${request.id}`,
        tone: 'counsel',
        title: `${request.studentName} 학생이 ${request.type} 상담을 신청했습니다`,
        body: request.topic,
        at: request.requestedAt,
        to: '/counsel/requests',
      })
    }
  }

  // ── 교수 상담 신청 — 내가 지정된 대기 건 (교수) ────────────────────────
  if (user.role === 'professor') {
    for (const request of getProfRequestsByStatus(user.id, '대기')) {
      items.push({
        id: `nf_profcounsel_${request.id}`,
        tone: 'counsel',
        title: `${request.studentName} 학생이 교수 상담을 신청했습니다`,
        body: request.topic,
        at: request.requestedAt,
        to: '/professor/counsel/requests',
      })
    }
  }

  // ── 재진단 응시 — 담당 학과 범위 (상담사) ──────────────────────────────
  // 학생이 재진단을 '신청'하는 경로는 아직 없다(재진단은 상담을 거친다).
  // 지금 실제로 일어나는 사건은 "다시 응시했다"이므로 그것을 알린다.
  if (isCounselor) {
    const departments = getCounselorById(user.id)?.departments ?? []
    for (const row of getRetakeRows(departments)) {
      if (!row.date) continue
      items.push({
        id: `nf_retake_${row.key}`,
        tone: 'diagnosis',
        title: `${row.studentName} 학생이 ${row.testName}를 재응시했습니다`,
        body: row.resultSummary ?? `${row.attemptNo}회차 · ${row.status}`,
        at: row.date,
        to: '/diagnosis/status',
      })
    }
  }

  // ── 로드맵 변경 요청 — 대기 건 (진로상담사 전용) ────────────────────────
  // 로드맵 편집은 진로상담사만 한다(navConfig 로드맵 섹션 roles: ['career']).
  if (user.role === 'career') {
    for (const request of getRoadmapRequestsByStatus('대기')) {
      items.push({
        id: `nf_roadmap_${request.id}`,
        tone: 'roadmap',
        title: `${request.studentName} 학생이 로드맵 변경을 요청했습니다`,
        body: request.title,
        at: request.requestedAt,
        to: '/roadmap/requests',
      })
    }
  }

  // ── 추천채용 지원 — 아직 검토 전(APPLIED) 건 (진로상담사 전용) ──────────
  if (user.role === 'career') {
    for (const application of getApplications()) {
      if (application.status !== 'APPLIED') continue
      items.push({
        id: `nf_jobapply_${application.id}`,
        tone: 'job',
        title: `${application.snapName} 학생이 추천채용에 지원했습니다`,
        body: jobLabel(application.jobId),
        at: application.appliedAt,
        to: `/jobs/applicants/${application.jobId}`,
      })
    }
  }

  return sortRecentFirst(items)
}

/** 최근 순 정렬 → 갈래당 상한 → 총 상한. 두 포털이 같은 규칙을 쓰도록 여기 한 번만 둔다. */
export function sortRecentFirst(items: NotificationItem[]): NotificationItem[] {
  const taken = new Map<NotificationTone, number>()
  return items
    .slice()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .filter(item => {
      const count = (taken.get(item.tone) ?? 0) + 1
      taken.set(item.tone, count)
      return count <= PER_TONE
    })
    .slice(0, LIMIT)
}
