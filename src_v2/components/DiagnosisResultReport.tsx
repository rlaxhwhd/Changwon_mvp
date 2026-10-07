import { useEffect, useState, type CSSProperties } from 'react'
import { loadStudentDiagnoses } from '../../shared/diagnosisStore'
import { getModuleByTestId, type DiagnosisModule } from '../data/careerProcess'
import { getDiagnosisResult, getResultRows, type DiagnosisResult, type FactorLevel, type ResultRow } from '../data/diagnosisResults'
import './DiagnosisResultReport.css'
import AiCommentCard from '../../shared/AiCommentCard'
import DiagnosisRadar from './DiagnosisRadar'
import { getDiagnosisChartSections } from '../data/diagnosisChart'

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

const LEVEL_CLASS: Record<FactorLevel | '미등록', string> = { 매우낮음:'low', 낮음: 'low', 보통: 'mid', 높음: 'high', 매우높음:'high', 미등록: '' }
const DIAGNOSIS_COLORS: Record<string, number> = { ccore: 1, c2: 2, c3: 3, c4: 4 }

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
  /** Student result page: chart on the left, compact score table on the right. */
  showChart?: boolean
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
  showChart = false,
}: DiagnosisResultReportProps) {
  const [loaded, setLoaded] = useState<{ studentId: string; error?: string } | null>(null)
  const loading = !result && !!studentId && loaded?.studentId !== studentId
  const loadError = loaded?.studentId === studentId ? loaded?.error : undefined
  useEffect(() => {
    if (result || !studentId) return
    let cancelled=false
    loadStudentDiagnoses(studentId).then(() => { if (!cancelled) setLoaded({ studentId }) })
      .catch(e => { if (!cancelled) setLoaded({ studentId, error: e.message }) })
    return () => { cancelled=true }
  },[result,studentId])
  const found: DiagnosisResult | undefined =
    result ?? (studentId && testId ? getDiagnosisResult(studentId, testId, attemptNo) : undefined)

  const color = showChart ? DIAGNOSIS_COLORS[found?.testId ?? testId ?? ''] : undefined
  const style: CSSProperties = {
    ...(color ? {
      '--drr-accent': `var(--diagnosis-${color}, #7C5CFC)`,
      '--drr-accent-soft': `var(--diagnosis-${color}-soft, #F0EDFF)`,
    } : {}),
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
  const missing = found.source === 'hrtest' ? [] : module?.factors.filter(factor => !rows.some(row => row.name === factor.name)) ?? []
  const sections = showChart ? getDiagnosisChartSections(found, rows) : [{ id: found.testId, axes: [], rows }]

  const renderTable = (tableRows: ResultRow[]) => (
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
            {tableRows.map(r => (
              <tr key={r.name}>
                <td className="drr-factor">
                  {r.name}
                  {(showFactorDesc || found.testId === 'c3') && r.desc && <small>{r.desc}</small>}
                </td>
                <td className="mid">
                  <span className={`drr-level ${LEVEL_CLASS[r.level]}`}>{r.level}</span>
                </td>
                <td className="num">
                  <span className="drr-score">{r.tScore == null ? '점수 없음' : r.tScore.toFixed(2)}</span>
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
  )

  return (
    <div className="drr" style={style}>
      {(found.source?.includes('fixture') || found.source?.startsWith('development:')) && <p className="drr-empty">기존 개발 검증 이력입니다. 실제 검사 결과가 아닙니다.</p>}
      {found.source === 'hrtest' && <p className={showChart ? 'drr-source-note' : 'drr-empty'}>검사기관에서 수신한 실제 결과입니다. 결과표의 점수와 수준은 제공된 값을 그대로 표시합니다.</p>}
      {found.needsReview && <p role="status" className="drr-empty">유형 확인이 필요합니다. 점수는 보존하며 유형 확정·후속 검사 배정·AI 분석은 보류합니다. 담당자에게 확인해 주세요.</p>}
      {module?.factors.length === 0 && <p className="drr-empty">결과표 항목은 추가 예정입니다.</p>}
      <div className="drr-banner">
        <span className="drr-banner-headline">{missing.length || module?.factors.length === 0 ? '결과 항목 확인 필요' : found.headline}</span>
        <span className="drr-banner-copy">
          <b>{missing.length ? '현재 항목 기준 점수 미등록' : found.headlineCaption}</b>
          <small>{found.testedAt} 실시{found.attemptNo > 1 && ` · ${found.attemptNo}회차`}</small>
        </span>
      </div>

      {sections.map(section => <section className="drr-result-section" key={section.id}>
      {section.title && <header className="drr-section-heading"><h3>{section.title}</h3>{section.type && <strong>{section.type}</strong>}</header>}
      <div className={section.axes.length >= 3 ? 'drr-analysis' : undefined}>
      {section.axes.length >= 3 && <DiagnosisRadar axes={section.axes} averaged={found.testId === 'ccore'} areaAverage={found.testId === 'c3'} />}
      {renderTable(section.rows)}
      </div>
      {!!section.detailRows?.length && <details className="drr-details" key={`${found.studentId}:${found.testId}:${found.attemptNo}:${section.id}`}>
        <summary><span className="drr-details-show">상세보기</span><span className="drr-details-hide">상세 접기</span><small>하위 항목 {section.detailRows.length}개</small></summary>
        {renderTable(section.detailRows)}
      </details>}
      </section>)}
      {missing.length > 0 && <p className="drr-empty">현재 항목에 대응하는 점수가 없습니다. 이전 예시 점수는 새 항목으로 환산하지 않습니다.</p>}

      {found.comment && missing.length === 0 && rows.length > 0 && (
        <aside className="drr-comment">
          <span className="drr-comment-icon"><SparkIcon /></span>
          <div className="drr-comment-body">
            <b>저장된 해석 코멘트</b>
            <p>{found.comment}</p>
          </div>
        </aside>
      )}
      {!found.needsReview && <AiCommentCard studentId={studentId ?? found.studentId} kind="diagnosis" testId={found.testId} attemptNo={found.attemptNo} />}
    </div>
  )
}
