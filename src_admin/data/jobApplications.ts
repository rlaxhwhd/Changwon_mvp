// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원 로더 — localStorage 'dc_job_applications' + 'dc_job_stages'
//
// 학생(/jobs/:id)이 지원하고 상담사(/admin/jobs/applicants)가 전형을 진행한다.
// 양쪽이 같은 스토어를 구독하므로 상담사가 단계를 올리면 학생 마이페이지에 그대로
// 반영된다 — jobsSource.ts 가 공고에서 하는 것과 같은 구조다.
//
// ★ 대상은 **교내 추천채용 공고뿐**이다. canApplyTo() 가 유일한 판정 지점이고,
//   화면은 이 함수만 부른다. 조건을 화면에 다시 쓰지 말 것.
//
// ★ 정합성은 이 로더가 전담한다(CLAUDE.md 규칙 5 — FK 없는 DB 전제).
//   중복 지원·마감 공고·대상 아닌 공고·단계 순서 위반을 여기서 거부한다.
//
// ★ 집계(단계별 인원)는 데이터층에서 끝낸다(규칙 10). 화면은 배열을 받아 세지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import type { JobPosting } from './schema/job'
import type {
  ApplicationStatus,
  HiringStage,
  JobApplication,
} from './schema/jobApplication'
import {
  APPLICATION_OPEN_STATUSES,
  APPLICATION_STATUS_LABEL,
  DEFAULT_STAGE_NAMES,
} from './schema/jobApplication'
import { getJobById, getInternalJobs, updateJob } from './jobsSource'
import { appendJobApplicationEvent, getEventsByApplication } from './jobApplicationEvents'
import { getActiveCounselor } from './counselors'

const APPLICATIONS_KEY = 'dc_job_applications'

// ── 지원 대상 판정 (단일 지점) ───────────────────────────────────────────────

/**
 * 이 공고가 지원 관리 대상인가 — **교내(manual) + 추천채용**일 때만 참.
 * 일반공고·외부공고는 지원 경로가 없다(외부는 applyUrl 로 나간다).
 */
export function isRecommendedInternal(job: JobPosting | undefined): boolean {
  return !!job && job.source === 'manual' && job.recruitType === '추천채용'
}

/** 지원 관리 대상 공고 목록 — 상담사 '추천채용 지원자관리' 화면의 소스 */
export function getRecommendedJobs(): JobPosting[] {
  return getInternalJobs().filter(isRecommendedInternal)
}

/** 학생이 지금 이 공고에 지원할 수 있는가. 불가 사유를 함께 준다(화면 안내용). */
export function canApplyTo(
  jobId: string,
  studentId: string,
): { ok: true } | { ok: false; reason: string } {
  const job = getJobById(jobId)
  if (!job) return { ok: false, reason: '공고를 찾을 수 없습니다.' }
  if (!isRecommendedInternal(job)) return { ok: false, reason: '지원 접수를 받지 않는 공고입니다.' }
  if (job.status === '마감') return { ok: false, reason: '마감된 공고입니다.' }
  const mine = getApplication(jobId, studentId)
  if (mine && mine.status !== 'CANCELED') return { ok: false, reason: '이미 지원한 공고입니다.' }
  return { ok: true }
}

// ── 전형 단계 ────────────────────────────────────────────────────────────────

