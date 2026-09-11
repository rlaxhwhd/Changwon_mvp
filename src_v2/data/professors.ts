// ─────────────────────────────────────────────────────────────────────────
// 학과별 교수 디렉터리의 동기 selector.
// 교수상담(지도교수) 화면은 이 소스를 구독해 단과대 → 학과 → 교수를 렌더한다.
// 학생 major(학과)로 기본 선택을 파생해 "본인 학과"가 먼저 열리게 한다.
// 부팅 시 공개 /staff?role=professor&groupBy=college 응답이 공유 배열에 제자리 적재된다.
// ─────────────────────────────────────────────────────────────────────────
import { professorGroups } from '../../shared/staffDirectoryStore'

export interface Professor {
  id: string
  name: string
  title: string
  major: string
  room: string
  accept: boolean
}

export interface DepartmentGroup {
  name: string
  divisions: Record<string, Professor[]>
}

export const PROFESSOR_GROUPS: DepartmentGroup[] = professorGroups

/**
 * 학생 학과(major)로 기본 선택(단과대·학과)을 파생한다.
 * 해당 학과가 트리에 없으면 첫 단과대·첫 학과로 폴백한다.
 */
export function findDefaultSelection(
  major: string,
  groups: DepartmentGroup[] = PROFESSOR_GROUPS,
): { groupName: string; division: string } {
  for (const group of groups) {
    if (major in group.divisions) return { groupName: group.name, division: major }
  }
  const first = groups[0] ?? PROFESSOR_GROUPS[0]
  return first ? { groupName: first.name, division: Object.keys(first.divisions)[0] ?? '' } : { groupName: '', division: '' }
}
