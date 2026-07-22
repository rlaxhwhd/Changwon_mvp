// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 스키마 (단일 소스) — Counsel_README §5-E
//
// 학생 화면 "비교과프로그램 신청"(src_v2/pages/growth/ProgramApply.tsx)의 공급 측.
// 상담사가 프로그램을 등록하고, 신청자·출석을 관리한다. 출석 '노쇼' 결과가
// 블랙리스트(벌점, §7 dc_penalty)와 연동된다.
// ─────────────────────────────────────────────────────────────────────────

/** 프로그램 카테고리 — 학생 ProgramApply 카테고리와 정합 */
export type ProgramCategory = '진로' | '취업' | '어학' | '창업' | '자격증' | '기타'

export const PROGRAM_CATEGORIES: ProgramCategory[] = [
  '진로', '취업', '어학', '창업', '자격증', '기타',
]

/** 프로그램 모집/운영 상태 */
export type ProgramStatus = '모집중' | '모집마감' | '종료'

export const PROGRAM_STATUSES: ProgramStatus[] = ['모집중', '모집마감', '종료']

/** 신청자 선발 상태 — 신청자 관리에서 상태변경으로 전이한다. '선발'만 선발자 관리에 노출. */
export type SelectionStatus = '대기' | '선발' | '탈락' | '취소'

/** 신청자 관리 상태변경 select box 순서 */
export const SELECTION_STATUSES: SelectionStatus[] = ['선발', '대기', '탈락', '취소']

/** 선발 후 결과 상태 — 선발자 관리에서 상태변경으로 설정(수료/미수료/참석/불참). '불참'은 벌점 tier 포함. */
export type OutcomeStatus = '수료' | '미수료' | '참석' | '불참(벌점1점)' | '불참(벌점3점)'

/** 선발자 관리 상태변경 select box 값. '선발'=결과 해제, '삭제'=신청 삭제(행 제거). */
export const SELECTED_ACTIONS = [
  '선발', '수료', '미수료', '참석', '불참(벌점1점)', '불참(벌점3점)', '삭제',
] as const
export type SelectedAction = (typeof SELECTED_ACTIONS)[number]

/** 불참 tier → 부과 벌점 */
export const ABSENCE_PENALTY: Record<string, number> = {
  '불참(벌점1점)': 1,
  '불참(벌점3점)': 3,
}

/** 신청자별 출석 상태 — '노쇼'가 블랙리스트 벌점 대상 */
export type AttendanceStatus = '미확인' | '출석' | '노쇼'

/** 프로그램 신청자 1명 */
export interface ProgramApplicant {
  /** 학생 id (StudentData.id) */
  studentId: string
  studentName: string
  studentMajor: string
  /** 신청 일시 (ISO 8601) */
  appliedAt: string
  /** 출석 상태 — 출석 체크 결과 */
  attendance: AttendanceStatus
  /** 차수 — 몇 차 모집/운영인지 (미지정이면 1차) */
  round?: number
  /** 선발 상태 — 미지정이면 '대기'. '선발'만 선발자 관리 페이지에 노출된다. */
  selectionStatus?: SelectionStatus
  /** 선발 후 결과 상태 — 선발자 관리에서 설정(수료/미수료/참석/불참). */
  outcomeStatus?: OutcomeStatus
}

/** 비교과 프로그램 1건 */
export interface Program {
  id: string
  title: string
  desc: string
  category: ProgramCategory
  /** 신청 시작일 (YYYY-MM-DD) */
  startDate: string
  /** 신청 마감일 (YYYY-MM-DD) */
  endDate: string
  /** 진행(운영) 기간 시작 (YYYY-MM-DD) */
  runStartDate?: string
  /** 진행(운영) 기간 종료 (YYYY-MM-DD) */
  runEndDate?: string
  /** 총 운영 회차 */
  sessions: number
  /** 담당자명 */
  manager: string
  /** 회계년도 */
  fiscalYear: string
  /** 정원 */
  capacity: number
  /** 프로그램 썸네일 경로 */
  image?: string
  /** 진행 장소 */
  location: string
  status: ProgramStatus
  /** 상단 고정 — true면 등록일과 무관하게 목록 최상단에 우선 노출 */
  pinned?: boolean
  /** 신청자 목록 (출석 포함) */
  applicants: ProgramApplicant[]
  /** 등록 일시 (ISO 8601) */
  createdAt: string
}

/** 새 프로그램 폼 초기값 */
export function blankProgram(): Omit<Program, 'id' | 'applicants' | 'createdAt'> {
  return {
    title: '',
    desc: '',
    category: '진로',
    startDate: '',
    endDate: '',
    runStartDate: '',
    runEndDate: '',
    sessions: 1,
    manager: '',
    fiscalYear: String(new Date().getFullYear()),
    capacity: 20,
    location: '',
    status: '모집중',
    pinned: false,
  }
}