function makeStageId(): string {
  return `stg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * 공고의 전형 단계 (순서대로).
 * 아직 정의하지 않은 공고는 기본 3단계로 폴백한다 — 기존 공고가 지원자 관리에서
 * 빈 화면이 되지 않도록. 폴백은 **읽기 전용 파생값**이고 저장하지 않는다.
 */
export function getStages(jobId: string): HiringStage[] {
  const job = getJobById(jobId)
  const defined = job?.stages
  if (defined && defined.length) return [...defined].sort((a, b) => a.order - b.order)
  return DEFAULT_STAGE_NAMES.map((name, i) => ({ id: `${jobId}__default_${i + 1}`, order: i + 1, name }))
}

/** 단계 배열을 통째로 저장 — order 를 1..n 으로 재부여한다(순서변경·삭제 공용). */
export function setStages(jobId: string, stages: HiringStage[]): void {
  const normalized = stages.map((s, i) => ({ ...s, order: i + 1 }))
  updateJob(jobId, { stages: normalized })
}

/** 단계 추가 — 맨 뒤에 붙인다. */
export function addStage(jobId: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  setStages(jobId, [...getStages(jobId), { id: makeStageId(), order: 0, name: trimmed }])
}

/** 단계명 변경. */
export function renameStage(jobId: string, stageId: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  setStages(jobId, getStages(jobId).map(s => (s.id === stageId ? { ...s, name: trimmed } : s)))
}

/**
 * 단계 삭제.
 * ⚠ 그 단계에 **진행 중인** 지원자가 있으면 거부한다 — 지우면 갈 곳을 잃는다.
 * 판정 기준은 stageCounts 와 같은 IN_PROGRESS 다. 둘이 어긋나면 화면이
 * "현재 0명"이라고 표시하면서 삭제만 거부하는 모순이 생긴다.
 * 이미 끝난 지원자(합격·탈락)는 currentStageId 가 남아 있어도 막지 않는다 —
 * 그 값은 "어디서 끝났나"를 가리키는 기록이지 점유가 아니다.
 * 반환값 false 는 "진행 중인 지원자가 있어 못 지웠다"는 뜻이다(화면이 안내한다).
 */
export function removeStage(jobId: string, stageId: string): boolean {
  const occupied = getApplicationsByJob(jobId)
    .some(a => a.status === 'IN_PROGRESS' && a.currentStageId === stageId)
  if (occupied) return false
  setStages(jobId, getStages(jobId).filter(s => s.id !== stageId))
  return true
}

/** 단계 순서 이동 (-1 위 / +1 아래). 범위를 벗어나면 무시한다. */
export function moveStage(jobId: string, stageId: string, delta: -1 | 1): void {
  const stages = getStages(jobId)
  const i = stages.findIndex(s => s.id === stageId)
  const j = i + delta
  if (i < 0 || j < 0 || j >= stages.length) return
  const next = [...stages]
  ;[next[i], next[j]] = [next[j], next[i]]
  setStages(jobId, next)
}

// ── 지원 스토어 ──────────────────────────────────────────────────────────────

export function getApplications(): JobApplication[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as JobApplication[]
    }
  } catch {
    /* 지원 없음 */
  }
  return []
}

function persist(list: JobApplication[]): void {
  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
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

/** 학생 × 공고 1건 (없으면 undefined) — 중복 지원 판정과 학생 화면 버튼 상태에 쓴다. */
export function getApplication(jobId: string, studentId: string): JobApplication | undefined {
  return getApplications().find(a => a.jobId === jobId && a.studentId === studentId)
}

// ── 상태 전이 ────────────────────────────────────────────────────────────────
//
// ★ 모든 전이는 처리 이력(dc_job_app_events)을 함께 남긴다(CLAUDE.md 규칙 11).
//   지원 레코드는 현재 위치만 들고, 경로는 이력이 전담한다.

/** 이력 기록자 — 상담사 화면에서 활성 상담사를 매번 넘기지 않도록 여기서 해석한다. */
function actor(): { by: string; byName: string } {
  const me = getActiveCounselor()
  return { by: me.id, byName: me.name }
}

function patch(id: string, next: Partial<JobApplication>): void {
  persist(getApplications().map(a => (a.id === id ? { ...a, ...next } : a)))
}

/** 학생이 지원할 때 넘기는 신원 — 신청 시점 스냅샷으로 그대로 저장된다. */
export interface ApplicantIdentity {
  id: string
  studentNo: string
  name: string
  major: string
  grade: number
  enrollmentStatus: JobApplication['snapEnrollStatus']
}

/**
 * 학생 지원. 대상·중복·마감 판정은 canApplyTo 가 전담한다.
 * 거부되면 undefined 를 반환한다(화면이 사유를 다시 물어 안내).
 *
 * 취소했던 건은 새 행을 만들지 않고 되살린다 — 학생 × 공고 1행 불변을 지킨다.
 */
export function applyToJob(jobId: string, student: ApplicantIdentity): JobApplication | undefined {
  if (!canApplyTo(jobId, student.id).ok) return undefined

  const revived = getApplication(jobId, student.id)
  const now = new Date().toISOString()
  const base = {
    jobId,
    studentId: student.id,
    snapStudentNo: student.studentNo,
    snapName: student.name,
    snapMajor: student.major,
    snapGrade: student.grade,
    snapEnrollStatus: student.enrollmentStatus,
    appliedAt: now,
    status: 'APPLIED' as ApplicationStatus,
  }

  const application: JobApplication = revived
    ? { ...revived, ...base, currentStageId: undefined, canceledAt: undefined }
    : { ...base, id: `japp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

  persist(revived
    ? getApplications().map(a => (a.id === application.id ? application : a))
    : [...getApplications(), application])

  appendJobApplicationEvent({
    applicationId: application.id,
    jobId,
    studentId: student.id,
    kind: '지원',
    by: student.id,
    byName: student.name,
  })
  return application
}

/** 학생 지원 취소. 이미 끝난 건(합격·탈락)은 취소하지 않는다. */
export function cancelApplication(id: string, reason?: string): void {
  const application = getApplicationById(id)
  if (!application || !APPLICATION_OPEN_STATUSES.includes(application.status)) return

  patch(id, { status: 'CANCELED', canceledAt: new Date().toISOString(), currentStageId: undefined })
  appendJobApplicationEvent({
    applicationId: id,
    jobId: application.jobId,
    studentId: application.studentId,
    kind: '지원취소',
    reason,
    by: application.studentId,
    byName: application.snapName,
  })
}

/**
 * 다음 전형 단계로 올린다.
 * APPLIED 면 1단계로, 진행 중이면 바로 다음 단계로 — **단계를 건너뛰지 않는다.**
 * 마지막 단계를 통과하면 최종 합격 처리한다.
 */
