import { api, queryString } from './api'
import { streamAi, type ChatReply } from './chatbotApi'

export async function ensureDiagnosisComment(studentId: string, testId: string, attemptNo: number,
  progress: (message: string) => void) {
  const body = { studentId, kind: 'diagnosis', testId, attemptNo }
  const stored = await api<{ comment: ChatReply | null }>(`/ai/comments?${queryString(body)}`)
  if (stored.comment && !stored.comment.stale) return stored.comment
  return streamAi('/ai/comments', body, new AbortController().signal, progress)
}
