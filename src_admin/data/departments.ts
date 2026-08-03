// ─────────────────────────────────────────────────────────────────────────────
// 학과 트리 로더 — 단일소스는 departments.seed.json (현행 뷰 V_DEP_INF_ALL 미러).
// '단과대학'이 필요한 모든 화면·집계는 이 로더만 구독한다. 화면에 학과명 리터럴 금지.
//
// DB 전환 시 교체 지점은 아래 DEPARTMENTS 한 줄뿐이다 —
//   const DEPARTMENTS = await fetchDepartments()   // SELECT ... FROM V_DEP_INF_ALL
// 코드 체계도 함께 실값으로 바뀐다(현재 collegeCode/deptCode는 잠정 발번).
//
// ⚠ 학과명으로 조인하지 말 것. 이관 후에는 (collegeCode, deptCode) 쌍이 유일키다.
//   collegeOf(major)는 이관 전 mock 데이터에 학과 코드가 없어 남겨둔 이름 기반 폴백이며,
//   학생 레코드가 deptCode를 갖게 되면 collegeOfDept(deptCode)로 갈아탄다.
// ─────────────────────────────────────────────────────────────────────────────
import seed from './departments.seed.json'
import type { DepartmentNode } from './schema/department'

const DEPARTMENTS = seed as DepartmentNode[]

/** 미등록 학과 표기 — 화면마다 다른 문자열을 쓰지 않도록 여기서 고정한다. */
export const UNKNOWN_COLLEGE = '기타'

const BY_DEPT_NAME = new Map(DEPARTMENTS.map(node => [node.deptName, node]))
const BY_DEPT_CODE = new Map(DEPARTMENTS.map(node => [node.deptCode, node]))

/** 학과명 → 소속 단과대학명. 미등록은 UNKNOWN_COLLEGE. (이관 전 이름 기반 폴백) */
export function collegeOf(major: string): string {
  return BY_DEPT_NAME.get(major)?.collegeName ?? UNKNOWN_COLLEGE
}

/** 학과 코드 → 소속 단과대학명. 이관 후 정식 경로. */
export function collegeOfDept(deptCode: string): string {
  return BY_DEPT_CODE.get(deptCode)?.collegeName ?? UNKNOWN_COLLEGE
}

/** 학과명 → 트리 노드(코드 포함). 코드가 필요한 호출부용. */
export function departmentOf(major: string): DepartmentNode | undefined {
  return BY_DEPT_NAME.get(major)
}

/**
 * 주어진 학과 집합이 속한 단과대학 목록 — 필터 옵션용.
 * 범위를 안 주면 전체 트리에서 파생한다. 하드코딩 목록 금지.
 */
export function getCollegeOptions(
  majors?: string[],
): { code: string; name: string }[] {
  const nodes = majors
    ? majors.map(major => BY_DEPT_NAME.get(major)).filter((node): node is DepartmentNode => !!node)
    : DEPARTMENTS
  const seen = new Map<string, string>()
  for (const node of nodes) seen.set(node.collegeCode, node.collegeName)
  return [...seen.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

/** 단과대학에 속한 학과명 목록 — 단대 선택 시 학과 스코프를 좁히는 데 쓴다. */
export function majorsOfCollege(collegeName: string): string[] {
  return DEPARTMENTS
    .filter(node => node.collegeName === collegeName)
    .map(node => node.deptName)
}
