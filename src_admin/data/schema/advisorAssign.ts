// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 배정 스키마 — 현행 DB CO_ADVISER(STU_NO + ADV_NO) 대응 단일소스.
// 학생당 active 배정 1건 유일성은 SPEC §3-4-①의 배정·이력 규칙에 근거한다.
// DB 전환 시 CO_ADVISER DTO 매핑은 이 스키마를 경계로 교체한다.
// append-only 이력 레코드를 수정·삭제하지 말 것.
// ─────────────────────────────────────────────────────────────────────────────
/** 배정 상태 — 'released'는 향후 해제 기능용(현재 화면은 생성만 한다) */
export type AssignStatus = 'active' | 'released'

export interface AdvisorAssign {
  /** 배정 레코드 id (adv_ prefix) */
  id: string
  /** 학생 id (RosterStudent.id / StudentData.id) */
  studentId: string
  /** 교수 id (src_v2 professors.seed.json 의 Professor.id — 현행 ADV_NO) */
  professorId: string
  /** 교수 이름 스냅샷 (표시 폴백용) */
  professorName: string
  /** 배정일 YYYY-MM-DD — 배정년도 필터의 축 */
  assignedAt: string
  status: AssignStatus
  /** 해제일 YYYY-MM-DD (status='released' 일 때만) */
  releasedAt?: string
  /** 배정 수행자 (조교 id — 감사) */
  by: string
  /** 발생 시점 스냅샷 (EP_PRM_APP 패턴. 이력·감사용 — 화면 표시는 라이브 로스터를 쓴다) */
  snapshot: {
    studentNo: string
    name: string
    major: string
    grade: number
    /** 배정 당시 학적 (EnrollStatus 값) */
    status: string
  }
}
