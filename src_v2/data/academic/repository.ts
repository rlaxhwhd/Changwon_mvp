// ─────────────────────────────────────────────────────────────────────────
// ★ 학사 데이터 스왑 지점 (single swap seam)
//
// 이 파일이 JSON을 아는 유일한 곳이다. DB가 붙으면 아래 두 함수의 "몸통"만
// fetch 로 바꾼다. 파생(academic.ts)·화면(SkillTree.tsx)은 손대지 않는다.
//
//   fetchAcademic(studentId)  →  GET  /api/academic/{studentId}
//   saveJobInterest / saveStudentCert  →  POST · DELETE
//
// 그래서 지금부터 이미 async 다. 동기로 만들어 두면 DB 전환 때 호출부가
// 전부 바뀐다 — 그게 "갈아끼우기 힘든" 상태다.
//
// 매핑되는 테이블
//   dc_skill · dc_subject · dc_curriculum · dc_course_skill · dc_student_course
//   dc_cert · dc_job_role(+dc_job_skill) · dc_student_cert · dc_student_job_interest
// ─────────────────────────────────────────────────────────────────────────
import { api, ApiError } from '../../../shared/api'

// ── 스키마 (DB 테이블 1:1) ───────────────────────────────────────────────

/** dc_skill */
export interface Skill { skillId: string; label: string; category: string; icon: string }

/** dc_subject — 과목 자체. 개설 회차(dc_course)와 분리된 마스터. */
export interface Subject {
  curiNum: string
  curiNm: string
  cdtNum: number
  /** 주관학과. 학생 학과와 다르면 타학과 과목. */
  openDeptCd: string
  gradDiv: string
  active: boolean
}

export type CourseClass = '전공필수' | '전공선택' | '교양필수' | '교양선택' | '타학과'

/** dc_curriculum — 학과 교육과정(편람). "몇 학년에 무엇을 듣는가". */
export interface CurriculumRow {
  id: string
  deptCode: string
  /** 입학년도로 매칭한다. 교육과정은 입학년도마다 다르다. */
  curriYear: string
  curiNum: string
  courseCls: CourseClass
  /** ★ 스킬트리 열 구분의 근거 (1~2학년 = 핵심역량, 3~4학년 = 전문역량) */
  recGrade: number
  recSmt: string
  required: boolean
}

/** dc_course_skill — 수강이력을 스킬로 번역하는 유일한 매핑. */
export interface CourseSkill { curiNum: string; skillId: string; weight: number; source: string }

/** dc_student_course — 학생이 실제로 들은 전부(타학과 포함). */
export interface Enrollment {
  studentId: string
  year: string
  smt: string
  curiNum: string
  courseCls: CourseClass
  grade: string | null
  gpa: number | null
  /** ★ 스킬트리 체크표시의 근거 */
  finishYn: 'Y' | 'N'
  chkRecuri: string
}

/** dc_cert */
export interface Cert {
  certId: string; label: string; issuer: string; kind: string
  skillIds: string[]; icon: string; active: boolean
}

/** dc_job_role (+ dc_job_skill 을 skills[] 로 중첩) */
export interface JobRole {
  jobId: string; label: string; category: string; icon: string; summary: string
  whatToDo: string[]; targetOrgs: string[]
  skills: { skillId: string; weight: number; required: boolean }[]
}

/** dc_student_cert — 보유 자격증. added=true 는 학생이 목표로 담은 것(미취득). */
export interface StudentCert { certId: string; acquiredDt?: string; added: boolean }

/** dc_student_job_interest — added=true 는 학생이 화면에서 담은 것(삭제 가능). */
export interface JobInterest { jobId: string; added: boolean }

/** dc_dept 중 화면 표기에 필요한 최소 필드 */
export interface DeptRow { deptCode: string; deptName: string }

/** 비교과 참여 (dc_program_apply 요약) */
export interface ProgramRecord { programId: string; title: string; appliedAt: string; completed: boolean }

/**
 * 한 학생의 스킬트리를 그리는 데 필요한 전부.
 * seed + 오버레이 병합은 이 계층에서 끝낸다 — 파생 계층은 병합을 모른다.
 */
export interface AcademicSnapshot {
  // 마스터
  skills: Skill[]
  subjects: Subject[]
  curriculum: CurriculumRow[]
  courseSkills: CourseSkill[]
  certs: Cert[]
  jobRoles: JobRole[]
  departments: DeptRow[]
  // 학생 스코프
  studentId: string
  deptCode: string
  entryYear: string
  enrollments: Enrollment[]
  /** 대표직무가 선두. seed 분이 앞, 학생이 담은 분이 뒤. */
  jobInterests: JobInterest[]
  studentCerts: StudentCert[]
  programRecords: ProgramRecord[]
}

/** A missing academic record is distinct from a network or authentication error. */
export class AcademicNotFoundError extends Error {
  studentId: string
  constructor(studentId: string) {
    super(`학사 데이터 없음: ${studentId}`)
    this.name = 'AcademicNotFoundError'
    this.studentId = studentId
  }
}

export async function fetchAcademic(studentId: string): Promise<AcademicSnapshot> {
  try {
    return await api<AcademicSnapshot>(`/academic/${encodeURIComponent(studentId)}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw new AcademicNotFoundError(studentId)
    throw error
  }
}

export async function saveJobInterest(studentId: string, jobId: string, on: boolean): Promise<void> {
  await api(`/students/${encodeURIComponent(studentId)}/job-interests/${encodeURIComponent(jobId)}`, {
    method: 'PUT', body: JSON.stringify({ on }),
  })
}

export async function saveStudentCert(studentId: string, certId: string, on: boolean): Promise<void> {
  await api(`/students/${encodeURIComponent(studentId)}/certs/${encodeURIComponent(certId)}`, {
    method: 'PUT', body: JSON.stringify({ on }),
  })
}