export function advanceStage(id: string): void {
  const application = getApplicationById(id)
  if (!application || !APPLICATION_OPEN_STATUSES.includes(application.status)) return

  const stages = getStages(application.jobId)
  if (!stages.length) return

  const currentIndex = application.currentStageId
    ? stages.findIndex(s => s.id === application.currentStageId)
    : -1
  const from = currentIndex >= 0 ? stages[currentIndex] : undefined

  // 마지막 단계에서 한 번 더 올리면 최종 합격이다.
  if (currentIndex >= stages.length - 1 && currentIndex >= 0) {
    patch(id, { status: 'PASSED' })
    appendJobApplicationEvent({
      applicationId: id,
      jobId: application.jobId,
      studentId: application.studentId,
      kind: '최종합격',
      fromStageId: from?.id,
      fromStageName: from?.name,
      ...actor(),
    })
    return
  }

  const to = stages[currentIndex + 1]
  patch(id, { status: 'IN_PROGRESS', currentStageId: to.id })
  appendJobApplicationEvent({
    applicationId: id,
    jobId: application.jobId,
    studentId: application.studentId,
    kind: '단계이동',
    fromStageId: from?.id,
    fromStageName: from?.name,
    toStageId: to.id,
    toStageName: to.name,
    ...actor(),
  })
}

/** 탈락 처리. 어느 단계에서든 여기서 끝난다. */
export function rejectApplication(id: string, reason?: string): void {
  const application = getApplicationById(id)
  if (!application || !APPLICATION_OPEN_STATUSES.includes(application.status)) return

  const from = getStages(application.jobId).find(s => s.id === application.currentStageId)
  patch(id, { status: 'REJECTED' })
  appendJobApplicationEvent({
    applicationId: id,
    jobId: application.jobId,
    studentId: application.studentId,
    kind: '탈락',
    fromStageId: from?.id,
    fromStageName: from?.name,
    reason,
    ...actor(),
  })
}

// ── 파생·집계 (화면은 세지 않는다 — 규칙 10) ─────────────────────────────────

/** 지원 건의 현재 위치 라벨 — 단계에 올라가 있으면 단계명, 아니면 상태 라벨. */
export function currentStageLabel(application: JobApplication): string {
  if (application.status === 'IN_PROGRESS' && application.currentStageId) {
    const stage = getStages(application.jobId).find(s => s.id === application.currentStageId)
    if (stage) return stage.name
  }
  return APPLICATION_STATUS_LABEL[application.status]
}

/** 단계별 현재 인원 — 전형 단계 관리 화면의 '(N명)' 표시 */
export function stageCounts(jobId: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const stage of getStages(jobId)) counts[stage.id] = 0
  for (const a of getApplicationsByJob(jobId)) {
    if (a.status === 'IN_PROGRESS' && a.currentStageId && a.currentStageId in counts) {
      counts[a.currentStageId] += 1
    }
  }
  return counts
}

/** 진행 타임라인의 한 칸 */
export interface ProgressStep {
  /** 표시 이름 — '지원 완료' + 전형 단계명 */
  label: string
  /** 지나온 칸 (완료) */
  done: boolean
  /** 지금 있는 칸 */
  current: boolean
  /** 그 칸에 도달한 일시 ISO (지나온 칸만) */
  at?: string
}

/**
 * 학생 마이페이지 진행 타임라인 (image10).
 * '지원 완료' + 공고의 전형 단계 전부를 칸으로 깔고, 이력에서 도달 시각을 채운다.
 * 탈락·취소는 그 자리에서 멈춘 것으로 그린다 — 뒤 칸은 done/current 둘 다 false.
 */
export function getProgressTimeline(application: JobApplication): ProgressStep[] {
  const stages = getStages(application.jobId)
  const events = getEventsByApplication(application.id)

  // 칸별 도달 시각 — '지원'은 0번 칸, '단계이동'은 도착 단계 칸.
  const reachedAt = new Map<string, string>()
  for (const e of events) {
    if (e.kind === '지원') reachedAt.set('__applied', e.at)
    if (e.kind === '단계이동' && e.toStageId) reachedAt.set(e.toStageId, e.at)
  }

  const keys = ['__applied', ...stages.map(s => s.id)]
  const labels = ['지원 완료', ...stages.map(s => s.name)]

  // 지금 몇 번째 칸인가 — 단계에 올라가 있으면 그 칸, 아니면 0번(지원 완료).
  const currentIndex = application.currentStageId
    ? Math.max(0, keys.indexOf(application.currentStageId))
    : 0
  // 끝난 건(합격·탈락·취소)은 '현재' 표시를 하지 않는다.
  const settled = application.status !== 'APPLIED' && application.status !== 'IN_PROGRESS'
  // 최종 합격이면 마지막 칸까지 전부 지나온 것이다.
  const doneThrough = application.status === 'PASSED' ? keys.length - 1 : currentIndex

  return keys.map((key, i) => ({
    label: labels[i],
    done: i <= doneThrough && (i < currentIndex || settled || i === 0),
    current: !settled && i === currentIndex,
    at: reachedAt.get(key),
  }))
}

/** 공고 1건의 지원 현황 요약 — 목록 카드·헤더용 */
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

export type { JobApplication, HiringStage, ApplicationStatus }
export { APPLICATION_STATUS_LABEL }
