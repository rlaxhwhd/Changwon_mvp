// 핵심역량 그래프는 프로필 API가 제공하는 DB 점수만 표시한다.
// 실제 학사 누계의 100점 환산 정책은 미확정이며, 현재는 명시적 개발 테스트 점수만 제공한다.
import { COMPETENCY_LABELS, COMPETENCY_ORDER } from '../lib/scoring'
import type { Competency } from '../lib/scoring'
import { STUDENT_TYPE_MAP } from './careerProcess'
import type { StudentData } from './students'

export interface CompetencyAxisView {
  key: Competency
  /** 표시명 — '창의적 사고' 처럼 띄어쓰기가 있는 공식 표기 */
  label: string
  /** 현재 점수 0~100 */
  score: number
  /** 계층이 정하는 목표 도달선 0~100 */
  target: number
  /** 갭 = score - target (음수면 미달) */
  gap: number
}

/** 계층별 목표 도달선 — 상위/중간/하위 학생에게 같은 잣대를 대지 않는다. */
const TIER_TARGET: Record<string, number> = { 상위: 90, 중간: 75, 하위: 60 }

const DB_CODES: Record<Competency, string> = {
  지역형리더: 'LOCAL_LEADER', 창의적사고: 'CREATIVE', 실용적융복합: 'CONVERGENCE',
  의사소통: 'COMMUNICATION', 글로벌: 'GLOBAL',
}

export function getCompetencyScores(student: StudentData): Record<Competency, number> | null {
  const stored = student.coreCompetencyScores
  if (!stored || COMPETENCY_ORDER.some(key => !Number.isFinite(stored[DB_CODES[key]]))) return null
  return Object.fromEntries(COMPETENCY_ORDER.map(key => [key, stored[DB_CODES[key]]])) as Record<Competency, number>
}

/** 학생 1명의 5대 핵심역량 축. 순서는 COMPETENCY_ORDER 를 따른다. */
export function getCompetencyAxes(student: StudentData): CompetencyAxisView[] {
  const scores = getCompetencyScores(student)
  if (!scores) return []
  // 계층은 6유형에서 파생된다(careerProcess 단일소스) — 학생 레코드에 따로 저장하지 않는다.
  // 유형이 없으면(진단 전) 계층도 없다 — 기본 목표선을 쓴다.
  const tierLabel = student.studentType ? STUDENT_TYPE_MAP[student.studentType]?.tierLabel : undefined
  const target = (tierLabel ? TIER_TARGET[tierLabel] : undefined) ?? 75

  return COMPETENCY_ORDER.map(key => ({
    key,
    label: COMPETENCY_LABELS[key],
    score: scores[key],
    target,
    gap: scores[key] - target,
  }))
}

/** 종합 점수 — 5개 축의 평균. 배점표가 나오면 가중평균으로 바뀔 수 있다. */
export function getCompetencyOverall(student: StudentData): number {
  const axes = getCompetencyAxes(student)
  if (!axes.length) return 0
  return Math.round(axes.reduce((sum, a) => sum + a.score, 0) / axes.length)
}
