// ─────────────────────────────────────────────────────────────────────────
// 교수(교원) 데이터 로더 — 교직원 포털 로그인 신원. SPEC §3-5.
// students.ts / counselors.ts 패턴 미러: JSON import → 배열 노출.
// ⚠ src_v2/data/professors.ts(학생 상담신청용 학과별 교수목록)와 별개다.
//   이쪽은 "교수로 로그인하는 백오피스 사용자"다.
// ─────────────────────────────────────────────────────────────────────────
import type { StaffUser } from './schema/staff'
import profLee from './professors/prof_lee.json'
import profJung from './professors/prof_jung.json'

/** 교수 = 교직원 공통 신원 + 교수 도메인 필드 */
export interface Professor extends StaffUser {
  role: 'professor'
  /** 소속 단과대학 (표시용) */
  collegeName?: string
  email?: string
  officeHours?: string
}

export const PROFESSORS: Professor[] = [
  profLee as Professor,
  profJung as Professor,
]

export function getProfessorById(id: string | undefined): Professor | undefined {
  return id ? PROFESSORS.find(p => p.id === id) : undefined
}
