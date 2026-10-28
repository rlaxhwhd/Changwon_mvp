import type { LevelStat } from '../src_v2/components/StudentStatCards'

/** 학년 성장 레벨 카드에 필요한 값 — 학생 라운지(대시보드)와 교직원 학생 상세가 같이 쓴다. */
export type QuestLevel = Pick<QuestDashboard, 'grade' | 'level' | 'levelCap' | 'xpInLevel' | 'xpPerLevel' | 'atCap'>

export function questLevelStat(data: QuestLevel | null, error = ''): LevelStat {
  return { kind: 'level', label: '성장 레벨', levelUnit: 'LV', level: data ? String(data.level) : '—',
    tierLabel: data ? data.grade ? `${data.grade}학년 성장 목표` : '학년 정보 확인 필요' : '',
    tier: data?.levelCap ? `최대 LV ${data.levelCap}` : '',
    xp: data ? `${data.xpInLevel.toLocaleString()} / ${data.xpPerLevel.toLocaleString()} XP` : '—',
    xpFoot: error || (data ? data.atCap ? '학년 목표 달성' : '다음 레벨까지' : '성장 기록 불러오는 중'),
    pct: data && data.xpPerLevel > 0 ? data.xpInLevel / data.xpPerLevel * 100 : 0 }
}

/** 출석 XP 안내 — 학기 일정 미등록·주말을 구분해 왜 0 XP인지 밝힌다(메인·퀘스트 보드 공용). */
export function attendanceXpNote(data: QuestDashboard) {
  if (data.attendanceRewardEligible) return `출석 보상 ${data.rules.DAILY.xp.toLocaleString()} XP`
  if (!data.semester) return '학기 일정이 아직 등록되지 않아 XP가 지급되지 않습니다. 출석은 기록됩니다.'
  return '학기 중 평일에 XP가 지급됩니다. 오늘은 출석 기록만 남겨요.'
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
  /** 학기 0~12.5 · 학년 0~25(학년마다 0부터) · 누적 최대 100 LV — 서버 원장에서 파생 */
  growth: {
    semester: GrowthLevel & { code: string; label: string; tier: SemesterTier | null; nextTier: SemesterTier | null } | null
    grade: GrowthLevel & { grade: number } | null
    cumulative: GrowthLevel
    tiers: SemesterTier[]
  }
}
export interface GrowthLevel { xp: number; level: number; maxLevel: number; maxXp: number }
export interface SemesterTier { code: string; label: string; minXp: number }
