import { api } from './api'
import type { DiagnosisAttempt, DiagnosisComment } from '../src_admin/data/schema/diagnosisAttempt'
import type { DiagnosisResult } from '../src_v2/data/schema/diagnosisResult'
import type { StudentType } from '../src_v2/data/careerProcess'

export interface RetakeState {
  diagnosticType: StudentType | null
  followUpTest: string | null
  permissions: Record<string, boolean>
  guide: { stage: 'core' | 'followup' | 'counsel' | 'roadmap'; requestId: number } | null
  requests: { id: number; testId: string; status: 'PENDING' | 'APPROVED' | 'COMPLETED'; source: string; requestedAt: string; approvedAt: string | null; approvedBy: string | null }[]
}
export const diagnosisRetakes: Record<string, RetakeState> = {}

export const diagnosisAttempts: DiagnosisAttempt[] = []
export const diagnosisResults: DiagnosisResult[] = []
export const diagnosisComments: DiagnosisComment[] = []
export const externalDiagnosisLinks: Record<string,string> = {}
export async function loadStudentDiagnoses(studentId: string) {
  const data = await api<{studentId: string; attempts: DiagnosisAttempt[]; results: DiagnosisResult[]; comments: DiagnosisComment[]; externalTests: Record<string,string>; retake: RetakeState}>(`/diagnosis/students/${encodeURIComponent(studentId)}`)
  diagnosisRetakes[studentId] = diagnosisRetakes[data.studentId] = data.retake
  Object.assign(externalDiagnosisLinks,data.externalTests)
  function replace<T extends {studentId: string}>(target: T[], rows: T[]) {
    const retained=target.filter(row => row.studentId !== studentId)
    target.splice(0,target.length,...retained,...rows)
  }
  replace(diagnosisAttempts,data.attempts)
  replace(diagnosisResults,data.results)
  replace(diagnosisComments,data.comments)
  window.dispatchEvent(new Event('dc:diagnosis-updated'))
  return data
}
