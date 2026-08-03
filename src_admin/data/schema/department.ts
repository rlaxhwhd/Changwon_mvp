// ─────────────────────────────────────────────────────────────────────────────
// 학과 트리 스키마 — 현행 DB 뷰 V_DEP_INF_ALL(1,921행) 대응 단일소스.
// 단대(UNIV/DAEHAK) → 학과(DEPT) 2단. 화면·집계의 '단과대학' 값은 전부 여기서 파생한다.
//
// ★ 코드가 식별자다. 학과명으로 매칭하지 말 것 —
//   동명 학과가 과정(학부/석사/박사)별로 존재하므로 (collegeCode, deptCode) 쌍이 유일키다.
//   (CLAUDE.md 코드 작성 규칙 7 · SPEC §3-4-①)
//
// DB 전환 시: departments.seed.json 을 V_DEP_INF_ALL 조회로 교체하면 화면은 그대로 나간다.
//   - V_DEP_INF(1,679행)를 쓰면 대학원 242개가 누락된다 — 반드시 _ALL.
//   - 전공 테이블 LEFT OUTER JOIN에 USE_YN 조건을 걸면 inner join으로 붕괴한다(현행 버그).
// 이 파일에 학과명 리터럴을 늘리지 말 것. 데이터는 seed JSON(또는 DB)에만 둔다.
// ─────────────────────────────────────────────────────────────────────────────

/** 학위 과정 — 현행 V_DEP_INF_ALL 의 과정 구분(학부/대학원). */
export type DegreeCourse = '학부' | '석사' | '박사'

/** 학과 1건 = 트리의 잎 노드 */
export interface DepartmentNode {
  /** 소속 단대 코드 (현행 DAEHAK_CD / UNIV_CODE) — 잠정값, 이관 시 실코드로 치환 */
  collegeCode: string
  /** 단과대학명 (표시용 스냅샷 — 판정은 collegeCode로 한다) */
  collegeName: string
  /** 학과 코드 (현행 DEPT_CD) — 잠정값, 이관 시 실코드로 치환 */
  deptCode: string
  /** 학과명 */
  deptName: string
  /** 과정 구분. 미지정이면 학부로 본다(현행 학부 데이터가 대다수) */
  course?: DegreeCourse
}
