import type { QuestPeriod } from './quests'

export interface QuestDefinition {
  id: number; title: string; description: string; activity: string
  target_count: number; xp: number; is_active: boolean; version: number
}
export interface QuestAssignmentItem extends Omit<QuestDefinition, 'id' | 'is_active' | 'version'> {
  quest_id: number; definition_version: number
}
export interface QuestAssignment {
  id: number; title: string; period: Exclude<QuestPeriod, 'DAILY'>; period_key: string
  starts_on: string; ends_on: string; audience: 'ALL' | 'FILTERED'
  grades: number[]; student_types: string[]; published: boolean; version: number
  locked: boolean
  items: QuestAssignmentItem[]
}
export interface QuestOptions {
  activities: { code: string; label: string; unit: string; note: string }[]
  semesters: { code: string; label: string; payload: { startDate: string; endDate: string } }[]
  studentTypes: { code: string; label: string }[]
}
