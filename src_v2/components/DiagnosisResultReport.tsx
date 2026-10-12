import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { loadStudentDiagnoses } from '../../shared/diagnosisStore'
import { getModuleByTestId, type DiagnosisModule } from '../data/careerProcess'
import { getDiagnosisResult, getResultRows, type DiagnosisResult } from '../data/diagnosisResults'
import './DiagnosisResultReport.css'
import AiCommentCard from '../../shared/AiCommentCard'
import DiagnosisRadar from './DiagnosisRadar'
import DiagnosisScoreTable from './DiagnosisScoreTable'
import { getDiagnosisChartSections, summaryLevel } from '../data/diagnosisChart'

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

const DIAGNOSIS_COLORS: Record<string, number> = { ccore: 1, c2: 2, c3: 3, c4: 4 }
const DIAGNOSIS_PALETTE: Record<number, [string, string]> = {
  1: ['#7c5cfc', '#f0edff'], 2: ['#356dff', '#eaf0ff'],
  3: ['#20b486', '#e5f8f2'], 4: ['#f5a524', '#fff6df'],
}

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
  /** 이력 비교에서는 코멘트를 펼칠 때만 조회한다. */
  collapseComments?: boolean
  /** 이력 카드에서는 좁은 화면에서도 실제 축명을 그래프에 표시한다. */
  namedChartAxes?: boolean
  /** 회차 헤더가 있는 전체 이력에서는 중복 결과 배너를 생략한다. */
  showBanner?: boolean
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
  collapseComments = false,
  namedChartAxes = false,
  showBanner = true,
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
      '--drr-accent': `var(--diagnosis-${color}, ${DIAGNOSIS_PALETTE[color][0]})`,
      '--drr-accent-soft': `var(--diagnosis-${color}-soft, ${DIAGNOSIS_PALETTE[color][1]})`,
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
  const sections = showChart ? getDiagnosisChartSections(found, rows).map(section => ({ ...section,
    rows: found.source === 'hrtest' ? section.rows.map(row => ({ ...row, level: summaryLevel(row.tScore) })) : section.rows,
  })) : [{ id: found.testId, axes: [], rows }]


  return (
    <div className="drr" style={style}>
      {(found.source?.includes('fixture') || found.source?.startsWith('development:')) && <p className="drr-empty">기존 개발 검증 이력입니다. 실제 검사 결과가 아닙니다.</p>}
      {found.needsReview && <p role="status" className="drr-empty">유형 확인이 필요합니다. 점수는 보존하며 유형 확정·후속 검사 배정·AI 분석은 보류합니다. 담당자에게 확인해 주세요.</p>}
      {module?.factors.length === 0 && <p className="drr-empty">결과표 항목은 추가 예정입니다.</p>}
      {showBanner && <div className="drr-banner">
        <span className="drr-banner-headline">{missing.length || module?.factors.length === 0 ? '결과 항목 확인 필요' : found.headline}</span>
        <span className="drr-banner-copy">
          <b>{missing.length ? '현재 항목 기준 점수 미등록' : found.headlineCaption}</b>
          <small>{found.testedAt} 실시 · {found.attemptNo}회차</small>
        </span>
      </div>}

      {sections.map(section => <section className="drr-result-section" key={section.id}>
      {section.title && <header className="drr-section-heading"><h3>{section.title}</h3>{section.type && <strong>{section.type}</strong>}</header>}
      <div className={section.axes.length >= 3 ? 'drr-analysis' : undefined}>
      {section.axes.length >= 3 && <DiagnosisRadar axes={section.axes} averaged={found.testId === 'ccore'} areaAverage={found.testId === 'c3'} namedAxes={namedChartAxes} />}
      <DiagnosisScoreTable key={`${found.studentId}:${found.testId}:${found.attemptNo}:${section.id}`}
        result={found} rows={[...section.rows, ...missing.map(factor => ({ name: factor.name, desc: factor.desc, tScore: null, level: '미등록' as const }))]}
        detailRows={section.detailRows} showFactorDesc={showFactorDesc} />
      </div>
      </section>)}
      {missing.length > 0 && <p className="drr-empty">현재 항목에 대응하는 점수가 없습니다. 이전 예시 점수는 새 항목으로 환산하지 않습니다.</p>}

      <ResultComments key={`${found.studentId}:${found.testId}:${found.attemptNo}`} collapsed={collapseComments}>
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
      {found.needsReview && <p className="drr-table-note">유형 확인 후 AI 코멘트를 확인할 수 있습니다.</p>}
      </ResultComments>
    </div>
  )
}

function ResultComments({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(false)
  if (!collapsed) return <>{children}</>
  return <details className="drr-comment-disclosure" onToggle={event => { if (event.currentTarget.open) setVisited(true) }}>
    <summary>AI 코멘트 · 해석 보기</summary>
    {visited && children}
  </details>
}
