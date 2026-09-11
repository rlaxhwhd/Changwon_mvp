// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원 로더 — 정본은 서버(dc.job_application · attempt · event)다.
//
// 읽기는 부팅 때 적재한 스토어에서 동기로 꺼낸다(SPEC.md §5). 쓰기는 async 이고
// 서버가 판정한다 — 대상 공고·중복·마감·게이트·전형 순서·권한을 여기서 막지 않고
// 서버가 거절한다(CLAUDE.md 규칙 5: 정합성은 한 곳에서만 판정한다).
//
// 스토어에는 **요청자에게 인가된 지원만** 들어 있다 — 학생은 본인 것, 교직원은
// dc.staff_student_scope 범위의 학생만 서버가 내려준다. 화면이 다시 거르지 않는다.
//
// ★ 집계(단계별 인원·상태별 인원)는 데이터층에서 끝낸다(규칙 10).
//   여기서는 스토어에 든 인가된 행만 세고, 전체 모집단 기준 수는 서버 summary 를 쓴다.
// ─────────────────────────────────────────────────────────────────────────────
import type { JobPosting } from './schema/job'
import type {
  ApplicationStatus,
  HiringStage,
  JobApplication,
  JobApplicationAttempt,
} from './schema/jobApplication'
import {
  APPLICATION_OPEN_STATUSES,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  APPLY_ATTACHMENT_LABEL,
  isInternalStage,
} from './schema/jobApplication'
import { api } from '../../shared/api'
import {
  applicationList,
  loadApplications,
  refreshApplication,
  refreshPosting,
} from '../../shared/jobStore'
import { getJobById, getInternalJobs } from './jobsSource'

// ── 지원 대상 판정 (단일 지점) ───────────────────────────────────────────────

/** 이 공고가 지원 관리 대상인가 — **교내(manual) + 추천채용**일 때만 참. */
export function isRecommendedInternal(job: JobPosting | undefined): boolean {
  return !!job && job.source === 'manual' && job.recruitType === 'RECOMMENDATION'
}

/** 지원 관리 대상 공고 목록 — '추천채용 지원자관리' 화면의 소스 */
export function getRecommendedJobs(): JobPosting[] {
  return getInternalJobs().filter(isRecommendedInternal)
}

/**
 * 학생이 지금 이 공고에 지원할 수 있는가 — 화면 버튼 상태용이다.
 * ★ 최종 판정은 서버가 한다. 여기 결과가 ok 여도 서버가 게이트·마감으로 거절할 수 있다.
 */
export function canApplyTo(
  jobId: string,
  studentId: string,
): { ok: true } | { ok: false; reason: string } {
  const job = getJobById(jobId)
  if (!job) return { ok: false, reason: '공고를 찾을 수 없습니다.' }
  if (!isRecommendedInternal(job)) return { ok: false, reason: '지원 접수를 받지 않는 공고입니다.' }
  if (job.effectiveStatus !== 'POSTED') return { ok: false, reason: '마감된 공고입니다.' }
  if (job.applyEligibility && !job.applyEligibility.eligible) {
    return { ok: false, reason: job.applyEligibility.reasons[0]?.message ?? '아직 지원할 수 없습니다.' }
  }
  const mine = getApplication(jobId, studentId)
  if (mine && mine.status !== 'CANCELED') return { ok: false, reason: '이미 지원한 공고입니다.' }
  return { ok: true }
}

// ── 전형 단계 ────────────────────────────────────────────────────────────────

/**
 * 실제 진행 순서 — 교내 절차(서류 검토·기업 전달) + 공고별 기업 전형.
 * 서버가 이미 순서대로 실체화해 내려준다. 폴백 기본 3단계를 화면에서 지어내지 않는다.
 */
export function getFlowStages(jobId: string): HiringStage[] {
  return getJobById(jobId)?.stages ?? []
}

/** 편집 대상(기업 전형)만 — 교내 절차는 빼고 돌려준다. */
export function getStages(jobId: string): HiringStage[] {
  return getFlowStages(jobId).filter(s => !isInternalStage(s))
}

/**
 * 기업 전형 전체 집합을 한 번에 저장한다(추가·이름변경·순서변경·삭제 공용).
 * 진행 중인 지원자가 점유한 단계의 삭제는 서버가 409로 거절한다.
 */
