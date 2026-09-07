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
import departmentsSeed from '../../../src_admin/data/departments.seed.json'
import skillsJson from './skills.json'
import subjectsJson from './subjects.json'
import curriculumJson from './curriculum.json'
import courseSkillsJson from './courseSkills.json'
import enrollmentsJson from './enrollments.json'
import certsJson from './certs.json'
import jobRolesJson from './jobRoles.json'
import studentAcademicJson from './studentAcademic.json'

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

// ── 로컬 seed (이 파일 밖으로 나가지 않는다) ─────────────────────────────

interface StudentAcademicSeed {
  studentId: string
  deptCode: string
  entryYear: string
  certs: { certId: string; acquiredDt: string; certNo: string; verified: boolean }[]
  jobInterests: { jobId: string; pinned: boolean }[]
  programRecords: ProgramRecord[]
}

const SKILLS = skillsJson as Skill[]
const SUBJECTS = subjectsJson as Subject[]
const CURRICULUM = curriculumJson as CurriculumRow[]
const COURSE_SKILLS = courseSkillsJson as CourseSkill[]
const ENROLLMENTS = enrollmentsJson as Enrollment[]
const CERTS = certsJson as Cert[]
const JOB_ROLES = jobRolesJson as JobRole[]
const STUDENT_ACADEMIC = studentAcademicJson as StudentAcademicSeed[]
const DEPARTMENTS = departmentsSeed as DeptRow[]

// ── 런타임 오버레이 ──────────────────────────────────────────────────────
// seed JSON은 불변. 학생이 담은 관심직무·자격증은 오버레이에만 쌓는다.
// DB 전환 시 이 블록은 통째로 사라지고 saveXxx 가 POST/DELETE 가 된다.

const JOB_INTEREST_KEY = 'dc_job_interests'
const STUDENT_CERT_KEY = 'dc_student_certs'

function readOverlay(key: string, studentId: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const list = (parsed as Record<string, unknown>)[studentId]
      if (Array.isArray(list)) return list as string[]
    }
  } catch {
    /* 폴백: 오버레이 없음 */
  }
  return []
}

function writeOverlay(key: string, studentId: string, id: string, on: boolean): void {
  try {
    const raw = localStorage.getItem(key)
    const all: Record<string, string[]> = raw ? JSON.parse(raw) : {}
    const cur = Array.isArray(all[studentId]) ? all[studentId] : []
    all[studentId] = on ? (cur.includes(id) ? cur : [...cur, id]) : cur.filter(x => x !== id)
    localStorage.setItem(key, JSON.stringify(all))
  } catch {
    /* 데모 범위 — 저장 실패 무시 */
  }
}

// ══ 공개 API — 여기만 갈아끼운다 ══════════════════════════════════════════

/** 학사 데이터를 못 찾았을 때. 화면은 이 코드로 빈 상태를 구분한다. */
export class AcademicNotFoundError extends Error {
  // 파라미터 프로퍼티는 erasableSyntaxOnly 에서 금지 — 명시 필드로 둔다.
  studentId: string
  constructor(studentId: string) {
    super(`학사 데이터 없음: ${studentId}`)
    this.name = 'AcademicNotFoundError'
    this.studentId = studentId
  }
}

/**
 * 한 학생의 학사 스냅샷.
 * DB 후: `const res = await fetch(\`/api/academic/${studentId}\`)` 로 몸통만 교체.
 */
export async function fetchAcademic(studentId: string): Promise<AcademicSnapshot> {
  const seed = STUDENT_ACADEMIC.find(a => a.studentId === studentId)
  if (!seed) throw new AcademicNotFoundError(studentId)

  // 관심직무: 대표직무를 선두로, 오버레이 추가분을 뒤에.
  const extraJobs = readOverlay(JOB_INTEREST_KEY, studentId)
  const seedJobs = [...seed.jobInterests]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .map(j => j.jobId)
  const jobInterests: JobInterest[] = [
    ...seedJobs.map(jobId => ({ jobId, added: false })),
    ...extraJobs.filter(id => !seedJobs.includes(id)).map(jobId => ({ jobId, added: true })),
  ]

  // 자격증: seed 보유분(취득일 있음) + 오버레이 목표분(취득일 없음).
  const extraCerts = readOverlay(STUDENT_CERT_KEY, studentId)
  const studentCerts: StudentCert[] = [
    ...seed.certs.map(c => ({ certId: c.certId, acquiredDt: c.acquiredDt, added: false })),
    ...extraCerts
      .filter(id => !seed.certs.some(c => c.certId === id))
      .map(certId => ({ certId, added: true })),
  ]

  return {
    skills: SKILLS,
    subjects: SUBJECTS,
    curriculum: CURRICULUM,
    courseSkills: COURSE_SKILLS,
    certs: CERTS,
    jobRoles: JOB_ROLES,
    departments: DEPARTMENTS,
    studentId,
    deptCode: seed.deptCode,
    entryYear: seed.entryYear,
    enrollments: ENROLLMENTS.filter(e => e.studentId === studentId),
    jobInterests,
    studentCerts,
    programRecords: seed.programRecords,
  }
}

/** 관심직무 담기/빼기 — DB 후: POST · DELETE /api/students/{id}/job-interests */
export async function saveJobInterest(studentId: string, jobId: string, on: boolean): Promise<void> {
  writeOverlay(JOB_INTEREST_KEY, studentId, jobId, on)
}

/** 자격증 담기/빼기 — DB 후: POST · DELETE /api/students/{id}/certs */
export async function saveStudentCert(studentId: string, certId: string, on: boolean): Promise<void> {
  writeOverlay(STUDENT_CERT_KEY, studentId, certId, on)
}
