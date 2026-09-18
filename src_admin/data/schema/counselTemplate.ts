import type { StudentType } from '../../../src_v2/data/careerProcess'

export const COUNSEL_CHANNELS = ['대면', '전화', '화상', '이메일'] as const
export const QUALITATIVE_ITEMS = [
  ['motivation', '동기부여'], ['employmentWill', '취업의지'],
  ['feasibility', '실천가능성'], ['communication', '커뮤니케이션 능력'],
  ['selfUnderstanding', '자기이해'],
] as const
export type QualitativeKey = typeof QUALITATIVE_ITEMS[number][0]
export type QualitativeRating = '상' | '중' | '하'
export interface CounselTemplate {
  schemaVersion: 1
  channel: typeof COUNSEL_CHANNELS[number] | null
  conductedAt: string
  finalType: StudentType | null
  qualitative: Partial<Record<QualitativeKey, QualitativeRating>>
  program: { selected: boolean; content: string }
  application: { selected: boolean; content: string }
  aiJournal: string
  legacySummary?: string
}

export function emptyCounselTemplate(method: string, date: string, time = ''): CounselTemplate {
  return {
    schemaVersion: 1, channel: method === '대면' ? '대면' : null,
    conductedAt: time ? `${date}T${time}` : '', finalType: null, qualitative: {},
    program: { selected: false, content: '' }, application: { selected: false, content: '' },
    aiJournal: '',
  }
}

/** 기존 소견·인쇄·내보내기와 호환되는 본문. 비선택 내용은 제출하지 않는다. */
export function counselContent(template: CounselTemplate): string {
  return [
    template.program.selected ? `프로그램 현황 체크\n${template.program.content.trim()}` : '',
    template.application.selected ? `입사지원 현황 체크\n${template.application.content.trim()}` : '',
  ].filter(Boolean).join('\n\n')
}

export function counselTemplateErrors(template: CounselTemplate, care7: boolean, typeLocked: boolean, comment: string): string[] {
  const errors: string[] = []
  if (!comment.trim()) errors.push('학생 공개 코멘트를 입력해 주세요.')
  if (care7 && QUALITATIVE_ITEMS.some(([key]) => !template.qualitative[key])) errors.push('정성진단 5개 항목을 모두 선택해 주세요.')
  if (care7 && !typeLocked && !template.finalType) errors.push('상담 후 최종 유형을 선택해 주세요.')
  const sections = [template.program, template.application].filter(section => section.selected)
  if (!sections.length || sections.some(section => !section.content.trim())) errors.push('상담내용을 한 가지 이상 선택하고 선택한 항목의 내용을 모두 입력해 주세요.')
  return errors
}
