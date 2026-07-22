// ─────────────────────────────────────────────────────────────────────────
// 채용공고 스키마 (단일 소스) — Counsel_README §5-D · §6 jobsSource
//
// 학생 /jobs 소비 정합: src_v2/data/students.ts 의 Job(company·role·tags·match·
// salary·location·deadline·jobType·applyUrl)과 shape 호환. 상담사가 등록한 공고를
// 나중에 학생 화면이 그대로 읽을 수 있도록 학생 Job 필드를 포함하고, 운영 전용
// 메타(상태·출처·등록일시)를 추가한다.
//
// ⚠️ 실제 공고 데이터는 사용자 추후 제공(§8). 지금은 스키마 + CRUD 골격만.
// ─────────────────────────────────────────────────────────────────────────

/** 게시 상태 — 목록/필터에서 사용 */
export type JobStatus = '게시' | '마감'

/** 출처 — 외부 API 연동분 vs 상담사 직접 등록 */
export type JobSource = 'external' | 'manual'

/** 고용 형태 — 학생 Job.jobType 과 동일 */
export type JobEmploymentType = '신입' | '경력'

// ── 등록 폼 선택지(단일 소스) — 상담사 공고 등록 화면의 라디오/체크박스 옵션 ──
/** 채용 유형 */
export type RecruitType = '일반공고' | '추천채용'
/** 기업 구분 */
export const COMPANY_TYPES = ['일반기업', '벤처기업', '강소기업', '중견기업', '공기업', '대기업', '외국계', '기타'] as const
/** 근무 형태 */
export const EMPLOYMENT_TYPES = ['정규직', '계약직', '채용형 인턴', '체험형 인턴'] as const
/** 직종 */
export const JOB_CATEGORIES = [
  '경영/사무', '마케팅/광고', '무역/유통', '영업/고객상담', 'IT/인터넷', '연구개발', '생산/제조', '디자인',
  '미디어', '서비스', '교육', '건설', '보건/의료', '전문/특수직', '기타',
] as const
/** 경력 구분 */
export const CAREER_TYPES = ['신입', '경력'] as const
/** 성별 */
export const GENDERS = ['남자', '여자'] as const
/** 근무 지역 */
export const REGIONS = [
  '전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const

/**
 * 채용공고 1건. 학생 Job 필드(company~applyUrl)를 포함해 shape 호환.
 * id 는 CRUD 편의를 위해 문자열(예: job_1720...). match 는 학생 화면 표시용(선택).
 */
export interface JobPosting {
  id: string
  /** 회사명 (학생 Job.company) */
  company: string
  /** 직무명 (학생 Job.role) */
  role: string
  /** 태그 (학생 Job.tags) — 직무·스택·복지 등 */
  tags: string[]
  /** 연봉/처우 문구 (학생 Job.salary, 예: "3,600만원~") */
  salary: string
  /** 근무지 (학생 Job.location) */
  location: string
  /** 마감일 (학생 Job.deadline, YYYY-MM-DD 또는 "상시") */
  deadline: string
  /** 고용 형태 (학생 Job.jobType) */
  jobType: JobEmploymentType
  /** 지원 링크 (학생 Job.applyUrl) */
  applyUrl: string
  /** 매칭도 0~100 (학생 Job.match) — 미지정 시 0 */
  match: number
  // ── 등록 폼 상세(사진 순서) — 학생 Job에는 없는 상담사 등록 전용 필드 ──
  /** 채용 유형 (일반공고/추천채용) */
  recruitType?: RecruitType
  /** 기업 구분 */
  companyType?: string
  /** 제목 클릭 시 URL로 이동 */
  urlTitleLink?: boolean
  /** 지원 이메일 */
  email?: string
  /** 이메일 지원 사용 */
  emailApply?: boolean
  /** 근무 형태(복수) */
  employmentTypes?: string[]
  /** 직종(복수) */
  jobCategories?: string[]
  /** 경력 구분(복수: 신입/경력) */
  careerTypes?: string[]
  /** 성별(복수) */
  genders?: string[]
  /** 근무 지역(복수) */
  regions?: string[]
  /** 채용시 마감(선택 시 1개월로 처리) */
  deadlineOnHire?: boolean
  /** 연봉 회사내규/협의 */
  salaryNegotiable?: boolean
  /** 모집요강 본문(HTML/텍스트) */
  content?: string
  /** 첨부파일명 목록 */
  attachments?: string[]
  // ── 운영 전용 메타 ──
  /** 게시/마감 상태 */
  status: JobStatus
  /** 출처 — 외부 연동 / 직접 등록 */
  source: JobSource
  /** 등록 일시 (ISO 8601) */
  postedAt: string
}

/** 새 공고 폼 초기값 (직접 등록) */
export function blankJob(): Omit<JobPosting, 'id' | 'postedAt'> {
  return {
    company: '',
    role: '',
    tags: [],
    salary: '',
    location: '',
    deadline: '',
    jobType: '신입',
    applyUrl: '',
    match: 0,
    status: '게시',
    source: 'manual',
    recruitType: '일반공고',
    companyType: '',
    urlTitleLink: false,
    email: '',
    emailApply: false,
    employmentTypes: [],
    jobCategories: [],
    careerTypes: [],
    genders: [],
    regions: [],
    deadlineOnHire: false,
    salaryNegotiable: false,
    content: '',
    attachments: [],
  }
}
