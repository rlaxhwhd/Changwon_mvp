// PostgreSQL에서 조회한 완료 진단 결과의 공유 셀렉터.
// 항목 정의와 점수는 고정 코드로 연결하며 예시 숫자를 새 항목으로 환산하지 않는다.
import { diagnosisResults } from '../../shared/diagnosisStore'
import type { DiagnosisResult, FactorScore } from './schema/diagnosisResult'
import { levelOf, type FactorLevel } from './schema/diagnosisResult'
import { getModuleByTestId, type DiagnosisFactorDef, type DiagnosisModule } from './careerProcess'

export type { DiagnosisResult, FactorScore, FactorLevel }
export { levelOf }

export const DIAGNOSIS_RESULTS: DiagnosisResult[] = diagnosisResults

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
  level: FactorLevel | '미등록'
}

/**
 * 결과표 행 목록.
 * 행의 순서·이름은 검사 정의(DIAGNOSIS_MODULES[].factors)가 정하고,
 * 점수는 응시 결과에서 이름으로 join 한다 — 점수만 있고 정의에 없는 요인은 버린다.
 */
export function getResultRows(result: DiagnosisResult, module?: DiagnosisModule): ResultRow[] {
  const mod = module ?? getModuleByTestId(result.testId)
  const scoreOf = new Map(result.factors.map(f => [f.factorCode ?? f.name, f.tScore]))
  const defs: DiagnosisFactorDef[] = mod?.factors ?? result.factors.map(f => ({ name: f.name }))

  return defs
    .filter(d => scoreOf.has(d.code ?? d.name) || scoreOf.has(d.name))
    .map(d => {
      const tScore = (scoreOf.get(d.code ?? d.name) ?? scoreOf.get(d.name))!
      const supplied = result.factors.find(f => (d.code && f.factorCode === d.code) || f.name === d.name)?.level
      return { name: d.name, desc: d.desc, tScore, level: supplied ?? (['c2','c3','c4'].includes(result.testId) ? '미등록' : levelOf(tScore)) }
    })
}
