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
