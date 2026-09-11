// ─────────────────────────────────────────────────────────────────────────────
// 진단 상세 결과 스키마 (단일 소스) — 학생·상담사 공용.
//
// 구조는 CRA 진로준비도 결과표를 정본으로 한다:
//   검사 1건 → 요인 N개 → 요인별 [수준 · T점수] → 대표 결과 + 해석 코멘트
// 이 구조는 검사 종류를 가리지 않는다(CCORE·C1~C6 전부 같은 표로 그린다).
//
// ⚠ 요인 목록 자체는 careerProcess.DIAGNOSIS_MODULES[].factors 가 단일 소스다.
//   여기는 "그 요인에 이 학생이 몇 점을 받았나"(이벤트 결과)만 담는다.
// ⚠ 판정식은 미확정이다(CLAUDE.md 14조). T점수는 검사가 내놓는 값으로 취급하고
//   화면·로더에서 점수를 계산해 만들지 않는다 — seed/DB 가 주는 값을 그대로 옮긴다.
// ─────────────────────────────────────────────────────────────────────────────

/** 요인 수준 — T점수 밴드에서 파생한다(저장하지 않는다). */
export type FactorLevel = '낮음' | '보통' | '높음'

/**
 * T점수 밴드 경계. 평균 50 · 표준편차 10 의 표준 T점수 규약.
 * (CRA 결과표 실측과 일치: 37.17=낮음, 41.67=보통, 59.68=보통, 60.15=높음)
 */
export const T_LOW = 40
export const T_HIGH = 60

/** T점수 → 수준. 결과표·배지가 모두 이 함수 하나를 쓴다. */
export function levelOf(tScore: number): FactorLevel {
  if (tScore < T_LOW) return '낮음'
  if (tScore < T_HIGH) return '보통'
  return '높음'
}

/** 요인 1개의 응시 결과 */
export interface FactorScore {
  factorCode?: string
  /** 요인명 — DIAGNOSIS_MODULES[].factors[].name 과 일치해야 한다 */
  name: string
  /** T점수 (평균 50 · 표준편차 10). 소수 2자리. */
  tScore: number
  level?: FactorLevel
}

/** 검사 1회 응시의 상세 결과 */
export interface DiagnosisResult {
  source?: string
  /** 학생 id */
  studentId: string
  /** 검사 키 — DIAGNOSIS_MODULES[].testId ('ccore' | 'c1'~'c6') */
  testId: string
  /** 회차 — DiagnosisAttempt.attemptNo 와 짝을 이룬다 */
  attemptNo: number
  /** 검사 실시일 YYYY-MM-DD */
  testedAt: string
  /** 대표 결과값 — 이 검사가 내놓는 결론 (예: 6유형 '역량성장형', 강점요인 '면접역량') */
  headline: string
  /** 대표 결과의 이름표 (예: '핵심진단 검사 결과 유형', '강점 요인') */
  headlineCaption: string
  /** 요인별 점수 — 표의 행 */
  factors: FactorScore[]
  /** 결과 해석 코멘트 */
  comment: string
}
