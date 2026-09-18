export type QuestPeriod = 'DAILY' | 'MONTHLY' | 'SEMESTER'
export interface QuestReward { label: string; xp: number; quota: number; cyclesPerSemester: number; version: number }
export interface QuestGrowthDay { date: string; xp: number }
export interface QuestDashboard {
  today: string; grade: number | null; totalXp: number; level: number; levelCap: number | null
  xpInLevel: number; xpPerLevel: number; atCap: boolean
  attendance: { today: boolean; streak: number; dates: string[] }
  graph: QuestGrowthDay[]; rules: Record<QuestPeriod, QuestReward>; dailyCompleted: number
  completed: Record<QuestPeriod, number>
  semester: { code: string; label: string; startDate: string; endDate: string } | null
  attendanceRewardEligible: boolean
}
