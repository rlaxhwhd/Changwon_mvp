import { api } from './api'
import { DOCUMENT_ACCEPT, validateUpload } from './uploadPolicy'

export interface ProgramFile {
  id: string; name: string; size: number; contentType: string; downloadUrl: string
}
export interface ApplicationQuestion {
  id: string
  type: 'SINGLE' | 'MULTIPLE' | 'TEXT' | 'CONSENT' | 'FILE'
  question: string
  required: boolean
  options: string[]
  content: string
  maxFiles: number
}
export type ApplicationAnswers = Record<string, string | string[]>
export function questionsAnswered(questions: ApplicationQuestion[], answers: ApplicationAnswers): boolean {
  return questions.every(q => {
    const value = answers[q.id]
    return !q.required || (Array.isArray(value) ? value.length > 0 : !!value?.trim())
  })
}
export const QUESTION_TYPES: Record<ApplicationQuestion['type'], string> = {
  SINGLE: '객관식(선택형)', MULTIPLE: '객관식(복수 선택형)', TEXT: '주관식(최대 500자)',
  CONSENT: '개인정보 동의서', FILE: '첨부파일',
}

export async function uploadProgramFile(file: File, application = false): Promise<ProgramFile> {
  validateUpload(file, DOCUMENT_ACCEPT)
  return api<ProgramFile>(`/program-files?slot=${application ? 'PROGRAM_APPLICATION_ATTACHMENT' : 'PROGRAM_ATTACHMENT'}&name=${encodeURIComponent(file.name)}`,
    { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
}

export function formatProgramDate(date?: string | null, time?: string | null): string {
  if (!date) return ''
  const day = date.slice(0, 10)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${day}T00:00:00+09:00`))
  return `${day.replaceAll('-', '.')} (${weekday})${time ? ` ${time.slice(0, 5)}` : ''}`
}

export function noticeParts(value?: string | null): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).split(' ')
  return { date: parts[0], time: parts[1] }
}
