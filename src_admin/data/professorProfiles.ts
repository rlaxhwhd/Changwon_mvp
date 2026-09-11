/**
 * ---------------------------------------------------------------------------
 * 단일소스: 교수 상담 노출 override → 향후 교수상담 프로필 테이블.
 * DB 전환 시 읽기·쓰기 함수만 교체한다. 교수 JSON seed를 수정하지 말 것.
 * ---------------------------------------------------------------------------
 */
import { getProfessorById } from './professors'
import type { ProfessorCounselProfile } from './schema/professorProfile'
import { activeStaffDetail, saveProfessorProfile } from '../../shared/staffDirectoryStore'

/** [DB-ready] 교수 기본 JSON과 학생 노출 override를 병합해 조회한다. */
export function getProfessorCounselProfile(professorId: string): ProfessorCounselProfile {
  const professor = getProfessorById(professorId)
  const profile = activeStaffDetail?.id === professorId ? activeStaffDetail.counselProfile : undefined
  return {
    professorId,
    accept: true,
    officeHours: professor?.officeHours ?? '',
    intro: '',
    ...profile,
  }
}

/** [DB-ready] 교수 상담 노출 설정의 변경분을 override로 저장한다. */
export function updateProfessorCounselProfile(
  professorId: string,
  patch: Partial<ProfessorCounselProfile>,
): Promise<void> {
  return saveProfessorProfile(professorId, {
    accept: patch.accept ?? true,
    officeHours: patch.officeHours ?? '',
    intro: patch.intro ?? '',
  })
}
