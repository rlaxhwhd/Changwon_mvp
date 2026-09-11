// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원 스키마 (단일 소스) — 정본은 서버(dc.job_application)다.
//
// 대상 — **교내 공고 중 recruitType='RECOMMENDATION' 인 것만.** 일반공고·외부공고는
// 지원 경로가 없다(외부는 applyUrl 로 나간다). 판정은 서버가 한다.
//
// ★ 전형 단계를 고정 enum 으로 굳히지 않는다.
//   비교과(대기/선발/탈락/취소)와 달리 채용 전형은 공고마다 단계 수와 이름이 다르다 —
//   담당자가 공고별로 정의하고 추가·삭제·순서변경한다. 그래서 단계는 **데이터**
//   (dc.job_stage)이고, 상태는 그 위의 위치값이다.
//
// ★ 재지원은 새 행을 만들지 않고 **회차(attempt)** 를 올린다. 직전 제출 스냅샷·서류
//   귀속·취소 이력을 덮어쓰지 않기 위해서다.
//
// 상태 이력은 append-only (CLAUDE.md 규칙 11). 지원 레코드는 **현재 위치만** 들고,
// "무엇이 언제 왜 바뀌었나"는 JobApplicationEvent 가 전담한다.
// ─────────────────────────────────────────────────────────────────────────────

// ── 전형 단계 ────────────────────────────────────────────────────────────────

/**
 * 전형 단계 1개. 공고에 종속되며 담당자가 자유롭게 정의한다.
 * systemKey 가 있는 두 단계(서류 검토·기업 전달)는 **교내 절차**다 —
 * 모든 추천채용 공고에 항상 있고 이름·순서·삭제를 서버가 거부한다.
 * 예전에는 이 둘을 전역 상수 ID(sys_review·sys_forward)로 뒀는데, 그러면 서로 다른
 * 공고의 이력이 같은 단계를 가리킨다 — 지금은 공고마다 별개의 행이다.
 */
export interface HiringStage {
  id: string
  /** 표시 순서 — 1부터 */
  order: number
  name: string
  /** 교내 절차 표시. 기업 전형이면 null */
  systemKey: 'REVIEW' | 'FORWARD' | null
}

/** 이 단계가 교내 절차인가(담당자 처리 · 삭제·순서변경 불가) */
export function isInternalStage(stage: HiringStage | undefined): boolean {
  return !!stage?.systemKey
}

// ── 상태 코드 ────────────────────────────────────────────────────────────────
//
// 코드값은 영문 상수, 표시는 라벨 맵으로 분리한다 (CLAUDE.md 규칙 4 · SPEC §7-0 규칙 4).

/** 지원 건 전체 상태 */
export type ApplicationStatus =
  | 'APPLIED'      // 지원 완료 — 아직 첫 단계 판정 전
  | 'IN_PROGRESS'  // 전형 진행 중 — 어느 단계엔가 올라가 있다
  | 'PASSED'       // 최종 합격 — 마지막 단계까지 통과
  | 'REJECTED'     // 탈락 — 어느 단계에서든 떨어지면 여기서 끝
  | 'CANCELED'     // 학생이 지원 취소

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'APPLIED', 'IN_PROGRESS', 'PASSED', 'REJECTED', 'CANCELED',
]

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: '지원 완료',
  IN_PROGRESS: '전형 진행',
  PASSED: '최종 합격',
  REJECTED: '탈락',
  CANCELED: '지원 취소',
}

/**
 * 현행 이관 매핑 — `APPLICATIONMASTER` 의 상태 컬럼값.
 * ⚠️ 현행 값이 **미확인**이라 전부 null 이다. 확인 후 채울 것 —
 * 비어 있으면 이관 스크립트를 쓸 수 없다(SPEC.md §5 #1 · §7-0 규칙 2).
 */
export const APPLICATION_STATUS_LEGACY: Record<ApplicationStatus, string | null> = {
  APPLIED: null,
  IN_PROGRESS: null,
  PASSED: null,
  REJECTED: null,
  CANCELED: null,
}

/** 아직 결과가 나오지 않은 = 목록 기본 필터에 걸리는 상태 */
export const APPLICATION_OPEN_STATUSES: ApplicationStatus[] = ['APPLIED', 'IN_PROGRESS']

// ── 지원 서류 ────────────────────────────────────────────────────────────────
//
// 현행 `ReAppD` 지원 프로세스에 대응한다(SPEC.md §3-6 S16).
// 학생은 지원 시 서류를 반드시 하나 낸다 — 서버가 강제한다(규칙 5).

export type ApplyAttachmentKind =
  | 'PORTFOLIO'    // 드림캐치 포트폴리오 — 학생별 영속 provider 미착수(DB.md §8-3 #4)
  | 'RESUME_FILE'  // 개별 이력서 파일 — 서버 볼륨에 보관, 권한 확인 후 스트리밍

