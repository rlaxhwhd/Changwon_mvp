// ─────────────────────────────────────────────────────────────────────────────
// 전담교수 상담 스키마 — 현행 DB CON_PROF_INFO와 SY_CODE GRP 0131 코드 대응 단일소스.
// snapshot은 EP_PRM_APP 패턴으로 기록 시점 학생 정보를 보존한다.
// 상담기록·독려 이력을 수정·삭제하지 말 것.
// ─────────────────────────────────────────────────────────────────────────────
import type { CounselMethod } from './counselRequest'
/** 상담구분 — 서버 코드 그룹 PROF_COUNSEL_TYPE(dc.code_item) 과 같은 코드. 라벨은 표시용이다. */
export const PROF_COUNSEL_CATEGORIES = [
  { code: 'MAJOR_STUDY', label: '전공 및 학업' },
  { code: 'CAREER', label: '진로' },
  { code: 'JOB', label: '취업' },
  { code: 'SERVICE_PRACTICE', label: '봉사 및 실습' },
  { code: 'MENTORING_PROGRAM', label: '사제동행프로그램' },
  { code: 'ETC', label: '기타' },
] as const

export type ProfCounselCategoryCode = (typeof PROF_COUNSEL_CATEGORIES)[number]['code']

/** 상담 채널 라벨 — 현행 교수상담은 온라인(게시판형)·오프라인 2트랙이다(Progress.md P5·P6).
 *  값은 공용 CounselMethod를 그대로 쓰고(재생성 금지), 교수상담 도메인 표기만 여기서 준다. */
export const PROF_COUNSEL_CHANNEL_LABEL: Record<CounselMethod, string> = {
  비대면: '온라인',
  대면: '오프라인',
}

export interface ProfCounselRecord {
  /** 기록 id (pcr_ prefix) */
  id: string
  studentId: string
  /** Professor.id (현행 CON_PROF_INFO 의 교수 식별) */
  professorId: string
  /** 교수 이름 스냅샷 */
  professorName: string
  categoryCode: ProfCounselCategoryCode
  /** 상담 채널 — 비대면=온라인 · 대면=오프라인 (PROF_COUNSEL_CHANNEL_LABEL로 표기) */
  method: CounselMethod
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
