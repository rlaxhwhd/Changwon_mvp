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
  }
}
