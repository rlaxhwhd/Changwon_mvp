// ─────────────────────────────────────────────────────────────────────────
// 채용공고 스키마 (단일 소스) — 정본은 서버(dc.job_posting)다.
//
// 값은 전부 **코드**다. 한글 라벨을 값 자체로 쓰지 않는다(CLAUDE.md 규칙 4).
//   구조 코드(상태·출처·채용유형·마감방식)는 앱이 값으로 분기하므로 여기 고정한다.
//   운영 코드(기업구분·근무형태·직종·경력·성별·지역·자소서분야)는 DB 의
//   dc.code_item 이 정본이고 화면은 metadataStore 에서 읽는다 — 여기에 배열로
//   박아 두면 관리자가 항목을 추가해도 화면에 나타나지 않는다(DB.md §8-5).
// ─────────────────────────────────────────────────────────────────────────
import { codeItems, codeLabel } from '../../../shared/metadataStore'
import type { HiringStage } from './jobApplication'

/** 저장된 게시 상태 — 담당자가 설정한 값 */
export type JobStatus = 'POSTED' | 'CLOSED'
/**
 * 학생·목록이 보는 상태. 저장 상태와 마감일이 어긋나면 마감일이 이긴다.
 * 서버가 응답마다 계산한다 — 화면이 다시 판정하지 않는다.
 */
export type JobEffectiveStatus = JobStatus | 'UNAVAILABLE' | 'UNKNOWN'
/** 출처 — 외부 수집분 vs 교직원 직접 등록 */
export type JobSource = 'external' | 'manual'
/** 채용 유형 */
export type RecruitType = 'GENERAL' | 'RECOMMENDATION'
/** 마감 방식 — 날짜 / 상시 / 채용시(등록일 +1개월, 등록 때 한 번만 계산한다) */
export type DeadlineMode = 'DATE' | 'ALWAYS' | 'ON_HIRE'

export const JOB_STATUS_LABEL: Record<JobStatus, string> = { POSTED: '게시', CLOSED: '마감' }
export const JOB_EFFECTIVE_STATUS_LABEL: Record<JobEffectiveStatus, string> = {
  POSTED: '게시', CLOSED: '마감', UNAVAILABLE: '삭제됨', UNKNOWN: '확인 필요',
}
export const RECRUIT_TYPE_LABEL: Record<RecruitType, string> = {
  GENERAL: '일반공고', RECOMMENDATION: '추천채용',
}

// ── 운영 코드 그룹 (DB 가 정본) ──────────────────────────────────────────
export const JOB_CODE_GROUPS = {
  companyType: 'JOB_COMPANY_TYPE',
  employmentType: 'JOB_EMPLOYMENT_TYPE',
  category: 'JOB_CATEGORY',
  careerType: 'JOB_CAREER_TYPE',
  gender: 'JOB_GENDER',
  region: 'JOB_REGION',
  resumeCategory: 'JOB_RESUME_CATEGORY',
} as const

export interface JobOption { code: string; label: string }

