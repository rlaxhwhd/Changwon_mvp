// ─────────────────────────────────────────────────────────────────────────
// 5대 핵심역량 — 점수 산출 (단일 접근 지점)
//
// ★ 이 점수는 수강 과목과 비교과 프로그램에 내포된 값에서 나온다.
//   과목·프로그램 하나하나가 어느 역량을 얼마나 기르는지를 갖고 있고,
//   학생이 이수한 것들이 쌓여 역량 점수가 된다.
//   → 그 배점표(과목·프로그램별 역량 기여도)가 아직 없다.
//
//   그래서 지금은 **임시 점수**를 쓴다. 학사·활동 지표를 가중평균하던 옛 방식
//   (lib/scoring.computeAll)은 쓰지 않는다 — 그 계산은 이 역량 체계의 것이 아니다.
//   배점표가 나오면 getCompetencyScores 한 함수만 갈아 끼우면 된다.
//   화면·상담사 포털은 모두 이 파일을 통해 읽으므로 다른 곳은 손대지 않아도 된다.
//
// 축 정의·순서·표시명은 lib/scoring 이 단일소스다.
// ─────────────────────────────────────────────────────────────────────────
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

/**
 * 임시 점수 — 배점표가 나오기 전까지 쓰는 자리표시자.
 *
 * 학생 id 로 값을 흔들어 학생마다 다른 그래프가 나오게만 한다(같은 학생은 항상 같은 값).
 * 난수를 쓰지 않는 이유 — 새로고침마다 점수가 바뀌면 화면을 믿을 수 없다.
 * ⚠️ 이 값에는 아무 의미가 없다. 판정·집계의 근거로 쓰지 말 것.
 */
export function getCompetencyScores(student: StudentData): Record<Competency, number> {
  const seed = [...student.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const scores = {} as Record<Competency, number>
  COMPETENCY_ORDER.forEach((key, i) => {
    // 55~90 사이에서 축마다 다른 값. 축 순서를 섞어 넣어 같은 모양이 반복되지 않게 한다.
    scores[key] = 55 + ((seed * 7 + i * 23) % 36)
  })
  return scores
}

/** 학생 1명의 5대 핵심역량 축. 순서는 COMPETENCY_ORDER 를 따른다. */
export function getCompetencyAxes(student: StudentData): CompetencyAxisView[] {
  const scores = getCompetencyScores(student)
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
  return Math.round(axes.reduce((sum, a) => sum + a.score, 0) / axes.length)
}