export async function setStages(jobId: string, stages: { id?: string; name: string }[]): Promise<void> {
  const job = getJobById(jobId)
  if (!job) throw new Error('공고를 찾을 수 없습니다.')
  await api(`/jobs/${encodeURIComponent(jobId)}/stages`, {
    method: 'PUT',
    body: JSON.stringify({
      expectedVersion: job.version,
      stages: stages.map(s => (s.id ? { id: s.id, name: s.name } : { name: s.name })),
    }),
  })
  await refreshPosting(jobId)
}

function editable(jobId: string): { id: string; name: string }[] {
  return getStages(jobId).map(s => ({ id: s.id, name: s.name }))
}

/** 단계 추가 — 맨 뒤에 붙인다. */
export async function addStage(jobId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  await setStages(jobId, [...editable(jobId), { name: trimmed }])
}

/** 단계명 변경. */
export async function renameStage(jobId: string, stageId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  await setStages(jobId, editable(jobId).map(s => (s.id === stageId ? { ...s, name: trimmed } : s)))
}

/** 단계 삭제. 진행 중인 지원자가 점유하고 있으면 서버가 거절한다(예외가 올라온다). */
export async function removeStage(jobId: string, stageId: string): Promise<void> {
  await setStages(jobId, editable(jobId).filter(s => s.id !== stageId))
}

/** 단계 순서 이동 (-1 위 / +1 아래). 범위를 벗어나면 무시한다. */
export async function moveStage(jobId: string, stageId: string, delta: -1 | 1): Promise<void> {
  const stages = editable(jobId)
  const i = stages.findIndex(s => s.id === stageId)
  const j = i + delta
  if (i < 0 || j < 0 || j >= stages.length) return
  const next = [...stages]
  ;[next[i], next[j]] = [next[j], next[i]]
  await setStages(jobId, next)
}

// ── 지원 스토어 ──────────────────────────────────────────────────────────────

/** 적재된 지원 전체(인가된 범위). */
export function getApplications(): JobApplication[] {
  return applicationList()
}

/** 한 공고의 지원자 (지원 순) */
export function getApplicationsByJob(jobId: string): JobApplication[] {
  return getApplications()
    .filter(a => a.jobId === jobId)
    .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))
}

/** 한 학생의 지원 내역 (최신 순) — 학생 마이페이지 '나의 지원 내역' */
export function getApplicationsByStudent(studentId: string): JobApplication[] {
  return getApplications()
    .filter(a => a.studentId === studentId)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
}

export function getApplicationById(id: string): JobApplication | undefined {
  return getApplications().find(a => a.id === id)
}

/** 학생 × 공고 1건 (없으면 undefined) */
export function getApplication(jobId: string, studentId: string): JobApplication | undefined {
  return getApplications().find(a => a.jobId === jobId && a.studentId === studentId)
}

// ── 상태 전이 ────────────────────────────────────────────────────────────────
//
// 모든 전이는 서버가 같은 트랜잭션에서 이력을 남긴다(CLAUDE.md 규칙 11).
// 화면이 이력을 직접 append 하지 않는다 — 이제 그 경로는 없다.

/**
 * 학생 지원. 서류(개별 이력서 파일)를 먼저 올려 fileId 를 받은 뒤 부른다.
 * 취소했던 건은 새 행을 만들지 않고 회차를 올린다 — 직전 회차는 그대로 보존된다.
 */
export async function applyToJob(jobId: string, fileId: string): Promise<JobApplication> {
  const job = getJobById(jobId)
  if (!job) throw new Error('공고를 찾을 수 없습니다.')
  const mine = getApplications().find(a => a.jobId === jobId)
  const created = await api<JobApplication>(`/jobs/${encodeURIComponent(jobId)}/applications`, {
    method: 'POST',
    headers: { 'Idempotency-Key': `apply:${jobId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}` },
    body: JSON.stringify({
      expectedPostingVersion: job.version,
      expectedVersion: mine?.status === 'CANCELED' ? mine.version : undefined,
      attachment: { kind: 'RESUME_FILE', fileId },
    }),
  })
  await refreshApplication(created.id)
  return created
}

