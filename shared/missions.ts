export type QuestionKind = 'TOEIC' | 'NCS' | 'GSAT'
export type WeekKind = 'TOEIC' | 'NCS_GSAT'
export interface QuestionContent { word: string; aliases: string[]; example: string; choices: string[]; answer: number; explanation: string }
export interface MissionQuestion { difficulty_code?: string; publication_count?: number; id: number; kind: QuestionKind; prompt: string; category: string; content: QuestionContent; is_active: boolean; version: number }
export interface MissionWeek { selection_limit: 10 | 20; id: number; week_start: string; kind: WeekKind; title: string; items: MissionQuestion[]; published: boolean; version: number }
export interface LearningQuestion { id: number; kind: QuestionKind; prompt: string; category: string; choices: string[]; word?: string; example?: string; explanation?: string }
export interface LearningWeek { id: number; kind: WeekKind; title: string; version: number; questions: LearningQuestion[] }
export interface MissionResult { id: string; title: string; correctCount: number; totalCount: number; reviews: (LearningQuestion & { correct: boolean; correctAnswer: string; userAnswer: string; explanation: string })[] }
export const missionError = (error: unknown) => error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
export function currentMonday() {
  const date = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()) + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return date.toISOString().slice(0, 10)
}
