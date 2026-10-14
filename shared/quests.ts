import type { LevelStat } from '../src_v2/components/StudentStatCards'

export function questLevelStat(data: QuestDashboard | null, error = ''): LevelStat {
  return { kind: 'level', label: '성장 레벨', levelUnit: 'LV', level: data ? String(data.level) : '—',
    tierLabel: data ? data.grade ? `${data.grade}학년 성장 목표` : '학년 정보 확인 필요' : '',
    tier: data?.levelCap ? `최대 LV ${data.levelCap}` : '',
    xp: data ? `${data.xpInLevel.toLocaleString()} / ${data.xpPerLevel.toLocaleString()} XP` : '—',
    xpFoot: error || (data ? data.atCap ? '학년 목표 달성' : '다음 레벨까지' : '성장 기록 불러오는 중'),
    pct: data && data.xpPerLevel > 0 ? data.xpInLevel / data.xpPerLevel * 100 : 0 }
}

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