export const APPLY_ATTACHMENT_KINDS: ApplyAttachmentKind[] = ['PORTFOLIO', 'RESUME_FILE']

export const APPLY_ATTACHMENT_LABEL: Record<ApplyAttachmentKind, string> = {
  PORTFOLIO: '드림캐치 포트폴리오',
  RESUME_FILE: '개별 이력서',
}

/**
 * 현행 이관 매핑 — `APPLICATIONMASTER` 의 제출서류 구분값.
 * ⚠️ 현행 값이 **미확인**이라 null 이다. 확인 후 채울 것(SPEC.md §7-0 규칙 2).
 */
export const APPLY_ATTACHMENT_LEGACY: Record<ApplyAttachmentKind, string | null> = {
  PORTFOLIO: null,
  RESUME_FILE: null,
}

/** 제출 서류가 실제로 열리는가. 이름만 남은 과거 행은 MISSING_BINARY 다. */
export type AttachmentState = 'AVAILABLE' | 'MISSING_BINARY' | 'DEPENDENCY_UNAVAILABLE' | 'UNKNOWN'

// ── 제출 회차 ────────────────────────────────────────────────────────────────

/**
 * 한 번의 제출. 신청 시점 학적 스냅샷을 함께 저장한다(CLAUDE.md 규칙 2).
 * 스냅샷은 **서버가** 현재 학사 데이터에서 만든다 — 화면이 준 신원은 쓰지 않는다.
 * 대학·학과는 (단대코드, 학과코드) 쌍으로 해석한다 — 학과명 매칭 금지(규칙 7).
 */
export interface JobApplicationAttempt {
  attemptNo: number
  submittedAt: string
  studentNo: string | null
  studentName: string | null
  studentMajor: string | null
  grade: number | null
  enrollmentStatus: string | null
  collegeCode: string | null
  collegeLabel: string | null
  deptCode: string | null
  deptLabel: string | null
  studentType: string | null
  attachmentKind: ApplyAttachmentKind | null
  attachmentState: AttachmentState
  attachmentFileId: string | null
  attachmentName: string | null
  legacyFileName: string | null
}

// ── 지원 1건 ─────────────────────────────────────────────────────────────────

/** 지원 1건. 학생 1명 × 공고 1건 = 최대 1행(중복은 서버가 409로 거절한다). */
export interface JobApplication {
  id: string
  /** 대상 공고 id — 교내 추천채용만 */
  jobId: string
  /** 학생 id (person.alias) */
  studentId: string
  studentName: string | null
  status: ApplicationStatus
  /** 현재 올라가 있는 전형 단계 id. APPLIED(첫 판정 전)면 null */
  currentStageId: string | null
  currentStageName: string | null
  currentAttemptNo: number
  appliedAt: string
  canceledAt: string | null
  version: number
  lastEventAt: string | null
  /** 현재 회차의 제출 내용 */
  currentAttempt: JobApplicationAttempt | null
  /** 상세 조회에서만 실린다 */
  posting?: { id: string; company: string; role: string; version: number }
  stages?: HiringStage[]
}

// ── 처리 이력 (append-only) ──────────────────────────────────────────────────

/**
 * 지원 건에 일어난 변화의 종류. 값은 코드다 — 한글을 값으로 쓰지 않는다.
 * 현행 한글 kind 와의 대응: 지원→APPLY, 단계이동→ADVANCE, 탈락→REJECT,
 * 최종합격→PASS, 지원취소→CANCEL. 재지원의 두 번째 '지원'은 REAPPLY 다.
 */
export type JobApplicationEventKind =
  'APPLY' | 'REAPPLY' | 'ADVANCE' | 'REJECT' | 'PASS' | 'CANCEL' | 'IMPORT'

export const APPLICATION_EVENT_LABEL: Record<JobApplicationEventKind, string> = {
  APPLY: '지원',
  REAPPLY: '재지원',
  ADVANCE: '단계이동',
  REJECT: '탈락',
  PASS: '최종합격',
  CANCEL: '지원취소',
  IMPORT: '이관',
}

export interface JobApplicationEvent {
  id: string
  /** 지원 건 안에서 단조 증가하는 순번 */
  seq: number
  attemptNo: number
  action: JobApplicationEventKind
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus | null
  fromStageId: string | null
  toStageId: string | null
  /**
   * 단계명 스냅샷. 단계는 나중에 이름이 바뀌거나 지워질 수 있으므로
   * id 만 남기면 과거 이력이 "알 수 없는 단계"가 된다.
   */
  fromStageName: string | null
  toStageName: string | null
  reason: string
  /** 처리자 이름 스냅샷 */
  byName: string | null
  at: string
}
