// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 상담 스키마 — 현행 DB CON_PROF_INFO와 SY_CODE GRP 0131 코드 대응 단일소스.
// snapshot은 EP_PRM_APP 패턴으로 기록 시점 학생 정보를 보존한다.
// DB 전환 시 실코드가 확인되면 01~06 잠정값과 DTO 매핑을 이 경계에서 치환한다.
// 상담기록·독려 이력을 수정·삭제하지 말 것.
// ─────────────────────────────────────────────────────────────────────────────
/** 상담구분 — 현행 SY_CODE GRP '0131' 미러 (코드+라벨 분리: 한글 리터럴을 값으로 쓰지 않는다).
 *  실코드 미확인으로 잠정 '01'~'06' 부여 — DB 전환 시 SY_CODE 실값으로 치환한다. */
export const PROF_COUNSEL_CATEGORIES = [
  { code: '01', label: '전공 및 학업' },
  { code: '02', label: '진로' },
  { code: '03', label: '취업' },
  { code: '04', label: '봉사 및 실습' },
  { code: '05', label: '사제동행프로그램' },
  { code: '06', label: '기타' },
] as const

export type ProfCounselCategoryCode = (typeof PROF_COUNSEL_CATEGORIES)[number]['code']

export interface ProfCounselRecord {
  /** 기록 id (pcr_ prefix) */
  id: string
  studentId: string
  /** Professor.id (현행 CON_PROF_INFO 의 교수 식별) */
  professorId: string
  /** 교수 이름 스냅샷 */
  professorName: string
  categoryCode: ProfCounselCategoryCode
  /** 상담일 YYYY-MM-DD */
  date: string
  /** 상담 요지 — 조교 화면은 집계만 하고 표시하지 않는다(교수 화면 SPEC §3-5 예비) */
  summary?: string
  /** 연계된 학생 신청 id. 직접 작성 기록에는 없다.
   * 이관 매핑: 현행 CON_PROF_INFO는 신청+결과 한 행이며 requestId join으로 한 행을 복원한다.
   * requestId가 없으면 결과 단독 행으로 이관한다. */
  requestId?: string
  createdAt: string
  /** 발생 시점 학생 스냅샷 (EP_PRM_APP 패턴) */
  snapshot: { studentNo: string; name: string; major: string; grade: number }
}

/** 독려 발송 이벤트 — append-only (이벤트 → JSON 원칙) */
export interface AdvisorNudge {
  /** 독려 id (ndg_ prefix) */
  id: string
  studentId: string
  professorId: string
  /** 발송 일시 ISO */
  sentAt: string
  /** 발송 수행자 (조교 id) */
  by: string
}
