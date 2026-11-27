// 핵심역량 그래프는 프로필 API가 제공하는 DB 점수만 표시한다.
// 원점수(교과 학사 CORE + 비교과 이뤄드림 합산 'ACADEMIC_PROGRAM', 0026 · 옛 학사 단독 'ACADEMIC', 0023)는
// 100점 환산·목표선이 없다 — 숫자는 원점수 그대로다.
// 그래프는 축마다 COMPETENCY_FULL_SCORE(120)를 바깥 테두리로 그린다. 넘는 축은 테두리 밖으로 뻗어 보인다(over).
// 개발 테스트 점수(0~100)는 기존처럼 점수 = 그래프, 계층 목표선과 갭을 쓴다.
import { COMPETENCY_LABELS, COMPETENCY_ORDER } from '../lib/scoring'
import type { Competency } from '../lib/scoring'
import { STUDENT_TYPE_MAP } from './careerProcess'
import type { StudentData } from './students'

export interface CompetencyAxisView {
  key: Competency
  /** 표시명 — '창의적 사고' 처럼 띄어쓰기가 있는 공식 표기 */
  label: string
  /** 현재 점수 — 학사면 원점수, 개발 테스트면 0~100 */
  score: number
  /** 그리기용 비율 — 학사면 score / 120 × 100 (120 을 넘으면 100 초과), 아니면 score.
   *  그리는 쪽이 100 에서 자르고 over 로 「뚫고 나감」을 표시한다. */
  plot: number
  /** 원점수가 축 만점(120)을 넘었는가. 개발 테스트 점수(0~100)는 늘 false. */
  over: boolean
  /** 계층이 정하는 목표 도달선 0~100. 학사 원점수에는 없다(null). */
  target: number | null
  /** 갭 = score - target (음수면 미달). 목표선이 없으면 null. */
  gap: number | null
}

/** 계층별 목표 도달선 — 상위/중간/하위 학생에게 같은 잣대를 대지 않는다. */
const TIER_TARGET: Record<string, number> = { 상위: 90, 중간: 75, 하위: 60 }

/** 원점수 그래프의 축별 만점(바깥 테두리). 잠정값 — 사용자: 「120점이 장학금 주는 점수 그런 것 같다」(2026-11-27).
 *  점수 상한이 아니다. 200점도 정상이며, 넘는 축은 테두리 밖으로 뻗어 보인다. 기준이 바뀌면 이 값만 고친다. */
export const COMPETENCY_FULL_SCORE = 120

const DB_CODES: Record<Competency, string> = {
  지역형리더: 'LOCAL_LEADER', 창의적사고: 'CREATIVE', 실용적융복합: 'CONVERGENCE',
  의사소통: 'COMMUNICATION', 글로벌: 'GLOBAL',
}

export function getCompetencyScores(student: StudentData): Record<Competency, number> | null {
  const stored = student.coreCompetencyScores
  if (!stored || COMPETENCY_ORDER.some(key => !Number.isFinite(stored[DB_CODES[key]]))) return null
  return Object.fromEntries(COMPETENCY_ORDER.map(key => [key, stored[DB_CODES[key]]])) as Record<Competency, number>
}

/** 원점수(환산 없음·목표선 없음) 출처인가. 판정은 여기 한 곳에서만 한다 — 리터럴 비교를 화면에 두지 않는다.
 *  'ACADEMIC' 은 배포 전환 중 이전 응답 캐시 대비로만 남긴다(API 는 0026 부터 'ACADEMIC_PROGRAM' 만 낸다). */
export function isRawCompetencySource(source: string | null | undefined): boolean {
  return source === 'ACADEMIC_PROGRAM' || source === 'ACADEMIC'
}

/** 학생 1명의 5대 핵심역량 축. 순서는 COMPETENCY_ORDER 를 따른다. */
export function getCompetencyAxes(student: StudentData): CompetencyAxisView[] {
  const scores = getCompetencyScores(student)
  if (!scores) return []
  if (isRawCompetencySource(student.coreCompetencySource)) {
    return COMPETENCY_ORDER.map(key => ({
      key,
      label: COMPETENCY_LABELS[key],
      score: scores[key],
      plot: Math.max(0, scores[key] / COMPETENCY_FULL_SCORE * 100),
      over: scores[key] > COMPETENCY_FULL_SCORE,
      target: null,
      gap: null,
    }))
  }
  // 계층은 6유형에서 파생된다(careerProcess 단일소스) — 학생 레코드에 따로 저장하지 않는다.
  // 유형이 없으면(진단 전) 계층도 없다 — 기본 목표선을 쓴다.
  const tierLabel = student.studentType ? STUDENT_TYPE_MAP[student.studentType]?.tierLabel : undefined
  const target = (tierLabel ? TIER_TARGET[tierLabel] : undefined) ?? 75

  return COMPETENCY_ORDER.map(key => ({
    key,
    label: COMPETENCY_LABELS[key],
    score: scores[key],
    plot: scores[key],
    over: false,
    target,
    gap: scores[key] - target,
  }))
}

/** 학사 원점수 표시 — 소수 둘째 자리까지, 뒤 0 은 뗀다. */
export function formatCompetencyScore(score: number): string {
  return String(Math.round(score * 100) / 100)
}

/** 종합 점수 — 5개 축의 평균. 배점표가 나오면 가중평균으로 바뀔 수 있다. */
export function getCompetencyOverall(student: StudentData): number {
  const axes = getCompetencyAxes(student)
  if (!axes.length) return 0
  return Math.round(axes.reduce((sum, a) => sum + a.score, 0) / axes.length)
}
