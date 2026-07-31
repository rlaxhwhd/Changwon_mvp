// ─────────────────────────────────────────────────────────────────────────────
// 상담 처리 이력 (상태 변경 로그) — append-only
//
// 왜 필요한가: 현행 `COUNSEL_MASTER`는 **최종값만** 들고 있다.
//   · 재배정(`/user/Co/CoMcReAssing.do`)은 `CONSULTID`만 바꾸고 이력이 남지 않는다
//   · 취소는 `CANCELREASON`/`CANCELUSERID`/`CANCELDATE` 3컬럼에 마지막 1건만 덮어쓴다
// → 누가 언제 왜 담당자를 바꿨는지 추적이 불가능하다.
//   CLAUDE.md "현행에 없어서 우리가 신설하는 것" §상태 변경 이력 · SPEC §3-1-② 대응.
//
// 원칙: 이벤트는 추가만 한다. 수정·삭제하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import type { CounselSlot } from './counselRequest'

/** 상담 건에 일어난 상태 변화의 종류 */
export type CounselEventKind = '확정' | '일정변경' | '재배정' | '취소' | '완료'

export interface CounselEvent {
  /** 이벤트 id (cev_ prefix) */
  id: string
  /** 대상 상담 신청 id */
  requestId: string
  studentId: string
  kind: CounselEventKind
  /** 재배정 — 이전 담당 상담사 id */
  fromCounselorId?: string
  /** 재배정 — 이후 담당 상담사 id */
  toCounselorId?: string
  /** 일정 확정·변경 — 이전 슬롯(변경 건만) */
  fromSlot?: CounselSlot
  /** 일정 확정·변경 — 이후 슬롯 */
  toSlot?: CounselSlot
  /** 사유. **취소는 필수**(SPEC §3-1-②), 재배정은 선택 */
  reason?: string
  /** 처리자 id */
  by: string
  /** 처리자 이름 스냅샷 */
  byName: string
  /** 처리 일시 ISO */
  at: string
}
