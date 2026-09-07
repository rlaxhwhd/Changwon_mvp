// ─────────────────────────────────────────────────────────────────────────
// 조교 데이터 로더 — 교직원 포털 로그인 신원. SPEC §3-2.
// students.ts / counselors.ts 패턴 미러: JSON import → 배열 노출.
// 조교의 학생 접근 범위는 담당 학과(departments)로 파생한다(현행 FU_ASS_DEPT).
// ─────────────────────────────────────────────────────────────────────────
import type { StaffUser } from './schema/staff'
import asstKim from './assistants/asst_kim.json'
import asstPark from './assistants/asst_park.json'

/** 조교 = 교직원 공통 신원 + 담당 학과 스코프 */
export interface Assistant extends StaffUser {
  role: 'assistant'
  /** 담당 학과 목록 — 학생 현황 조회 스코프 (현행 FU_ASS_DEPT.DEPT_CD) */
  departments: string[]
  email?: string
}

export const ASSISTANTS: Assistant[] = [
  asstKim as Assistant,
  asstPark as Assistant,
]

export function getAssistantById(id: string | undefined): Assistant | undefined {
  return id ? ASSISTANTS.find(a => a.id === id) : undefined
}
