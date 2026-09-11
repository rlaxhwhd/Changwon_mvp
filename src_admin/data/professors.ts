// ─────────────────────────────────────────────────────────────────────────
// 교수(교원) 데이터 로더 — 교직원 포털 로그인 신원. SPEC §3-5.
// students.ts / counselors.ts 패턴 미러: JSON import → 배열 노출.
// ⚠ src_v2/data/professors.ts(학생 상담신청용 학과별 교수목록)와 별개다.
//   이쪽은 "교수로 로그인하는 백오피스 사용자"다.
// ─────────────────────────────────────────────────────────────────────────
import type { StaffUser } from './schema/staff'
import { getAssignedDeptNames } from './deptAssigns'
import { activeStaffDetail, directoryStaff } from '../../shared/staffDirectoryStore'

/** 교수 = 교직원 공통 신원 + 교수 도메인 필드 */
export interface Professor extends StaffUser {
  role: 'professor'
  /** 소속 단과대학 (표시용) */
  collegeName?: string
  email?: string
  officeHours?: string
}

export function getProfessorById(id: string | undefined): Professor | undefined {
  if (!id) return undefined
  return (activeStaffDetail?.id === id ? activeStaffDetail : directoryStaff.find(p => p.role === 'professor' && p.id === id)) as Professor | undefined
}

/**
 * 교수의 학생 검색 범위 = ① 학사DB 소속 학과 ∪ ② 관리자가 부여한 추가 배정.
 *
 * 현행도 OR 다 — "본인 소속(V_USR_INF.ORGID/HAKBU_CD) **OR** TB_CARR_PROF_ASSI_DEPT"
 * (_analysis/03_access_scope L24). 학사DB가 여러 학부 소속을 한 개만 들고 있는 경우가
 * 있어 ②로 보정하며, 학사 유래 값(dept)은 우리가 고치지 않는다(CLAUDE.md 규칙 1).
 *
 * ★ 타학과 학생이 상담을 신청한 경우는 여기 포함되지 않는다. 그 예외는 범위를 넓히는 게
 *   아니라 상담신청 접수 화면(ProfessorCounselRequests)이 이미 "나에게 온 신청"만
 *   보여주기 때문에 성립한다 — 그 행의 학생만 열람 대상이다.
 */
export function getProfessorDepartments(professor: Professor): string[] {
  return [...new Set([professor.dept, ...getAssignedDeptNames(professor.id, 'professor')])]
}
