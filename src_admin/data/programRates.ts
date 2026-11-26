/** 비교과 참여율·이수율 — 선발자의 이수 결과로만 계산한다. 분모가 0이면 0%다. */
export interface ProgramRates {
  selected: number
  participants: number
  completed: number
  participationRate: number
  completionRate: number
}

const percent = (part: number, whole: number) => (whole ? Math.round(part / whole * 1000) / 10 : 0)

/**
 * 참여율 = 참여인원(수료 + 미수료) / 선발인원 × 100
 * 이수율 = 수료 / 참여인원 × 100
 * 미수료는 참석했지만 수료하지 못했거나 진행 중인 학생이라 NOT_COMPLETED 와 ATTENDED 를 함께 센다.
 * 소수 첫째 자리까지 반올림한다. 불참과 결과 미입력은 참여인원에 넣지 않는다.
 */
/**
 * 신청자 관리의 취소율·선발율 — 분모는 이 화면의 「신청자」 카드와 같은 전체 신청(취소 포함)이다.
 * 취소는 학생 본인 취소(canceledAt)와 상태 취소(CANCELLED)를 함께 센다. 선발은 「선발」 카드와 같은 기준이다.
 */
export function applicantRates(applicants: { selectionStatus?: string | null; canceledAt?: string | null }[]) {
  const total = applicants.length
  const cancelled = applicants.filter(a => a.canceledAt || a.selectionStatus === 'CANCELLED').length
  const selected = applicants.filter(a => a.selectionStatus === 'SELECTED').length
  return { total, cancelled, selected, cancelRate: percent(cancelled, total), selectionRate: percent(selected, total) }
}

export function programRates(selected: { outcomeStatus?: string | null }[]): ProgramRates {
  const completed = selected.filter(a => a.outcomeStatus === 'COMPLETED').length
  const participants = completed + selected.filter(a => a.outcomeStatus === 'NOT_COMPLETED' || a.outcomeStatus === 'ATTENDED').length
  return {
    selected: selected.length,
    participants,
    completed,
    participationRate: percent(participants, selected.length),
    completionRate: percent(completed, participants),
  }
}
