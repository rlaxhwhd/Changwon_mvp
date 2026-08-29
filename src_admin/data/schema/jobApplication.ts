// ─────────────────────────────────────────────────────────────────────────────
// 추천채용 지원 스키마 (단일 소스)
//
// 대상 — **교내 공고 중 recruitType='추천채용' 인 것만.** 일반공고·외부공고는
// 지원 경로가 없다(외부는 applyUrl 로 나간다). 이 범위는 요청서 "교내 추천채용
// 지원자 확인 및 관리" 문구를 그대로 따른 것이므로 임의로 넓히지 말 것.
//
// 왜 신설인가: 현행 `APPLICATIONMASTER` 1.7만 건이 이관 대상인데 우리 쪽에
// 지원 경로 자체가 없었다(SPEC.md §6 ① · §3-6 S16).
//
// ★ 전형 단계를 고정 enum 으로 굳히지 않는다.
//   비교과(`SelectionStatus` 대기/선발/탈락/취소)와 달리 채용 전형은 공고마다
//   단계 수와 이름이 다르다 — 상담사가 공고별로 정의하고 추가·삭제·순서변경한다.
//   그래서 단계는 **데이터**(HiringStage[])이고, 상태는 그 위의 위치값이다.
//
// 상태 이력은 append-only (CLAUDE.md 규칙 11). 지원 레코드는 **현재 위치만**
// 들고, "무엇이 언제 왜 바뀌었나"는 JobApplicationEvent 가 전담한다.
// 학생 마이페이지의 진행 타임라인이 이 이벤트를 그대로 그린다.
// ─────────────────────────────────────────────────────────────────────────────
import type { EnrollmentStatus } from '../../../src_v2/data/students'

// ── 전형 단계 ────────────────────────────────────────────────────────────────

/**
 * 전형 단계 1개. 공고에 종속되며 상담사가 자유롭게 정의한다.
 * (예: '서류 전형' · '인적성 검사' · '1차 면접' · '최종 결과')
 */
export interface HiringStage {
  /** 단계 id (stg_ prefix) */
  id: string
  /** 표시 순서 — 1부터. 순서변경 시 재부여한다. */
  order: number
  /** 단계명 — 상담사 자유 입력 */
  name: string
}

/** 공고에 단계가 아직 정의되지 않았을 때 쓰는 기본 3단계 (image8 기준) */
export const DEFAULT_STAGE_NAMES = ['서류 전형', '면접 전형', '최종 결과'] as const

/**
 * 교내 추천 절차 — 학생이 지원한 뒤, 기업 전형이 시작되기 전에 **상담사가** 처리하는 고정 2단계.
 *
 * 위의 HiringStage 와 성격이 다르다:
 *   - 기업 전형(HiringStage) = 공고마다 다르고 상담사가 정의·삭제한다. 수행 주체는 기업.
 *   - 교내 절차(여기)         = 모든 추천채용 공고에 항상 같다. 수행 주체는 상담사.
 * 그래서 공고 데이터(job.stages)에 넣지 않고 코드 상수로 둔다 — 지울 수 있으면 안 된다.
 *
 * 실제 진행 순서는 `getFlowStages()` 가 합쳐서 만든다:
 *   지원 완료 → 서류 검토 → 기업 전달 → (공고별 기업 전형…)
 */
export const INTERNAL_STAGES: HiringStage[] = [
  { id: 'sys_review', order: 1, name: '서류 검토' },
  { id: 'sys_forward', order: 2, name: '기업 전달' },
]

/** 이 단계가 교내 절차인가(상담사 처리 · 삭제·순서변경 불가) */
export function isInternalStage(stageId: string | undefined): boolean {
  return !!stageId && INTERNAL_STAGES.some(s => s.id === stageId)
}

// ── 상태 코드 ────────────────────────────────────────────────────────────────
//
// 코드값은 영문 상수, 표시는 라벨 맵으로 분리한다 (CLAUDE.md 규칙 4 · SPEC §7-0 규칙 4).
// 한글을 값 자체로 쓰면 이관 매핑과 라벨 변경이 같이 묶여버린다.

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
 * 같은 사유로 legacy 를 비워둔 선례: SPEC §3-1-⑩ `BASICSETTING.TRIALTYPE`.
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

// ── 지원 1건 ─────────────────────────────────────────────────────────────────

/**
 * 지원 1건. 학생 1명 × 공고 1건 = 최대 1행(중복 지원 거부는 로더가 전담 — 규칙 5).
 *
 * 학생 신원은 **신청 시점 스냅샷**을 함께 저장한다(CLAUDE.md 규칙 2).
 * 현행 `EP_PRM_APP`·`CON_PROF_INFO` 가 같은 패턴이고, 학과 개편·학적 변동 뒤에도
 * 과거 지원 이력이 깨지지 않게 하는 근거다(DB.md §3-5 ⑦).
 */
export interface JobApplication {
  /** 지원 id (japp_ prefix) */
  id: string
  /** 대상 공고 id (JobPosting.id) — 교내 추천채용만 */
  jobId: string
  /** 학생 id (StudentData.id = INTG_UID) */
  studentId: string
  // ── 신청 시점 스냅샷 ──
  snapStudentNo: string
  snapName: string
  snapMajor: string
  snapGrade: number
  snapEnrollStatus: EnrollmentStatus
  /** 지원 일시 (ISO 8601) */
  appliedAt: string
  /**
   * 현재 올라가 있는 전형 단계 id. APPLIED(첫 판정 전)면 없다.
   * 이력이 아니라 **현재 위치**다 — 경로는 JobApplicationEvent 가 들고 있다.
   */
  currentStageId?: string
  /** 지원 건 상태 */
  status: ApplicationStatus
  /** 지원 취소 일시 (ISO 8601) — status='CANCELED' 일 때만 */
  canceledAt?: string
}

// ── 처리 이력 (append-only) ──────────────────────────────────────────────────

/** 지원 건에 일어난 변화의 종류 */
export type JobApplicationEventKind =
  | '지원'       // 학생이 지원
  | '단계이동'   // 다음 전형 단계로 올림
  | '탈락'       // 해당 단계에서 탈락 처리
  | '최종합격'   // 마지막 단계 통과
  | '지원취소'   // 학생이 취소

export interface JobApplicationEvent {
  /** 이벤트 id (jae_ prefix) */
  id: string
  /** 대상 지원 id */
  applicationId: string
  jobId: string
  studentId: string
  kind: JobApplicationEventKind
  /** 단계이동·탈락 — 이전 단계 id */
  fromStageId?: string
  /** 단계이동 — 이후 단계 id */
  toStageId?: string
  /**
   * 단계명 스냅샷. 단계는 상담사가 나중에 이름을 바꾸거나 지울 수 있으므로
   * id 만 남기면 과거 이력이 "알 수 없는 단계"가 된다.
   */
  fromStageName?: string
  toStageName?: string
  /** 사유 — 탈락 시 권장, 그 외 선택 */
  reason?: string
  /** 처리자 id — 학생 지원/취소는 학생 본인 id */
  by: string
  /** 처리자 이름 스냅샷 */
  byName: string
  /** 처리 일시 ISO */
  at: string
}
