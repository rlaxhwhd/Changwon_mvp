// AI 인터뷰(DeepResume 면접 IFRAME). 영상·질문·평가는 Deep 에만 있고,
// 우리 서버에는 동의와 세션 기록만 남는다(dc.job_interview_session, 164).
import { api } from '../../../shared/api'

export interface InterviewSession {
  id: string
  resumeId: string
  resumeTitle: string
  company: string
  createdAt: string
  finishedAt: string | null
}

export interface InterviewStart {
  resumeId: string
  industry: string
  companyType: string
  experience: string
}

/** 지난 인터뷰와, 현재 동의서 버전에 이미 동의했는지(consented). 동의는 버전당 한 번만 받는다(165). */
export async function loadInterviews(): Promise<{ items: InterviewSession[]; consented: boolean }> {
  return api<{ items: InterviewSession[]; consented: boolean }>('/job-interviews')
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