/** 등록 폼의 선택지 — 활성 코드만. 화면이 배열을 하드코딩하지 않는다. */
export function jobOptions(group: string): JobOption[] {
  return codeItems
    .filter(item => item.group_code === group && item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(item => ({ code: item.code, label: item.label }))
}

/** 코드 → 라벨. 비활성이 된 과거 코드도 라벨은 남아 있으므로 그대로 보인다. */
export function jobLabelOf(group: string, code: string | null | undefined): string {
  return code ? codeLabel(group, code) : ''
}

export function jobLabelsOf(group: string, codes: string[] | undefined): string[] {
  return (codes ?? []).map(code => jobLabelOf(group, code)).filter(Boolean)
}

/**
 * 카드에 컬러로 강조할 특이사항 태그.
 * 태그는 담당자가 자유 입력하는 문구라 운영 코드가 아니다 — 표시 규칙이므로 여기 남긴다.
 * (오늘마감은 마감일에서 파생 — 태그로 받지 않는다)
 */
export const JOB_HIGHLIGHT_TAGS = ['서류면제'] as const

/** 공고에 첨부된 파일 1건. 바이트는 서버 볼륨에 있고 다운로드는 권한 확인 후 스트리밍된다. */
export interface JobFile {
  id: string
  name: string
  size: number
  contentType: string
  downloadUrl: string
}

/** 채용공고 1건. */
export interface JobPosting {
  id: string
  /** 기업 사전의 id — 외부 수집 공고는 기업 실체가 없어 null 이다 */
  companyId: string | null
  /** 등록 시점 회사명 스냅샷 */
  company: string
  role: string
  tags: string[]
  salary: string
  location: string
  /** 마감일 'YYYY-MM-DD'. 상시(ALWAYS)면 null */
  deadline: string | null
  deadlineMode: DeadlineMode
  /** 마감 방식이 ON_HIRE 인가 — 기존 화면 호환용 파생값 */
  deadlineOnHire: boolean
  /** 대표 경력 구분 코드 (JOB_CAREER_TYPE) */
  jobType: string | null
  applyUrl: string
  /** 근거 없는 순위를 정본에 두지 않는다 — 항상 0이다 */
  match: number
  recruitType: RecruitType
  /** 기업 구분 코드 (JOB_COMPANY_TYPE) */
  companyType: string | null
  urlTitleLink: boolean
  email: string
  emailApply: boolean
  salaryNegotiable: boolean
  content: string
  contentFormat: 'HTML' | 'TEXT'
  /** 로고 다운로드 경로 — 정적 URL 이 아니라 권한을 확인하는 API 경로다 */
  logo: string | null
  logoFileId: string | null
  attachments: JobFile[]
  /** 근무 형태 코드 (JOB_EMPLOYMENT_TYPE) */
  employmentTypes: string[]
  /** 직종 코드 (JOB_CATEGORY) */
  jobCategories: string[]
  /** 경력 구분 코드 (JOB_CAREER_TYPE) */
  careerTypes: string[]
  /** 성별 코드 (JOB_GENDER) */
  genders: string[]
  /** 근무 지역 코드 (JOB_REGION) */
  regions: string[]
  /** 전형 단계 — 추천채용 공고만 실체가 있다 */
  stages: HiringStage[]
  status: JobStatus
  effectiveStatus: JobEffectiveStatus
  source: JobSource
  postedAt: string
  version: number
  /** 학생이 상세를 볼 때만 서버가 실어 준다(취업지원 게이트 판정) */
  applyEligibility?: JobEligibility
}

export interface JobEligibility {
  eligible: boolean
  reasons: { code: string; message: string; nextRoute: string }[]
  studentType: string | null
}

/** 기업 사전 1건 */
export interface JobCompany {
  id: string
  displayName: string
  companyTypeCode: string | null
  websiteUrl: string | null
  version: number
}

/** 공고 저장 입력 — 서버 DTO 와 1:1 이다. */
export interface JobPostingInput {
  companyId?: string | null
  createCompany?: { displayName: string; companyTypeCode?: string | null; websiteUrl?: string | null }
  role: string
  tags: string[]
  salary: string
  location: string
  jobType: string | null
  companyType: string | null
  recruitType: RecruitType
  status: JobStatus
  deadlineMode: DeadlineMode
  deadline: string | null
  applyUrl: string
  urlTitleLink: boolean
  email: string
  emailApply: boolean
  salaryNegotiable: boolean
  content: string
  contentFormat: 'HTML' | 'TEXT'
  logoFileId: string | null
  attachmentFileIds: string[]
  employmentTypes: string[]
  jobCategories: string[]
  careerTypes: string[]
  genders: string[]
  regions: string[]
}

/** 새 공고 폼 초기값 */
export function blankJob(): JobPostingInput {
  return {
    companyId: null,
    role: '',
    tags: [],
    salary: '',
    location: '',
    jobType: null,
    companyType: null,
    recruitType: 'GENERAL',
    status: 'POSTED',
    deadlineMode: 'DATE',
    deadline: null,
    applyUrl: '',
    urlTitleLink: false,
    email: '',
    emailApply: false,
    salaryNegotiable: false,
    content: '',
    contentFormat: 'HTML',
    logoFileId: null,
    attachmentFileIds: [],
    employmentTypes: [],
    jobCategories: [],
    careerTypes: [],
    genders: [],
    regions: [],
  }
}
