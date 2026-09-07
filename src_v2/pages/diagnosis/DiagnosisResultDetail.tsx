import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CRAReport from '../../components/CRAReport'
import DiagnosisResultReport from '../../components/DiagnosisResultReport'
import { getActiveStudent } from '../../data/students'
import { getModuleByTestId } from '../../data/careerProcess'
import { getDiagnosisResult, getResultRows, type FactorLevel } from '../../data/diagnosisResults'
import './DiagnosisResultDetail.css'
import { usePageHead } from '../../components/PageCrumb'

// ─────────────────────────────────────────────────────────────────────────────
// 진단 결과 상세 (학생) — 요인 레이더 + 결과표.
//
// 요인은 검사가 정한다(careerProcess.DIAGNOSIS_MODULES[].factors). C-CORE 는 4개다:
// 진로명확성 · 역량준비도 · 취업준비도 · 진로동기. 점수는 응시 결과(diagnosisResults)가
// 주는 T점수를 그대로 쓴다 — 화면에서 계산하지 않는다(CLAUDE.md 14조).
//
// 표·코멘트는 상담사 포털과 공유하는 DiagnosisResultReport 가 그린다. 여기서 다시
// 만들지 않는다(재생성 금지) — 같은 검사 결과가 두 화면에서 달라지면 안 된다.
// ─────────────────────────────────────────────────────────────────────────────

/** T점수 만점. 레이더 반지름과 눈금이 이 값을 기준으로 그려진다. */
const T_MAX = 100

/** 수준 → 색 클래스. 결과표(DiagnosisResultReport)와 같은 이름·같은 뜻을 쓴다. */
const LEVEL_CLASS: Record<FactorLevel, string> = { 낮음: 'low', 보통: 'mid', 높음: 'high' }

/* ── 홀로그램 레이더 차트 (Main 스타일 SVG) ──────────────────────── */
function HoloRadar({ axes }: { axes: { label: string; value: number }[] }) {
  const size = 280
  const cx = size / 2
  const cy = size / 2
  const r = 104
  const n = axes.length

  const pt = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    }
  }

  const gridLevels = [0.25, 0.5, 0.75, 1.0]
  const dataPoints = axes.map((ax, i) => pt(i, ax.value))
  const dataPath = dataPoints.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'
  const outerPath = axes.map((_, i) => {
    const p = pt(i, 1)
    return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
  }).join(' ') + ' Z'

  // 축이 4개면 좌·우 라벨이 정확히 수평 끝에 놓여 그림 밖으로 밀린다("역량준비도"가 잘림).
  // 라벨이 차지할 만큼 가로 여백을 두고 그린다.
  const padX = 62

  return (
    <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} className="dr-radar-svg">
      <defs>
        {/* 홀로그램 메인 그라데이션 */}
        <linearGradient id="dr-holo-main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#7B6EFF" stopOpacity="0.9" />
          <stop offset="30%"  stopColor="#4A90FF" stopOpacity="0.85" />
          <stop offset="60%"  stopColor="#00D4FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.9" />
        </linearGradient>
        {/* 광택 오버레이 */}
        <linearGradient id="dr-holo-sheen" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="40%"  stopColor="#C4B5FD" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.25" />
        </linearGradient>
        {/* 방사형 내부 광원 */}
        <radialGradient id="dr-holo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="60%"  stopColor="#818CF8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
        </radialGradient>
        {/* 외곽 글로우 필터 */}
        <filter id="dr-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 배경 다각형 틴트 */}
      <path d={outerPath} fill="url(#dr-holo-main)" fillOpacity="0.06" />

      {/* 그리드 링 — T점수 눈금. 0.5(=50점)가 평균선이라 그 링을 강조한다. */}
      {gridLevels.map((lv, li) => (
        <polygon key={li}
          points={axes.map((_, i) => { const p = pt(i, lv); return `${p.x},${p.y}` }).join(' ')}
          fill="none"
          stroke={lv === 0.5 ? '#A5B4FC' : '#C7D2FE'}
          strokeWidth={lv === 0.5 ? 1.2 : 0.8}
          strokeDasharray={lv === 0.5 ? '3 3' : undefined}
          strokeOpacity={lv === 0.5 ? 0.9 : 0.5}
        />
      ))}

      {/* 축 */}
      {axes.map((_, i) => {
        const o = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke="#C7D2FE" strokeWidth="0.8" strokeOpacity="0.6" />
      })}

      {/* 눈금 숫자 — 만점이 100 이라는 것이 차트 안에서 읽혀야 한다 */}
      {gridLevels.map(lv => (
        <text key={`tick-${lv}`} x={cx + 5} y={cy - r * lv} dominantBaseline="middle"
          fontSize="10" fill="#9AA3B2" fontFamily="Pretendard, sans-serif">
          {lv * T_MAX}
        </text>
      ))}

      {/* 홀로그램 데이터 채우기 */}
      <path d={dataPath} fill="url(#dr-holo-main)" fillOpacity="0.55" />
      <path d={dataPath} fill="url(#dr-holo-sheen)" />
      <path d={dataPath} fill="url(#dr-holo-glow)" />

      {/* 외곽선 — 글로우 */}
      <path d={dataPath} fill="none" stroke="#818CF8" strokeWidth="3.5" strokeOpacity="0.3" filter="url(#dr-glow-filter)" />
      <path d={dataPath} fill="none" stroke="url(#dr-holo-main)" strokeWidth="1.8" />

      {/* 꼭짓점 도트 */}
      {dataPoints.map(({ x, y }, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill="#7B6EFF" fillOpacity="0.25" />
          <circle cx={x} cy={y} r="3" fill="url(#dr-holo-main)" />
        </g>
      ))}

      {/* 라벨 */}
      {axes.map((ax, i) => {
        const { x, y } = pt(i, 1.2)
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
            fontSize="13" fill="#4B5563" fontFamily="Pretendard, sans-serif" fontWeight="700">
            {ax.label}
          </text>
        )
      })}
    </svg>
  )
}

