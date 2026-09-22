/** Lean, authenticated /programs/mine response. Operation dates may be undecided. */
export interface MyProgram {
  id: string
  title: string
  description: string
  category: string
  manager: string
  location: string
  startDate: string | null
  endDate: string | null
  sessions: number
  appliedAt: string
  cancelledAt: string | null
  selection: string
  outcome: string | null
  attendance: string
  /** 조사 안내용 플래그 — 실제 열림 여부는 설문 페이지가 서버에 묻는다. */
  competencySurvey: boolean
  satisfactionSurvey: boolean
  surveyPre: boolean
  surveyPost: boolean
  surveySatisfaction: boolean
}

export type MyProgramSurvey = { phase: 'PRE' | 'POST' | 'SATISFACTION'; label: string; done: boolean }

/** 이 신청에서 안내할 조사 목록. 창이 닫혔는지는 서버가 판정하므로 여기서는 단계만 고른다. */
export function myProgramSurveys(p: MyProgram, today: string): MyProgramSurvey[] {
  if (p.cancelledAt || p.selection !== 'SELECTED') return []
  const list: MyProgramSurvey[] = []
  const started = !!p.startDate && p.startDate.slice(0, 10) <= today
  if (p.competencySurvey && !p.outcome && (p.surveyPre || !started)) list.push({ phase: 'PRE', label: '사전 역량 진단', done: p.surveyPre })
  if (p.competencySurvey && p.outcome === 'COMPLETED') {
    if (p.surveyPre) list.push({ phase: 'PRE', label: '사전 역량 진단', done: true })
    list.push({ phase: 'POST', label: '사후 역량 진단', done: p.surveyPost })
  }
  if (p.satisfactionSurvey && p.outcome === 'COMPLETED') list.push({ phase: 'SATISFACTION', label: '만족도 조사', done: p.surveySatisfaction })
  return list
}
