import { apiResponse } from './api'

export type ChatSource = { id: string; title: string; url: string; snippet: string; origin?: string; version?: string }
export type ChatReply = { text: string; sources: ChatSource[]; notices: string[]; elapsedMs: number; generatedAt?: string; savedAt?: string; commentId?: string; stale?: boolean }
export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export async function askChatbot(message: string, history: ChatTurn[], signal: AbortSignal,
  onProgress: (message: string) => void): Promise<ChatReply> {
  return streamAi('/chatbot/chat', { message, history }, signal, onProgress)
}

export async function streamAi(path: string, payload: unknown, signal: AbortSignal,
  onProgress: (message: string) => void): Promise<ChatReply> {
  const response = await apiResponse(path, {
    method: 'POST', signal, body: JSON.stringify(payload),
  })
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('챗봇 응답을 읽지 못했습니다. 다시 시도해 주세요.')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n')
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const kind = frame.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim()
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
        if (!data) continue
        const payload = JSON.parse(data)
        if (kind === 'progress') onProgress(payload.message)
        if (kind === 'error') throw new Error(payload.message)
        if (kind === 'done') return payload as ChatReply
      }
      if (done) break
      if (buffer.length > 100_000) throw new Error('챗봇 응답이 너무 큽니다.')
    }
    throw new Error('연결이 끊어졌습니다. 질문을 다시 보내주세요.')
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
