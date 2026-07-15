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
  /** 정원 */
  capacity: number
  /** 진행 장소 */
  location: string
  status: ProgramStatus
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
    capacity: 20,
    location: '',
    status: '모집중',
  }
}
