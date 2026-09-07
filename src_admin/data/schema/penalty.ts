// ─────────────────────────────────────────────────────────────────────────
// 블랙리스트 벌점 스키마 (단일 소스) — Counsel_README §5-E · §7
//
// 비교과 프로그램을 신청해놓고 미참여(노쇼)한 학생에게 벌점을 부여한다.
// localStorage 'dc_penalty' 에 학생별 벌점 레코드를 누적하고, 학생 화면
// (마이페이지·성장)에서 누적 벌점·사유를 열람한다.
//
// 데이터 형태: dc_penalty = { [studentId]: StudentPenalty }
// ─────────────────────────────────────────────────────────────────────────

/** 벌점 변동 유형 — 부여(노쇼/기타) · 차감/해제 */
export type PenaltyKind = 'noshow' | 'manual' | 'waive'

/** 벌점 이력 1건 (누적/차감/해제 각각 기록) */
export interface PenaltyEntry {
  id: string
  /** 변동 유형 */
  kind: PenaltyKind
  /** 점수 변동값 — 부여는 양수, 차감/해제는 음수 */
  points: number
  /** 사유 (예: "OO 프로그램 노쇼", "소명 인정 해제") */
  reason: string
  /** 연관 프로그램 id (노쇼 벌점일 때) */
  programId?: string
  /** 연관 프로그램명 */
  programTitle?: string
  /** 부여/처리 일시 (ISO 8601) */
  at: string
  /** 처리한 상담사 id */
  by: string
}

/** 학생 1명의 벌점 상태 (누적 총점 + 이력) */
export interface StudentPenalty {
  studentId: string
  studentName: string
  studentMajor: string
  /** 누적 벌점 총점 (entries 합산, 0 이상으로 보정) */
  total: number
  /** 벌점 변동 이력 */
  entries: PenaltyEntry[]
}

/** 노쇼 1건당 기본 부여 벌점 */
export const NOSHOW_PENALTY_POINTS = 10

/** 벌점 총점 → 등급 라벨 (학생 화면 표기용) */
export function penaltyLevel(total: number): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  if (total >= 30) return { label: '이용 제한', tone: 'danger' }
  if (total >= 10) return { label: '주의', tone: 'warn' }
  return { label: '정상', tone: 'ok' }
}