async function transition(id: string, intent: 'advance' | 'reject' | 'cancel', reason = ''): Promise<void> {
  const application = getApplicationById(id)
  if (!application) throw new Error('지원 내역을 찾을 수 없습니다.')
  await api(`/job-applications/${encodeURIComponent(id)}/${intent}`, {
    method: 'POST', body: JSON.stringify({ expectedVersion: application.version, reason }),
  })
  await refreshApplication(id)
}

/** 학생 지원 취소. 이미 끝난 건(합격·탈락)은 서버가 거절한다. */
export async function cancelApplication(id: string, reason = ''): Promise<void> {
  await transition(id, 'cancel', reason)
}

/** 다음 전형 단계로 올린다. 마지막 단계를 통과하면 최종 합격이 된다. */
export async function advanceStage(id: string): Promise<void> {
  await transition(id, 'advance')
}

/** 탈락 처리. 어느 단계에서든 여기서 끝난다. */
export async function rejectApplication(id: string, reason = ''): Promise<void> {
  await transition(id, 'reject', reason)
}

// ── 파생·집계 (화면은 세지 않는다 — 규칙 10) ─────────────────────────────────

/** 지원 건의 현재 위치 라벨 — 단계에 올라가 있으면 단계명, 아니면 상태 라벨. */
export function currentStageLabel(application: JobApplication): string {
  if (application.status === 'IN_PROGRESS' && application.currentStageName) {
    return application.currentStageName
  }
  return APPLICATION_STATUS_LABEL[application.status]
}

/** 제출된 서류의 표시 문구. 이름만 남은 과거 행은 '확인 필요'로 읽는다. */
export function attachmentLabel(application: JobApplication): string {
  const attempt = application.currentAttempt
  if (!attempt?.attachmentKind) return '미제출'
  if (attempt.attachmentKind === 'PORTFOLIO') return APPLY_ATTACHMENT_LABEL.PORTFOLIO
  const name = attempt.attachmentName ?? attempt.legacyFileName
  const suffix = attempt.attachmentState === 'AVAILABLE' ? name : `${name ?? ''} (확인 필요)`
  return `${APPLY_ATTACHMENT_LABEL.RESUME_FILE}${suffix ? ` · ${suffix}` : ''}`
}

/** 제출 서류 다운로드 경로 — 권한을 확인하는 API 경로다(정적 URL 이 아니다). */
export function attachmentUrl(attempt: JobApplicationAttempt | null): string | null {
  return attempt?.attachmentFileId && attempt.attachmentState === 'AVAILABLE'
    ? `/api/v1/job-files/${attempt.attachmentFileId}`
    : null
}

/** 단계별 현재 인원 — 전형 단계 관리 화면의 '(N명)' 표시 */
export function stageCounts(jobId: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const stage of getFlowStages(jobId)) counts[stage.id] = 0
  for (const a of getApplicationsByJob(jobId)) {
    if (a.status === 'IN_PROGRESS' && a.currentStageId && a.currentStageId in counts) {
      counts[a.currentStageId] += 1
    }
  }
  return counts
}

/** 진행 타임라인의 한 칸 */
export interface ProgressStep {
  label: string
  done: boolean
  current: boolean
  at?: string
  /** 교내 절차(담당자가 처리하는 칸)인가 */
  internal: boolean
}

/**
 * 학생 마이페이지 진행 타임라인.
 * '지원 완료' + 교내 절차 + 기업 전형을 칸으로 깔고, **현재 회차의** 이력에서 도달
 * 시각을 채운다. 회차를 섞으면 재지원 뒤에 예전 도달 시각이 남는다.
 * 탈락·취소는 그 자리에서 멈춘 것으로 그린다 — 뒤 칸은 done/current 둘 다 false.
 */
export function buildTimeline(
  application: JobApplication,
  events: { attemptNo: number; action: string; toStageId: string | null; at: string }[],
): ProgressStep[] {
  const stages = application.stages ?? getFlowStages(application.jobId)
  const reachedAt = new Map<string, string>()
  for (const e of events) {
    if (e.attemptNo !== application.currentAttemptNo) continue
    if (e.action === 'APPLY' || e.action === 'REAPPLY') reachedAt.set('__applied', e.at)
    if (e.action === 'ADVANCE' && e.toStageId) reachedAt.set(e.toStageId, e.at)
  }
  const keys = ['__applied', ...stages.map(s => s.id)]
  const labels = ['지원 완료', ...stages.map(s => s.name)]
  const currentIndex = application.currentStageId
    ? Math.max(0, keys.indexOf(application.currentStageId))
    : 0
  const settled = !APPLICATION_OPEN_STATUSES.includes(application.status)
  const doneThrough = application.status === 'PASSED' ? keys.length - 1 : currentIndex

  return keys.map((key, i) => ({
    label: labels[i],
    done: i <= doneThrough && (i < currentIndex || settled || i === 0),
    current: !settled && i === currentIndex,
    at: reachedAt.get(key),
    internal: i > 0 && !!stages[i - 1]?.systemKey,
  }))
}

