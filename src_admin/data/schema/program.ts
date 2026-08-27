// ─────────────────────────────────────────────────────────────────────────
// 비교과 프로그램 스키마 (단일 소스) — Counsel_README §5-E
//
// 학생 화면 "비교과프로그램 신청"(src_v2/pages/growth/ProgramApply.tsx)의 공급 측.
// 상담사가 프로그램을 등록하고, 신청자·출석을 관리한다. 출석 '노쇼' 결과가
// 블랙리스트(벌점, §7 dc_penalty)와 연동된다.
// ─────────────────────────────────────────────────────────────────────────

import type { StudentType } from '../../../src_v2/data/careerProcess'
import type { RoadmapEntry } from '../../../src_v2/data/schema/roadmap'

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
export type OutcomeStatus =
  | '수료' | '미수료' | '참석'
  | '불참(벌점1점)' | '불참(벌점2점)' | '불참(벌점3점)'

/**
 * 선발자 관리 상태변경 select box 값.
 * '선발'=결과만 해제(선발 상태 유지), '대기'=선발 취소(신청자 관리로 복귀),
 * '삭제'=신청 삭제(행 제거).
 */
export const SELECTED_ACTIONS = [
  '선발', '대기', '수료', '미수료', '참석',
  '불참(벌점1점)', '불참(벌점2점)', '불참(벌점3점)', '삭제',
] as const
export type SelectedAction = (typeof SELECTED_ACTIONS)[number]

/** 불참 tier → 부과 벌점. 2점은 현행에 없는 신설 tier다(SPEC.md §7-8 `NOSHOW_2`). */
export const ABSENCE_PENALTY: Record<string, number> = {
  '불참(벌점1점)': 1,
  '불참(벌점2점)': 2,
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
  /** 신청 취소 일시 (ISO 8601) — 아직 취소 전이면 없음.
   *  취소 처리 흐름은 미구현이고 신청자 관리 표에 칸만 노출한다. */
  canceledAt?: string
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
  /** CARE 7+ 분류 — 이 프로그램이 겨냥하는 6유형(T1~T6). 중복 선택 가능.
   *  유형 정의는 careerProcess(STUDENT_TYPE_MAP)가 단일 소스이므로 코드만 저장하고
   *  표시는 typeLabel()로 한다(한글 라벨을 값으로 쓰지 않는다). */
  careTypes?: StudentType[]
  /** 로드맵 편입 — NONE/RECOMMEND/REQUIRED. NONE 이 아니면 careTypes 유형 학생의
   *  IAP 실행 축에 칸이 1개 생긴다. 칸 완료는 이 프로그램 '수료' 시 자동. → PROCESS.md §6-4 */
  roadmapEntry?: RoadmapEntry
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
    careTypes: [],
    roadmapEntry: 'NONE',
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
