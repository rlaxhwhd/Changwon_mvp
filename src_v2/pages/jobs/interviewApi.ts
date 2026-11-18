// AI 인터뷰(DeepResume 면접 IFRAME). 영상·질문·평가는 Deep 에만 있고,
// 우리 서버에는 동의와 세션 기록만 남는다(dc.job_interview_session, 164).
import { api } from '../../../shared/api'

export interface InterviewSession {
  id: string
  /** 질문 방식 — cover 자소서 기반 · no_cover 자소서 없이 · company 기업별 질문(Deep_APII_V2, 166) */
  mode: 'cover' | 'no_cover' | 'company'
  resumeId: string | null
  resumeTitle: string
  company: string
  createdAt: string
  finishedAt: string | null
}

/** 화면의 질문 방식. 서버가 Deep 면접 시작①(cover) / ②(none → no_cover, company) 로 나눈다. */
export type InterviewSource = 'cover' | 'none' | 'company'

export interface InterviewStart {
  source: InterviewSource
  /** 자소서 기반만 */
  resumeId?: string
  industry: string
  companyType: string
  experience: string
  /** 자소서 없이·기업별만 — 자소서 대신 직접 적는 지원 정보(Deep 한도: 직종 15자, 경험 글 1000자, 나머지 100자) */
  jobType?: string
  company?: string
  position?: string
  workTask?: string
  /** 기업별만. 비우거나 「전체」면 전체 직무에서 질문을 고른다. */
  jobCategory?: string
  /** 자소서 없이만. 면접관이 참고할 경험 글. */
  content?: string
}

/** 기업별 질문이 등록된 기업명 자동완성. 입력이 멈춘 뒤(약 0.3초) 부른다. */
export async function searchInterviewCompanies(query: string): Promise<string[]> {
  return (await api<{ items: string[] }>(`/job-interview-companies?q=${encodeURIComponent(query)}`)).items
}

/** 고른 기업의 직무 목록. 목록에서 고른 기업명 그대로 보낸다. */
export async function loadInterviewJobCategories(company: string): Promise<string[]> {
  return (await api<{ items: string[] }>(`/job-interview-companies/job-categories?company=${encodeURIComponent(company)}`)).items
}

/** 지난 인터뷰와, 현재 동의서 버전에 이미 동의했는지(consented). 동의는 버전당 한 번만 받는다(165). */
export async function loadInterviews(): Promise<{ items: InterviewSession[]; consented: boolean }> {
  return api<{ items: InterviewSession[]; consented: boolean }>('/job-interviews')
}

/** 현재 동의서 버전에 이미 동의했는지. AI 자소서·AI 인터뷰 화면에 들어올 때 DeepConsentGate 가 한 번 확인한다. */
export async function loadConsentState(): Promise<{ consented: boolean }> {
  return api<{ consented: boolean }>('/job-interview-consent')
}

/** 개인정보 동의를 기록한다. 서버는 아는 버전에 모든 항목 「예」만 받는다. */
export async function agreeInterviewConsent(consentVersion: string, consentAnswers: Record<string, 'yes'>): Promise<void> {
  await api('/job-interview-consent', { method: 'POST', body: JSON.stringify({ consentVersion, consentAnswers }) })
}

export type InterviewInfo = Pick<InterviewStart, 'industry' | 'companyType' | 'experience'>

/** 자소서에 저장된 업종·기업형태·경력(DeepResume 자소서 값). 빈 값만 면접 화면이 다시 묻는다. */
export async function loadInterviewInfo(resumeId: string): Promise<InterviewInfo> {
  return api<InterviewInfo>(`/job-resumes/${encodeURIComponent(resumeId)}/interview-info`)
}

/** 면접 세션을 만든다. iframeUrl 의 티켓은 60초·1회용이라 받자마자 iframe 에 넣는다. */
export async function startInterview(input: InterviewStart): Promise<{ id: string; iframeUrl: string }> {
  return api<{ id: string; iframeUrl: string }>('/job-interviews', { method: 'POST', body: JSON.stringify(input) })
}

export interface InterviewResultSummary {
  resultId: string
  title: string
  position: string
  createdAt: string
  /** AI 평가가 끝났는지. 끝나기 전에는 결과표가 비어 있을 수 있다. */
  evaluated: boolean
}

export interface InterviewScores { relevance: number; logic: number; jobFit: number }

export interface InterviewResult {
  resultId: string
  status: string
  createdAt: string
  application: { jobType: string; industry: string; companyType: string; experience: string; company: string; position: string; workTask: string }
  questions: {
    id: string; part: string; question: string; answer: string; intent: string; review: string
    strengths: string; weaknesses: string; improvements: string; bestAnswer: string; scores: InterviewScores; hasVideo: boolean
  }[]
  overall: { evaluation: string; scores: InterviewScores & { total: number } }
}

/** 내 AI 인터뷰 결과 목록. 정본은 Deep 이라 매번 Deep 에서 읽는다. */
export async function loadInterviewResults(): Promise<InterviewResultSummary[]> {
  return (await api<{ items: InterviewResultSummary[] }>('/job-interview-results')).items
}

/** 결과표 하나(질문별 평가·점수, 종합 평가). 영상은 Deep 응시내역 화면에서만 볼 수 있다. */
export async function loadInterviewResult(resultId: string): Promise<InterviewResult> {
  return api<InterviewResult>(`/job-interview-results/${encodeURIComponent(resultId)}`)
}

/** DeepResume 응시결과 화면(IFRAME) 주소. 티켓은 60초·1회용이라 받자마자 iframe 에 넣는다. */
export async function openInterviewResults(): Promise<{ iframeUrl: string }> {
  return api<{ iframeUrl: string }>('/job-interview-results', { method: 'POST' })
}

/** 면접 화면이 알려 온 종료(result_id)를 기록한다. 서버가 Deep 결과 목록으로 본인 것인지 확인한다. */
export async function finishInterview(id: string, resultId: string): Promise<InterviewSession> {
  return api<InterviewSession>(`/job-interviews/${encodeURIComponent(id)}/finish`, {
    method: 'POST', body: JSON.stringify({ resultId }),
  })
}
