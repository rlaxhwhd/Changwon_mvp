/**
 * ---------------------------------------------------------------------------
 * 단일소스: 교수 상담 노출 override 읽기 → 향후 교수 프로필 API.
 * DB 전환 시 cross-SPA import를 API 로더로 교체한다. 화면 상태를 저장하지 말 것.
 * ---------------------------------------------------------------------------
 */
import { getAcceptMap } from '../../src_admin/data/professorProfiles'
import { PROFESSOR_GROUPS } from './professors'
import type { DepartmentGroup } from './professors'

/** [DB-ready] 비노출 교수를 제거하고 빈 단과대·학부를 정리해 반환한다. */
export function getCounselableProfessorGroups(): DepartmentGroup[] {
  const accepts = getAcceptMap()
  return PROFESSOR_GROUPS
    .map(group => ({
      ...group,
      divisions: Object.fromEntries(
        Object.entries(group.divisions)
          .map(([name, professors]) => [
            name,
            professors.filter(professor => accepts[professor.id] !== false),
          ])
          .filter(([, professors]) => professors.length > 0),
      ),
    }))
    .filter(group => Object.keys(group.divisions).length > 0)
}
