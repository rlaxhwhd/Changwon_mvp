// ─────────────────────────────────────────────────────────────────────────
// 학과별 교수 데이터(JSON) 단일 소스 + 로더.
// 교수상담(지도교수) 화면은 이 소스를 구독해 단과대 → 학과 → 교수를 렌더한다.
// 학생 major(학과)로 기본 선택을 파생해 "본인 학과"가 먼저 열리게 한다.
// (프로토타입 — 백엔드 연동 시 seed import만 API 조회로 교체)
// ─────────────────────────────────────────────────────────────────────────
import seed from './professors.seed.json'

export interface Professor {
  id: string
  name: string
  title: string
  major: string
  room: string
}

export interface DepartmentGroup {
  name: string
  divisions: Record<string, Professor[]>
}

export const PROFESSOR_GROUPS: DepartmentGroup[] = seed as unknown as DepartmentGroup[]

/**
 * 학생 학과(major)로 기본 선택(단과대·학과)을 파생한다.
 * 해당 학과가 트리에 없으면 첫 단과대·첫 학과로 폴백한다.
 */
export function findDefaultSelection(major: string): { groupName: string; division: string } {
  for (const group of PROFESSOR_GROUPS) {
    if (major in group.divisions) return { groupName: group.name, division: major }
  }
  const first = PROFESSOR_GROUPS[0]
  return { groupName: first.name, division: Object.keys(first.divisions)[0] }
}