export default function DiagnosisResultDetail() {
  const navigate = useNavigate()
  const { testId = 'ccore' } = useParams()
  const student = getActiveStudent()
  const module = getModuleByTestId(testId)
  const testName = module?.name ?? '진단 검사'

  const result = getDiagnosisResult(student.id, testId)
  const rows = result ? getResultRows(result, module) : []

  // 결과지 전체 보기 — CCORE 를 축으로 짜인 결과표라 핵심진단에서만 연다.
  const [reportOpen, setReportOpen] = useState(false)
  const hasFullReport = testId === 'ccore' && rows.length > 0

  // AI 분석은 '생성'이다 — 열자마자 보여주지 않고 버튼을 눌러야 만들어진다.
  // 한 번 만든 뒤에는 다시 접었다 펴도 재생성하지 않는다.
  const [aiOpen, setAiOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const runAnalysis = () => {
    if (analyzing) return
    if (analyzed) { setAiOpen(v => !v); return }
    setAnalyzing(true)
    window.setTimeout(() => { setAnalyzing(false); setAnalyzed(true); setAiOpen(true) }, 1400)
  }

  // 요약은 T점수에서 그대로 뽑는다 — 판정식을 새로 만들지 않는다(CLAUDE.md 14조).
  // 수준(낮음·보통·높음)도 levelOf 한 곳에서만 나온다.
  const avg = rows.length > 0 ? rows.reduce((sum, r) => sum + r.tScore, 0) / rows.length : 0
  const best = rows.length > 0 ? rows.reduce((m, r) => (r.tScore > m.tScore ? r : m)) : undefined
  const worst = rows.length > 0 ? rows.reduce((m, r) => (r.tScore < m.tScore ? r : m)) : undefined

  usePageHead(
    `${testName} 결과`,
    rows.length > 0
      ? `${rows.length}개 요인의 T점수입니다 · 만점 ${T_MAX}점 (평균 50)`
      : '아직 응시 결과가 등록되지 않았습니다',
  )

  return (
    <div className="dr-wrap">
      <div className="dr-header">
        <button className="dr-back-btn" onClick={() => navigate('/diagnosis/employment')} aria-label="뒤로 가기">
          <i className="fa-solid fa-arrow-left" />
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="dr-card">
          <DiagnosisResultReport studentId={student.id} testId={testId} />
        </div>
      ) : (
        <div className="dr-grid">
          <div className="dr-card">
            <div className="dr-card-head">
              <h2><i className="fa-solid fa-chart-area" /> 요인별 T점수</h2>
              <span className="dr-scale-note">만점 {T_MAX}점 · 평균 50</span>
            </div>

            <div className="dr-radar-box">
              <HoloRadar axes={rows.map(r => ({ label: r.name, value: r.tScore / T_MAX }))} />
            </div>

            <div className="dr-ai-toggle">
              <button
                className={aiOpen ? 'dr-ai-btn is-ghost' : 'dr-ai-btn'}
                onClick={runAnalysis}
                disabled={analyzing}
                aria-expanded={aiOpen}
              >
                <i className={`fa-solid ${analyzing ? 'fa-spinner fa-spin' : 'fa-robot'}`} />
                {analyzing ? 'AI가 분석 중…' : `AI 분석결과 ${analyzed && aiOpen ? '접기' : '보기'}`}
              </button>
            </div>

            {aiOpen && !analyzing && best && worst && (
              <div className="dr-ai-panel">
                <div className="dr-ai-label"><i className="fa-solid fa-robot" /> AI 분석결과</div>

                <dl className="dr-ai-rows">
                  <div>
                    <dt>평균 T점수</dt>
                    <dd>
                      <b>{avg.toFixed(2)}</b>
                      <span>기준 평균 50점 대비 {avg >= 50 ? '+' : ''}{(avg - 50).toFixed(2)}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>강점 요인</dt>
                    <dd><b>{best.name}</b><span>{best.tScore.toFixed(2)} · {best.level}</span></dd>
                  </div>
                  <div>
                    <dt>보완 요인</dt>
                    <dd><b>{worst.name}</b><span>{worst.tScore.toFixed(2)} · {worst.level}</span></dd>
                  </div>
                </dl>

                <div className="dr-level-chips">
                  {rows.map(r => (
                    <span key={r.name} className={`dr-level-chip is-${LEVEL_CLASS[r.level]}`}>
                      {r.name} {r.level}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="dr-card">
            <div className="dr-card-head">
              <h2><i className="fa-solid fa-list-ol" /> 검사 결과표</h2>
              {hasFullReport && (
                <button className="dr-history-btn" onClick={() => setReportOpen(true)}>
                  <i className="fa-solid fa-file-lines" /> 결과지 전체 보기
                </button>
              )}
            </div>

            {/* 표·코멘트는 상담사 포털과 공유하는 단일 컴포넌트가 그린다 — 점수를 여기 박지 않는다. */}
            <DiagnosisResultReport result={result} showFactorDesc />
          </div>
        </div>
      )}

      {/* CRA 진로준비도 진단검사 결과표 */}
      <CRAReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        examDate={result?.testedAt ?? ''}
      />
    </div>
  )
}
