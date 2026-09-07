/**
 * ---------------------------------------------------------------------------
 * 단일소스: 교수 상담 노출 override → 향후 교수상담 프로필 테이블.
 * DB 전환 시 읽기·쓰기 함수만 교체한다. 교수 JSON seed를 수정하지 말 것.
 * ---------------------------------------------------------------------------
 */
import { getProfessorById } from './professors'
import type { ProfessorCounselProfile } from './schema/professorProfile'

const STORAGE_KEY = 'dc_professor_profile'
type Overrides = Record<string, Partial<ProfessorCounselProfile>>

function read(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Overrides
  } catch {
    return {}
  }
}

/** [DB-ready] 교수 기본 JSON과 학생 노출 override를 병합해 조회한다. */
export function getProfessorCounselProfile(professorId: string): ProfessorCounselProfile {
  const professor = getProfessorById(professorId)
  return {
    professorId,
    accept: true,
    officeHours: professor?.officeHours ?? '',
    intro: '',
    ...read()[professorId],
  }
}

/** [DB-ready] 교수 상담 노출 설정의 변경분을 override로 저장한다. */
export function updateProfessorCounselProfile(
  professorId: string,
  patch: Partial<ProfessorCounselProfile>,
): void {
  const values = read()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...values,
    [professorId]: {
      ...values[professorId],
      ...patch,
      updatedAt: new Date().toISOString(),
    },
  }))
  window.location.reload()
}

/** [DB-ready] 학생 선택 화면의 노출 여부 맵을 조회한다. */
export function getAcceptMap(): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(read()).map(([id, value]) => [id, value.accept ?? true]),
  )
}
