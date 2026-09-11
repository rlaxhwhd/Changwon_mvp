// ─────────────────────────────────────────────────────────────────────────────
// 사용자↔학과 배정 로더 — 신규 dc_dept_assign 미러.
// 현행은 조교 FU_ASS_DEPT · 교수 TB_CARR_PROF_ASSI_DEPT · COM_ASS_DEPT(고아) 3벌로
// 흩어져 있고 의미는 모두 "사람↔학과 배정" 하나다(_analysis/03 §3). role 컬럼으로 합친다.
//
// ★ 이 표는 학사DB 소속(dc_user.hakbu_cd)을 대체하지 않고 "더한다".
//   학사DB가 학부를 하나만 들고 있어도 우리가 그 값을 고치지 않는다(CLAUDE.md 규칙 1).
//   실제 범위 = 학사DB 소속 ∪ 이 표의 active 배정 — 현행도 OR 로 같다(_analysis/03 L24).
//
// 이력은 append-only — 해제는 행 삭제가 아니라 status='released' 전이다(CLAUDE.md 규칙 11).
// 학생 개인정보 접근범위를 바꾸는 조작이라 누가 언제 했는지가 남아야 한다.
//
// DB 전환 시 교체 지점은 ASSIGNS 한 줄뿐이다 — SELECT ... FROM DC_DEPT_ASSIGN.
// ─────────────────────────────────────────────────────────────────────────────
import { deptNameOf } from './departments'
import { activeStaffDetail } from '../../shared/staffDirectoryStore'

/** 배정 대상 역할 — 조교·교수가 같은 표를 쓴다(dc_dept_assign.role) */
export type DeptAssignRole = 'professor' | 'assistant'

/** 학과 배정 1건 — dc_dept_assign 1행 */
export interface DeptAssign {
  id: string
  /** = INTG_UID. 교직원 사번 */
  intgUid: string
  role: DeptAssignRole
  /** 학과 코드 — 이관 후 (collegeCode, deptCode) 쌍이 유일키다. 학과명으로 조인 금지 */
  deptCode: string
  /** NULL = 학부 전체. 현행은 NULL이면 학생이 0명으로 나오는 버그가 있었다 */
  majorCode: string | null
  status: 'active' | 'released'
  assignedAt: string
  releasedAt?: string
  /** 배정을 수행한 관리자 */
  handledBy: string
}

function assigns(): DeptAssign[] {
  return (activeStaffDetail?.orgAssignments ?? []).map(row => ({
    id: row.id, intgUid: activeStaffDetail!.id, role: row.roleCode as DeptAssignRole,
    deptCode: row.deptCode, majorCode: null, status: row.isActive ? 'active' : 'released',
    assignedAt: row.validFrom, ...(row.validTo ? { releasedAt: row.validTo } : {}), handledBy: '',
  }))
}

/** 특정 교직원의 활성 배정 — 해제분(released)은 범위에서 빠진다. */
export function getActiveAssigns(intgUid: string, role: DeptAssignRole): DeptAssign[] {
  return assigns().filter(a => a.intgUid === intgUid && a.role === role && a.status === 'active')
}

/**
 * 활성 배정을 학과명으로 편다 — 로스터가 아직 학과명으로 필터하기 때문이다.
 * 학과명 자체를 키로 쓰는 것이 아니라 코드→이름 변환이며, 로스터가 deptCode를
 * 갖게 되면 이 변환을 지우고 코드를 그대로 넘긴다(departments.ts 상단 주의 참조).
 */
export function getAssignedDeptNames(intgUid: string, role: DeptAssignRole): string[] {
  return getActiveAssigns(intgUid, role)
    .map(a => deptNameOf(a.deptCode))
    .filter((name): name is string => !!name)
}

/** 배정 이력 전체(해제분 포함) — 관리자 배정 화면이 붙을 때 쓴다. */
export function getAssignHistory(intgUid: string, role: DeptAssignRole): DeptAssign[] {
  return assigns().filter(a => a.intgUid === intgUid && a.role === role)
}
