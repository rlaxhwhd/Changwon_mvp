import type { Program } from '../src_admin/data/schema/program'
import { outcomeLabel, selectionLabel } from '../src_admin/data/schema/program'

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

export type ProgramParticipation = Pick<MyProgram, 'id' | 'startDate' | 'cancelledAt' | 'selection' | 'outcome'
  | 'competencySurvey' | 'satisfactionSurvey' | 'surveyPre' | 'surveyPost' | 'surveySatisfaction'>

/** 공고 응답과 내 신청 목록을 같은 참여 상태로 읽는다. 학생 API는 본인 신청만 반환한다. */
export function programParticipation(program: Program, studentId: string): ProgramParticipation | null {
  const application = program.applicants.find(a => a.studentId === studentId)
  if (!application) return null
  return {
    id: program.id, startDate: program.runStartDate || null,
    cancelledAt: application.canceledAt || null,
    selection: application.selectionStatus ?? 'PENDING', outcome: application.outcomeStatus ?? null,
    competencySurvey: !!program.competencySurvey && !!program.competencyAreas?.length,
    satisfactionSurvey: !!program.satisfactionSurvey,
    surveyPre: !!application.surveyPre, surveyPost: !!application.surveyPost,
    surveySatisfaction: !!application.surveySatisfaction,
  }
}

export function myProgramStatus(p: ProgramParticipation): string {
  if (p.cancelledAt || p.selection === 'CANCELLED') return selectionLabel('CANCELLED')
  if (p.outcome === 'COMPLETED') return '이수완료'
  if (p.outcome) return outcomeLabel(p.outcome)
  if (p.selection === 'SELECTED') return '선발완료'
  if (p.selection === 'PENDING') return '선발대기중'
  return selectionLabel(p.selection)
}

/** 이 신청에서 안내할 조사 목록. 창이 닫혔는지는 서버가 판정하므로 여기서는 단계만 고른다. */
export function myProgramSurveys(p: ProgramParticipation): MyProgramSurvey[] {
  if (p.cancelledAt || p.selection !== 'SELECTED') return []
  const list: MyProgramSurvey[] = []
  if (p.competencySurvey && !p.outcome) list.push({ phase: 'PRE', label: '사전 역량 진단', done: p.surveyPre })
  if (p.competencySurvey && p.outcome === 'COMPLETED') {
    if (p.surveyPre) list.push({ phase: 'PRE', label: '사전 역량 진단', done: true })
    list.push({ phase: 'POST', label: '사후 역량 진단', done: p.surveyPost })
  }
  if (p.satisfactionSurvey && p.outcome === 'COMPLETED') list.push({ phase: 'SATISFACTION', label: '만족도 조사', done: p.surveySatisfaction })
  return list
}
