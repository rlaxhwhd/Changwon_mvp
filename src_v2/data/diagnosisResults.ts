// ─────────────────────────────────────────────────────────────────────────────
// 진단 상세 결과 로더 (단일 소스) — 학생(src_v2)·상담사(src_admin) 공용.
//
// seed JSON 이 "검사가 내놓은 값"을 그대로 담고, 여기서는 조회만 한다.
// ⚠ 점수를 계산하지 않는다. 수준(낮음/보통/높음)만 T점수 밴드에서 파생한다(levelOf).
// DB 전환 시: SEED 를 API 응답으로 바꾸면 화면은 그대로 나간다.
//
// ⚠ 아직 응시하지 않은 학생의 결과가 seed 에 미리 들어 있을 수 있다(예: jiwoo).
//   채점 엔진이 없어서(PROCESS.md §9) "응시하면 나올 값"을 미리 적어 두는 것이며,
//   students.diagnosisOutcome 과 같은 이유·같은 성격의 임시 장치다.
//   결과 화면은 응시 완료(dc_diag_attempts) 전에는 열리지 않으므로 새어 나가지 않는다.
//   채점이 붙으면 이 선적재분을 지우고 응시 결과가 그 자리를 대신한다.
// ─────────────────────────────────────────────────────────────────────────────
import seed from './diagnosisResults.seed.json'
import type { DiagnosisResult, FactorScore } from './schema/diagnosisResult'
import { levelOf, type FactorLevel } from './schema/diagnosisResult'
import { getModuleByTestId, type DiagnosisFactorDef, type DiagnosisModule } from './careerProcess'

export type { DiagnosisResult, FactorScore, FactorLevel }
export { levelOf }

export const DIAGNOSIS_RESULTS: DiagnosisResult[] = seed as DiagnosisResult[]

/** (학생 · 검사 · 회차) → 상세 결과. 회차를 생략하면 최신 회차. */
export function getDiagnosisResult(
  studentId: string,
  testId: string,
  attemptNo?: number,
): DiagnosisResult | undefined {
  const mine = DIAGNOSIS_RESULTS.filter(r => r.studentId === studentId && r.testId === testId)
  if (mine.length === 0) return undefined
  if (attemptNo != null) return mine.find(r => r.attemptNo === attemptNo)
  return mine.reduce((latest, r) => (r.attemptNo > latest.attemptNo ? r : latest))
}

/** 한 학생의 모든 상세 결과 (검사 이력 비교용). 최신 응시가 앞. */
export function getResultsByStudent(studentId: string): DiagnosisResult[] {
  return DIAGNOSIS_RESULTS
    .filter(r => r.studentId === studentId)
    .sort((a, b) => b.testedAt.localeCompare(a.testedAt))
}

/** 결과표 한 행 — 요인 정의(careerProcess) × 점수(seed) 조인 결과 */
export interface ResultRow {
  name: string
  desc?: string
  tScore: number
  level: FactorLevel
}

/**
 * 결과표 행 목록.
 * 행의 순서·이름은 검사 정의(DIAGNOSIS_MODULES[].factors)가 정하고,
 * 점수는 응시 결과에서 이름으로 join 한다 — 점수만 있고 정의에 없는 요인은 버린다.
 */
export function getResultRows(result: DiagnosisResult, module?: DiagnosisModule): ResultRow[] {
  const mod = module ?? getModuleByTestId(result.testId)
  const scoreOf = new Map(result.factors.map(f => [f.name, f.tScore]))
  const defs: DiagnosisFactorDef[] = mod?.factors ?? result.factors.map(f => ({ name: f.name }))

  return defs
    .filter(d => scoreOf.has(d.name))
    .map(d => {
      const tScore = scoreOf.get(d.name)!
      return { name: d.name, desc: d.desc, tScore, level: levelOf(tScore) }
    })
}