// ── 지원자 현황 필터 (단계·상태) ────────────────────────────────────────────
//
// 값 공간은 하나다: 'ALL' | 전형 단계 id | 상태 코드(APPLIED·PASSED·…).

export const APPLICANT_FILTER_ALL = 'ALL'

export interface ApplicantFilterOption {
  value: string
  label: string
  count: number
}

/** 「전형 단계」 필터 선택지 — 전체 · 지원 완료 · 단계별 · 최종 결과 */
export function getApplicantFilterOptions(jobId: string): ApplicantFilterOption[] {
  const list = getApplicationsByJob(jobId)
  const onStage = (stageId: string) =>
    list.filter(a => a.status === 'IN_PROGRESS' && a.currentStageId === stageId).length
  const onStatus = (status: ApplicationStatus) => list.filter(a => a.status === status).length

  return [
    { value: APPLICANT_FILTER_ALL, label: '전체', count: list.length },
    { value: 'APPLIED', label: APPLICATION_STATUS_LABEL.APPLIED, count: onStatus('APPLIED') },
    ...getFlowStages(jobId).map(stage => ({
      value: stage.id,
      label: stage.name,
      count: onStage(stage.id),
    })),
    { value: 'PASSED', label: APPLICATION_STATUS_LABEL.PASSED, count: onStatus('PASSED') },
    { value: 'REJECTED', label: APPLICATION_STATUS_LABEL.REJECTED, count: onStatus('REJECTED') },
    { value: 'CANCELED', label: APPLICATION_STATUS_LABEL.CANCELED, count: onStatus('CANCELED') },
  ]
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as string[]).includes(value)
}

/** 필터를 적용한 지원자 목록 — 지원자 현황 표의 단일 조회 지점. */
export function queryJobApplicants(
  jobId: string,
  filter: string = APPLICANT_FILTER_ALL,
): JobApplication[] {
  const list = getApplicationsByJob(jobId)
  if (filter === APPLICANT_FILTER_ALL) return list
  if (isApplicationStatus(filter)) return list.filter(a => a.status === filter)
  return list.filter(a => a.status === 'IN_PROGRESS' && a.currentStageId === filter)
}

/** 공고 1건의 지원 현황 요약 — 목록 카드·헤더용(적재된 인가 범위 기준) */
export interface JobApplicationSummary {
  total: number
  /** 진행 중(지원완료 + 전형진행) */
  open: number
  passed: number
  rejected: number
  canceled: number
}

export function summarizeJob(jobId: string): JobApplicationSummary {
  const list = getApplicationsByJob(jobId)
  return {
    total: list.length,
    open: list.filter(a => APPLICATION_OPEN_STATUSES.includes(a.status)).length,
    passed: list.filter(a => a.status === 'PASSED').length,
    rejected: list.filter(a => a.status === 'REJECTED').length,
    canceled: list.filter(a => a.status === 'CANCELED').length,
  }
}

/** 서버 집계 — 전체 모집단(인가된 범위) 기준. 화면 배지가 스토어를 세지 않아야 할 때 쓴다. */
export async function getApplicationStatistics(filters: {
  postingId?: string; status?: string; stageId?: string
  collegeCode?: string; deptCode?: string; grade?: number; q?: string
} = {}): Promise<JobApplicationSummary & {
  applied: number; inProgress: number
  stages: { stageId: string; count: number }[]; scope: string
}> {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') query.set(name, String(value))
  }
  return api(`/job-applications/summary?${query.toString()}`)
}

export { loadApplications }
export type { JobApplication, HiringStage, ApplicationStatus, JobApplicationAttempt }
export { APPLICATION_STATUS_LABEL, APPLY_ATTACHMENT_LABEL, isInternalStage }
