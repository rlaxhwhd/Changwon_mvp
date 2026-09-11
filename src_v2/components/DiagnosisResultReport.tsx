import { useEffect, useState, type CSSProperties } from 'react'
import { loadStudentDiagnoses } from '../../shared/diagnosisStore'
import { getModuleByTestId, type DiagnosisModule } from '../data/careerProcess'
import { getDiagnosisResult, getResultRows, type DiagnosisResult, type FactorLevel } from '../data/diagnosisResults'
import './DiagnosisResultReport.css'

// ─────────────────────────────────────────────────────────────────────────────
// 진단 상세 결과표 — 학생 포털(src_v2) · 교직원 포털(src_admin) 공용 컴포넌트.
//
// 어느 검사든(CCORE · C1~C6) 같은 구조로 그린다:
//   대표 결과 배너 → 요인별 [수준 · T점수] 표 → 해석 코멘트
// 행의 이름·순서는 검사 정의(careerProcess.DIAGNOSIS_MODULES[].factors)가 정하고,
// 점수는 응시 결과(diagnosisResults)가 준다 — 이 컴포넌트는 계산하지 않는다.
//
// 모달 껍데기(헤더·닫기·오버레이)는 호스트가 제공한다. 여기는 본문만 그린다.
//   학생  : <Modal> 안에 넣어 쓴다
//   상담사 : .diagnosis-modal 안에 넣어 쓴다
// ─────────────────────────────────────────────────────────────────────────────

const LEVEL_CLASS: Record<FactorLevel | '미등록', string> = { 낮음: 'low', 보통: 'mid', 높음: 'high', 미등록: '' }

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  )
}

export interface DiagnosisResultReportProps {
  /** 결과를 직접 넘기거나(우선), studentId+testId 로 조회하게 하거나 둘 중 하나 */
  result?: DiagnosisResult
  studentId?: string
  testId?: string
  /** 회차 — 생략하면 최신 회차 */
  attemptNo?: number
  /** 강조색 CSS 값 (예: 'var(--purple)'). 검사별로 다르게 주고 싶을 때만. */
  accent?: string
  /** 강조색의 옅은 배경 */
  accentSoft?: string
  /** 요인 설명을 요인명 아래에 함께 노출할지 (기본 false — 시안은 표만) */
  showFactorDesc?: boolean
  /** 결과가 없을 때 문구 */
  emptyMessage?: string
}

export default function DiagnosisResultReport({
  result,
  studentId,
  testId,
  attemptNo,
  accent,
  accentSoft,
  showFactorDesc = false,
  emptyMessage,
}: DiagnosisResultReportProps) {
  const [,setLoaded] = useState(0)
  const [loadError,setLoadError] = useState('')
  const [loading,setLoading] = useState(false)
  useEffect(() => {
    if (result || !studentId) return
    let cancelled=false
    setLoading(true); setLoadError('')
    loadStudentDiagnoses(studentId).then(() => { if (!cancelled) setLoaded(x => x + 1) })
      .catch(e => { if (!cancelled) setLoadError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled=true }
  },[result,studentId])
  const found: DiagnosisResult | undefined =
    result ?? (studentId && testId ? getDiagnosisResult(studentId, testId, attemptNo) : undefined)

  const style: CSSProperties = {
    ...(accent ? { '--drr-accent': accent } : {}),
    ...(accentSoft ? { '--drr-accent-soft': accentSoft } : {}),
  } as CSSProperties

  if (!found) {
    return (
      <div className="drr" style={style}>
        <p className="drr-empty">
          {loadError || (loading ? 'DB에서 결과를 조회 중입니다…' : emptyMessage ?? '이 검사의 상세 결과가 아직 등록되지 않았습니다.')}
          <br />
          검사를 완료하면 요인별 수준과 T점수가 이곳에 표시됩니다.
        </p>
      </div>
    )
  }

  const module: DiagnosisModule | undefined = getModuleByTestId(found.testId)
  const rows = getResultRows(found, module)
  const missing = module?.factors.filter(factor => !rows.some(row => row.name === factor.name)) ?? []

  return (
    <div className="drr" style={style}>
      {found.source?.includes('fixture') && <p className="drr-empty">기존 예시 데이터 기반의 개발 검증 결과입니다.</p>}
      {module?.factors.length === 0 && <p className="drr-empty">결과표 항목은 추가 예정입니다.</p>}
      <div className="drr-banner">
        <span className="drr-banner-headline">{missing.length || module?.factors.length === 0 ? '결과 항목 확인 필요' : found.headline}</span>
        <span className="drr-banner-copy">
          <b>{missing.length ? '현재 항목 기준 점수 미등록' : found.headlineCaption}</b>
          <small>{found.testedAt} 실시{found.attemptNo > 1 && ` · ${found.attemptNo}회차`}</small>
        </span>
      </div>

      <div className="drr-table-wrap">
        <table className="drr-table">
          <thead>
            <tr>
              <th scope="col">유형</th>
              <th scope="col" className="mid">수준</th>
              <th scope="col" className="num">T점수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name}>
                <td className="drr-factor">
                  {r.name}
                  {(showFactorDesc || found.testId === 'c3') && r.desc && <small>{r.desc}</small>}
                </td>
                <td className="mid">
                  <span className={`drr-level ${LEVEL_CLASS[r.level]}`}>{r.level}</span>
                </td>
                <td className="num">
                  <span className="drr-score">{r.tScore.toFixed(2)}</span>
                </td>
              </tr>
            ))}
            {missing.map(factor => <tr key={factor.name}>
              <td className="drr-factor">{factor.name}{factor.desc && <small>{factor.desc}</small>}</td>
              <td className="mid">미등록</td><td className="num">점수 미등록</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {missing.length > 0 && <p className="drr-empty">현재 항목에 대응하는 점수가 없습니다. 이전 예시 점수는 새 항목으로 환산하지 않습니다.</p>}

      {found.comment && missing.length === 0 && rows.length > 0 && (
        <aside className="drr-comment">
          <span className="drr-comment-icon"><SparkIcon /></span>
          <div className="drr-comment-body">
            <b>AI 코멘트</b>
            <p>{found.comment}</p>
          </div>
        </aside>
      )}
    </div>
  )
}
