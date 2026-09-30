export type QuestPeriod = 'DAILY' | 'MONTHLY' | 'SEMESTER'
export interface QuestReward { label: string; xp: number; quota: number; cyclesPerSemester: number; version: number }
export interface QuestGrowthDay { date: string; xp: number }
export interface QuestDashboard {
  assigned: { assignment_id: number; quest_id: number; title: string; description: string; period: QuestPeriod; activity: string; target_count: number; current: number; xp: number; done: boolean; granted_xp: number | null }[]
  toeic: { done: boolean; correct: number; threshold: number | null }
  today: string; grade: number | null; totalXp: number; level: number; levelCap: number | null
  xpInLevel: number; xpPerLevel: number; atCap: boolean
  attendance: { today: boolean; streak: number; dates: string[] }
  graph: QuestGrowthDay[]; rules: Record<QuestPeriod, QuestReward>; dailyCompleted: number
  completed: Record<QuestPeriod, number>
  semester: { code: string; label: string; startDate: string; endDate: string } | null
  attendanceRewardEligible: boolean
}
