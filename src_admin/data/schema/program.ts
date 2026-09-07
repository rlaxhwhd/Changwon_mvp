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

// ── 조사 설정 (프로그램 개설 시 지정) ─────────────────────────────────────

/**
 * 만족도 조사 질문지 — 관리자 모듈에서 사전 등록한 것 중 하나를 고른다.
 * 현재 1종이고, 관리자 모듈에서 종류를 추가 등록할 수 있다.
 */
export interface SatisfactionForm {
  id: string
  label: string
  /** 참고 설문지 파일명 — 개설 화면에는 이름만 표시한다(업로드 아님). */
  attachment: string
}

export const SATISFACTION_FORMS: SatisfactionForm[] = [
  { id: 'SAT_DEFAULT', label: '기본 만족도 질문지', attachment: '만족도조사_설문지.hwp' },
]

/**
 * 역량향상률 조사 중분류 — 진로 · 직무 · 취업.
 * `itemCount`(진로 22 · 직무 23 · 취업 21)는 확정값이다.
 * ⚠️ `areas`의 영역 명칭은 아직 미확정이라 자리표시자다.
 *    설문지(한글)를 받으면 이 배열의 label만 교체하면 화면이 따라간다.
 */
export interface CompetencySurveyGroup {
  code: 'CAREER' | 'JOB' | 'EMPLOY'
  label: string
  /** 이 중분류의 전체 문항 수 */
  itemCount: number
  areas: { key: string; label: string }[]
}

const areasOf = (code: string): { key: string; label: string }[] =>
  Array.from({ length: 5 }, (_, i) => ({ key: `${code}_${i + 1}`, label: `영역 ${i + 1}` }))

export const COMPETENCY_SURVEY_GROUPS: CompetencySurveyGroup[] = [
  { code: 'CAREER', label: '진로', itemCount: 22, areas: areasOf('CAREER') },
  { code: 'JOB',    label: '직무', itemCount: 23, areas: areasOf('JOB') },
  { code: 'EMPLOY', label: '취업', itemCount: 21, areas: areasOf('EMPLOY') },
]

/** 역량향상률 조사 참고 설문지 — 이름만 표시한다(업로드 아님). */
export const COMPETENCY_SURVEY_ATTACHMENT = '역량향상률조사_설문지(한글).hwp'

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
  /** 선발 확정 일시 (ISO 8601) — '선발'로 바뀐 시점. 학생 알림의 "언제"가 이 값이다.
   *  선발이 풀리면 함께 지운다(선발되지 않은 신청자에게 남아 있으면 안 된다). */
  selectedAt?: string
  /** 선발 후 결과 상태 — 선발자 관리에서 설정(수료/미수료/참석/불참). */
  outcomeStatus?: OutcomeStatus
}

/** 비교과 프로그램 1건 */
export interface Program {
  id: string
  title: string
  /** 프로그램 내용 — 등록 화면의 평문 입력칸. 목록 카드·요약이 쓰는 짧은 소개다. */
  desc: string
  /**
   * 상세 내용 — 등록 화면의 리치에디터가 만든 **HTML**. 공고 하단에 그대로 펼친다.
   * desc 와 한 칸을 쓰면 둘 중 하나가 조용히 사라지므로 반드시 분리해서 둔다.
   * 붙여넣은 이미지는 이 HTML 안에 data URL 로 들어온다(파일 서버가 없다).
   */
  detail?: string
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
  /** 만족도 조사 실시 여부 */
  satisfactionSurvey?: boolean
  /** 실시할 때 쓰는 질문지 id — SATISFACTION_FORMS 중 하나 */
  satisfactionFormId?: string
  /** 역량향상률 조사 실시 여부 */
  competencySurvey?: boolean
  /** 조사할 영역 키 목록 — 체크한 영역의 질문지만 활성화된다. 예: ['CAREER_1','JOB_3'] */
  competencyAreas?: string[]
  /** 통계값 반영 — false면 통계 요청의 참가/수료 인원 집계에서 제외한다 */
  includeInStats?: boolean
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
    detail: '',
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
    satisfactionSurvey: true,
    satisfactionFormId: SATISFACTION_FORMS[0].id,
    competencySurvey: true,
    competencyAreas: [],
    includeInStats: true,
  }
}
