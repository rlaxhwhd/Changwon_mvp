import { api } from './api'
import type { DiagnosisAttempt, DiagnosisComment } from '../src_admin/data/schema/diagnosisAttempt'
import type { DiagnosisResult } from '../src_v2/data/schema/diagnosisResult'

export const diagnosisAttempts: DiagnosisAttempt[] = []
export const diagnosisResults: DiagnosisResult[] = []
export const diagnosisComments: DiagnosisComment[] = []
export async function loadStudentDiagnoses(studentId: string) {
  const data = await api<{attempts: DiagnosisAttempt[]; results: DiagnosisResult[]; comments: DiagnosisComment[]}>(`/diagnosis/students/${encodeURIComponent(studentId)}`)
  function replace<T extends {studentId: string}>(target: T[], rows: T[]) {
    const retained=target.filter(row => row.studentId !== studentId)
    target.splice(0,target.length,...retained,...rows)
  }
  replace(diagnosisAttempts,data.attempts)
  replace(diagnosisResults,data.results)
  replace(diagnosisComments,data.comments)
}
