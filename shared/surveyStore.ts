// 비교과 조사(역량향상률 사전·사후, 만족도) — 정본은 서버(dc.survey_response · survey_answer).
// 문항은 코드관리(SURVEY_AREA · SURVEY_ITEM)에서 오고, 열림 여부·통계는 서버가 판정·집계한다.
// 화면은 여기 DTO 를 그리기만 한다.
import { api, downloadApiFile } from './api'

export type SurveyPhase = 'PRE' | 'POST' | 'SATISFACTION'

export interface SurveyItem { code: string; prompt: string; value: number | null }
export interface SurveyArea { key: string; label: string; items: SurveyItem[] }

export interface SurveyForm {
  programId: string
  programTitle: string
  phase: SurveyPhase
  /** 지금 응답할 수 있는가. false 면 reason 이 이유를 준다(제출 완료 포함). */
  open: boolean
  reason: string
  submittedAt: string | null
  areas: SurveyArea[]
}

export interface SurveyStatRow { preAvg: number | null; postAvg: number | null; improvement: number | null; n: number }
export interface SurveyStatItem extends SurveyStatRow { code: string; prompt: string }
export interface SurveyStatArea extends SurveyStatRow { key: string; label: string; items: SurveyStatItem[] }

export interface SurveyStats {
  programId: string
  competencySurvey: boolean
  participation: { selected: number; completed: number; pre: number; post: number; satisfaction: number; paired: number }
  total: SurveyStatRow
  areas: SurveyStatArea[]
}

export const SURVEY_SCALE: { value: number; label: string }[] = [
  { value: 5, label: '매우 그렇다' }, { value: 4, label: '그렇다' }, { value: 3, label: '보통이다' },
  { value: 2, label: '그렇지 않다' }, { value: 1, label: '매우 그렇지 않다' },
]

export const SURVEY_PHASE_LABEL: Record<SurveyPhase, string> = { PRE: '사전 역량 진단', POST: '사후 역량 진단', SATISFACTION: '만족도 조사' }

export function loadSurveyForm(programId: string, phase: SurveyPhase): Promise<SurveyForm> {
  return api<SurveyForm>(`/programs/${encodeURIComponent(programId)}/survey/${phase}`)
}

export function submitSurvey(programId: string, phase: SurveyPhase, answers: Record<string, number>): Promise<void> {
  return api(`/programs/${encodeURIComponent(programId)}/survey/${phase}`,
             { method: 'POST', body: JSON.stringify({ answers }) }).then(() => undefined)
}

export function loadSurveyStats(programId: string): Promise<SurveyStats> {
  return api<SurveyStats>(`/programs/${encodeURIComponent(programId)}/survey/stats`)
}

/** 응답 원자료 엑셀(만족도·사전·사후 3장). 파일명은 서버가 Content-Disposition 으로 주지만 a[download] 에도 같은 이름을 준다. */
export function downloadSurveyExport(programId: string, programTitle: string): Promise<void> {
  return downloadApiFile(`/programs/${encodeURIComponent(programId)}/survey/export.xlsx`,
                         `${programTitle.replace(/[\\/:*?"<>|]/g, '_')}_조사결과.xlsx`)
}
