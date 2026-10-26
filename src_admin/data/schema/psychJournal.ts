// 심리상담 상담일지 양식 — 학생상담센터 [붙임 14] 상담일지(2026-10-26).
// 서버 계약은 backend/app/psych_journal.py 와 같다. 진로취업 template(정성진단·AI 일지)과 섞지 않는다.

export const PSYCH_JOURNAL_METHODS = ['대면', '전화', 'ZOOM', '기타'] as const
export type PsychJournalMethod = typeof PSYCH_JOURNAL_METHODS[number]

export interface PsychJournal {
  schemaVersion: 1
  /** ( ) 회기 */
  session: number | null
  /** 상담일시 YYYY-MM-DDTHH:mm */
  conductedAt: string
  /** 상담방법 — 대면 또는 비대면(전화·ZOOM·기타) */
  method: PsychJournalMethod | null
  methodOther: string
  /** 비대면 진행사유 */
  remoteReason: string
  /** 상담내용(주요사항, 위기상황 등) — 내부 기록, 기록 summary 로도 저장된다 */
  content: string
  crisis: string
  remarks: string
  /** 다음 상담 약속 YYYY-MM-DDTHH:mm */
  nextAt: string
}

export const isRemote = (method: PsychJournalMethod | null) => method !== null && method !== '대면'

/** 새 양식 — 신청의 일정·방식으로 채운다. 양식 도입 전 기록은 기존 본문을 상담내용으로 옮겨 잃지 않는다. */
export function emptyPsychJournal(method: string, date: string, time = '', session: number | null = null, legacySummary = ''): PsychJournal {
  return {
    schemaVersion: 1, session, conductedAt: date && time ? `${date}T${time}` : '',
    method: method === '대면' ? '대면' : null, methodOther: '', remoteReason: '',
    content: legacySummary, crisis: '', remarks: '', nextAt: '',
  }
}

/** 제출 전 확인 — 서버 validate_completed_psych 와 같은 규칙. */
export function psychJournalErrors(journal: PsychJournal, comment: string): string[] {
  const missing = [
    !journal.session && '회기', !journal.conductedAt && '상담일시', !journal.method && '상담방법',
    !journal.content.trim() && '상담내용',
    journal.method === '기타' && !journal.methodOther.trim() && '기타 상담방법',
    isRemote(journal.method) && !journal.remoteReason.trim() && '비대면 진행사유',
  ].filter(Boolean)
  const errors = missing.length ? [`${missing.join('·')}을(를) 입력해 주세요.`] : []
  if (!comment.trim()) errors.push('학생 공개 코멘트를 입력해 주세요.')
  return errors
}

export function psychMethodLabel(journal: PsychJournal): string {
  if (!journal.method) return '미입력'
  if (journal.method === '대면') return '대면'
  return `비대면(${journal.method === '기타' ? journal.methodOther || '기타' : journal.method})`
}

export const formatJournalTime = (value: string) => value ? value.replace('T', ' ') : ''
