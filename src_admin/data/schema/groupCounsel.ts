// ─────────────────────────────────────────────────────────────────────────────
// 집단상담 스키마 (SPEC C6 · 현행 `CoMc050L`(일반) / `CoMc060L`(집단 심리검사) 대응)
//
// 1:N 상담이다 — 상담사 1명이 회차 1개를 열고 학생 여럿이 참여한다.
// 1:1 상담(CounselRequest·CounselRecord)과 **별도 도메인**이며,
// 상담사 접수함·상담 통계의 모수에 섞이지 않는다(현행도 별도 화면·별도 조회).
//
// 참여자에는 추가 시점 스냅샷(학번·이름·학과·학년)을 함께 저장한다 — EP_PRM_APP 패턴 계승.
// ─────────────────────────────────────────────────────────────────────────────

/** 집단 유형 — 진로취업 상담사는 '집단상담', 심리 상담사는 '집단심리검사'를 연다 */
export type GroupCounselKind = '집단상담' | '집단심리검사'

export type GroupCounselStatus = '예정' | '완료' | '취소'

/** 참여 학생 1명 — 추가 시점 스냅샷 + 출석 */
export interface GroupMember {
  studentId: string
  studentNo: string
  name: string
  major: string
  grade: number
  /** 완료 처리 시 체크. 미완료 회차는 undefined */
  attended?: boolean
  /** 추가 일시 ISO */
  addedAt: string
}

export interface GroupCounsel {
  /** 회차 id (grp_ prefix) */
  id: string
  kind: GroupCounselKind
  /** 회차명 */
  title: string
  /** 주제·목표 */
  topic: string
  /** 실시일 YYYY-MM-DD */
  date: string
  /** 시작 HH:mm */
  start: string
  /** 종료 HH:mm */
  end: string
  place: string
  /** 정원. 참여자가 이 수를 넘지 않도록 화면에서 막는다 */
  capacity: number
  /** 진행 상담사 id */
  counselorId: string
  counselorName: string
  status: GroupCounselStatus
  members: GroupMember[]
  /** 집단심리검사 — 사용한 검사 종류 (PSYCH_TEST_TYPES.code) */
  testCode?: string
  /** 완료 기록 — 진행 요약 */
  summary?: string
  /** 완료 기록 — 참여 학생에게 공개되는 코멘트 */
  comment?: string
  /** 취소 사유 (취소 건만) */
  cancelReason?: string
  createdAt: string
  updatedAt: string
}
