import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'
import Modal from '../../components/Modal'
import CRAReport from '../../components/CRAReport'
import './DiagnosisResultDetail.css'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface Core {
  name: string
  score: number
  color: string
  detail: string
  subItems: { name: string; score: number }[]
  suggestion: string
}

const cores: Core[] = [
  { name: '의사소통', score: 78, color: '#2E5BFF', detail: '타인의 의견을 경청하고 자신의 생각을 명확하게 전달하는 능력입니다. 문서 작성, 발표, 토론 등 다양한 소통 역량을 평가합니다.', subItems: [{ name: '경청능력', score: 82 }, { name: '문서작성', score: 75 }, { name: '발표능력', score: 70 }, { name: '토론능력', score: 85 }], suggestion: '발표/프레젠테이션 비교과 활동에 참여하여 실전 경험을 쌓으세요.' },
  { name: '문제해결', score: 82, color: '#3B82F6', detail: '복잡한 상황에서 문제를 분석하고 창의적으로 해결하는 능력입니다. 논리적 사고와 분석력을 포함합니다.', subItems: [{ name: '분석력', score: 85 }, { name: '논리적사고', score: 88 }, { name: '창의적해결', score: 72 }, { name: '의사결정', score: 83 }], suggestion: '해커톤이나 공모전 참여로 실전 문제 해결 경험을 쌓으세요.' },
  { name: '자기관리', score: 70, color: '#22C55E', detail: '목표를 설정하고 체계적으로 실행하며, 시간과 자원을 효율적으로 관리하는 능력입니다.', subItems: [{ name: '목표설정', score: 75 }, { name: '시간관리', score: 68 }, { name: '스트레스관리', score: 65 }, { name: '자기개발', score: 72 }], suggestion: '일정 관리 앱을 활용한 체계적 시간관리 습관을 만드세요.' },
  { name: '대인관계', score: 65, color: '#F59E0B', detail: '다양한 사람들과 원만한 관계를 형성하고 유지하며, 갈등 상황을 건설적으로 해결하는 능력입니다.', subItems: [{ name: '협동능력', score: 70 }, { name: '갈등관리', score: 58 }, { name: '네트워킹', score: 60 }, { name: '공감능력', score: 72 }], suggestion: '팀 프로젝트와 동아리 활동으로 대인관계 역량을 강화하세요.' },
  { name: '정보활용', score: 88, color: '#2E5BFF', detail: '디지털 도구와 정보 기술을 활용하여 필요한 정보를 수집, 분석, 활용하는 능력입니다.', subItems: [{ name: '정보수집', score: 90 }, { name: '정보분석', score: 88 }, { name: '디지털활용', score: 92 }, { name: '정보윤리', score: 82 }], suggestion: '데이터 분석 관련 자격증 취득으로 역량을 공인받으세요.' },
  { name: '글로벌', score: 35, color: '#EF4444', detail: '외국어 능력과 다문화 이해를 바탕으로 글로벌 환경에서 소통하고 협업하는 능력입니다.', subItems: [{ name: '외국어능력', score: 25 }, { name: '다문화이해', score: 45 }, { name: '글로벌감각', score: 40 }, { name: '국제협력', score: 30 }], suggestion: 'TOEIC 700점 이상 취득과 국제 교류 프로그램 참여를 최우선으로 추진하세요.' },
  { name: '리더십', score: 60, color: '#F59E0B', detail: '조직을 이끌고 구성원의 역량을 이끌어내며, 공동의 목표를 달성하는 능력입니다.', subItems: [{ name: '비전제시', score: 55 }, { name: '동기부여', score: 62 }, { name: '팀빌딩', score: 65 }, { name: '책임감', score: 58 }], suggestion: '학생회, 동아리 임원 활동을 통해 리더십 경험을 쌓으세요.' },
  { name: '창의융합', score: 72, color: '#3B82F6', detail: '다양한 분야의 지식을 융합하여 새로운 아이디어를 창출하고 혁신적으로 사고하는 능력입니다.', subItems: [{ name: '융합적사고', score: 75 }, { name: '아이디어발상', score: 78 }, { name: '혁신추구', score: 65 }, { name: '유연성', score: 70 }], suggestion: '타 전공 수업 수강이나 융합 프로젝트 참여를 권장합니다.' },
  { name: '직업윤리', score: 75, color: '#22C55E', detail: '직업에 대한 올바른 가치관과 윤리의식을 갖추고, 성실하고 책임감 있게 행동하는 능력입니다.', subItems: [{ name: '성실성', score: 80 }, { name: '책임의식', score: 78 }, { name: '준법정신', score: 72 }, { name: '직업관', score: 70 }], suggestion: '봉사활동과 멘토링 프로그램에 참여하여 직업윤리 의식을 높이세요.' },
]

const historyData = [
  { date: '2026-03-15', label: '3차 검사', scores: [78, 82, 70, 65, 88, 35, 60, 72, 75] },
  { date: '2025-09-20', label: '2차 검사', scores: [72, 75, 65, 60, 82, 30, 55, 68, 70] },
  { date: '2025-03-10', label: '1차 검사', scores: [65, 68, 58, 55, 75, 20, 48, 60, 62] },
]

const TEST_NAMES: Record<string, string> = {
  '9core': '9CORE 검사',
  psychology: '심리검사',
  cares: 'CARES 검사',
  job: '직무역량검사',
  aptitude: '직업적성검사',
}

const scoreLevel = (s: number) => (s >= 80 ? 'high' : s >= 60 ? 'mid' : 'low')
// 막대그래프 색상: 0~40 빨강 / 41~70 초록 / 71~100 파랑
const barColor = (s: number) => (s >= 71 ? '#2E5BFF' : s >= 41 ? '#22C55E' : '#EF4444')

/* ── 홀로그램 레이더 차트 (Main 스타일 SVG) ──────────────────────── */
function HoloRadar({ axes }: { axes: { label: string; value: number }[] }) {
  const size = 280
  const cx = size / 2
  const cy = size / 2
  const r = 82
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

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px]">
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

      {/* 그리드 링 */}
      {gridLevels.map((lv, li) => (
        <polygon key={li}
          points={axes.map((_, i) => { const p = pt(i, lv); return `${p.x},${p.y}` }).join(' ')}
          fill="none"
          stroke={lv === 1 ? '#A5B4FC' : '#C7D2FE'}
          strokeWidth={lv === 1 ? 1.2 : 0.8}
          strokeOpacity={lv === 1 ? 0.7 : 0.5}
        />
      ))}

      {/* 축 */}
      {axes.map((_, i) => {
        const o = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke="#C7D2FE" strokeWidth="0.8" strokeOpacity="0.6" />
      })}

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
        const { x, y } = pt(i, 1.24)
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
            fontSize="10" fill="#4B5563" fontFamily="Pretendard, sans-serif" fontWeight="600">
            {ax.label}
          </text>
        )
      })}
    </svg>
  )
}

export default function DiagnosisResultDetail() {
  const navigate = useNavigate()
  const { testId = '9core' } = useParams()
  const testName = TEST_NAMES[testId] ?? '9CORE 검사'

  const [abilityModal, setAbilityModal] = useState<number | null>(null)
  const [historyModal, setHistoryModal] = useState(false)
  const [craDate, setCraDate] = useState<string | null>(null)
  const [showAi, setShowAi] = useState(true)

  const avg = Math.round(cores.reduce((a, c) => a + c.score, 0) / cores.length)
  const ability = abilityModal !== null ? cores[abilityModal] : null
  const lowest = cores.reduce((min, c) => (c.score < min.score ? c : min))
  const strong = cores.filter(c => c.score >= 80).map(c => `${c.name}(${c.score}점)`).join(', ') || '없음'
  const weak = cores.filter(c => c.score < 60).map(c => `${c.name}(${c.score}점)`).join(', ') || '없음'

  const radarOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, font: { size: 10 } },
        pointLabels: { font: { size: 11, family: 'Pretendard' } },
      },
    },
    plugins: { legend: { display: false } },
  }

  const historyRadarData: ChartData<'radar'> = {
    labels: cores.map(c => c.name),
    datasets: historyData.map((h, i) => ({
      label: h.label,
      data: h.scores,
      backgroundColor: i === 0 ? 'rgba(46,91,255,.18)' : 'transparent',
      borderColor: i === 0 ? '#2E5BFF' : i === 1 ? '#22C55E' : '#F59E0B',
      borderWidth: i === 0 ? 2 : 1.5,
      borderDash: i === 0 ? [] : [5, 5],
      pointBackgroundColor: i === 0 ? '#2E5BFF' : i === 1 ? '#22C55E' : '#F59E0B',
      pointRadius: i === 0 ? 4 : 3,
    })),
  }

  const historyRadarOptions: ChartOptions<'radar'> = {
    ...radarOptions,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { font: { size: 11, family: 'Pretendard' } },
      },
    },
  }

  return (
    <div className="dr-wrap">
      {/* 헤더 */}
      <div className="dr-header">
        <button className="dr-back-btn" onClick={() => navigate('/diagnosis/result')} aria-label="뒤로 가기">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <div>
          <h1>{testName} 결과</h1>
          <p>9개 핵심 역량 검사 결과입니다 · 평균 <strong>{avg}점</strong></p>
        </div>
      </div>

      <div className="dr-grid">
        {/* 레이더 차트 카드 */}
        <div className="dr-card">
          <div className="dr-card-head">
            <h2><i className="fa-solid fa-chart-area" /> 9CORE 레이더 차트</h2>
            <button className="dr-history-btn" onClick={() => setHistoryModal(true)}>
              <i className="fa-solid fa-clock-rotate-left" /> 검사 이력
            </button>
          </div>

          <div className="flex items-center justify-center py-3">
            <HoloRadar axes={cores.map(c => ({ label: c.name, value: c.score / 100 }))} />
          </div>

          <div className="dr-ai-toggle">
            <button
              className={showAi ? 'dr-ai-btn dr-ai-btn--ghost' : 'dr-ai-btn'}
              onClick={() => setShowAi(v => !v)}
            >
              <i className="fa-solid fa-robot" /> AI 평가분석 {showAi ? '접기' : '보기'}
            </button>
          </div>

          {showAi && (
            <div className="dr-ai-box">
              <div className="dr-ai-label"><i className="fa-solid fa-robot" /> AI 역량 평가 분석</div>
              <p>
                김채원님의 {testName} 역량 평균 점수는 <strong>{avg}점</strong>으로
                {avg >= 75 ? ' 양호한 수준입니다.' : avg >= 60 ? ' 보통 수준으로 일부 보완이 필요합니다.' : ' 전반적인 역량 강화가 필요합니다.'}
              </p>
              <p>
                <strong>강점 역량:</strong> {strong}<br />
                <strong>보완 역량:</strong> {weak}
              </p>
              <p>
                <strong>종합 제언:</strong> {lowest.name} 역량이 {lowest.score}점으로 가장 낮습니다. {lowest.suggestion}
              </p>
              <div className="dr-tag-row">
                {cores.map(c => (
                  <span key={c.name} className={`dr-tag dr-tag--${scoreLevel(c.score)}`}>
                    {c.name} {c.score}점
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 역량별 점수 카드 */}
        <div className="dr-card">
          <div className="dr-card-head">
            <h2><i className="fa-solid fa-list-ol" /> 역량별 점수</h2>
          </div>
          <div className="dr-score-list">
            {cores.map((c, i) => (
              <button key={c.name} className="dr-score-item" onClick={() => setAbilityModal(i)}>
                <div className="dr-score-row">
                  <span className="dr-score-name">
                    {c.name} <i className="fa-solid fa-chevron-right" />
                  </span>
                  <span className="dr-score-num" style={{ color: barColor(c.score) }}>{c.score}점</span>
                </div>
                <div className="dr-bar">
                  <span className="dr-bar-fill" style={{ width: `${c.score}%`, background: barColor(c.score) }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 역량 상세 모달 */}
      <Modal
        open={abilityModal !== null}
        onClose={() => setAbilityModal(null)}
        title={ability ? `${ability.name} 상세 분석` : ''}
        size="md"
      >
        {ability && (
          <div>
            <div className="dr-modal-score">
              <div className="dr-modal-score-num" style={{ color: barColor(ability.score) }}>{ability.score}점</div>
              <span className={`dr-badge dr-badge--${scoreLevel(ability.score)}`}>
                {ability.score >= 80 ? '우수' : ability.score >= 60 ? '보통' : '보완필요'}
              </span>
            </div>

            <div className="dr-detail-section">
              <div className="dr-detail-title">역량 설명</div>
              <p className="dr-detail-text">{ability.detail}</p>
            </div>

            <div className="dr-detail-section">
              <div className="dr-detail-title">세부 항목</div>
              {ability.subItems.map(s => (
                <div key={s.name} className="dr-sub-item">
                  <div className="dr-score-row">
                    <span className="dr-sub-name">{s.name}</span>
                    <span className="dr-score-num" style={{ color: barColor(s.score) }}>{s.score}점</span>
                  </div>
                  <div className="dr-bar">
                    <span className="dr-bar-fill" style={{ width: `${s.score}%`, background: barColor(s.score) }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="dr-ai-box">
              <div className="dr-ai-label"><i className="fa-solid fa-lightbulb" /> AI 제안</div>
              <p>{ability.suggestion}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* 검사 이력 모달 */}
      <Modal
        open={historyModal}
        onClose={() => setHistoryModal(false)}
        title={`${testName} 이력`}
        size="lg"
      >
        <div className="dr-detail-section">
          <div className="dr-detail-title">검사 이력 비교 (레이더 차트)</div>
          <div className="dr-radar dr-radar--history">
            <Radar data={historyRadarData} options={historyRadarOptions} />
          </div>
          <div className="dr-legend">
            <span className="dr-legend-item" style={{ color: '#2E5BFF' }}><i className="fa-solid fa-circle" /> 3차 (현재)</span>
            <span className="dr-legend-item" style={{ color: '#22C55E' }}><i className="fa-solid fa-circle" /> 2차</span>
            <span className="dr-legend-item" style={{ color: '#F59E0B' }}><i className="fa-solid fa-circle" /> 1차</span>
          </div>
        </div>

        <div className="dr-detail-section">
          <div className="dr-detail-title">검사별 상세</div>
          {historyData.map(h => {
            const hAvg = Math.round(h.scores.reduce((a, b) => a + b, 0) / h.scores.length)
            return (
              <div key={h.date} className="dr-history-item">
                <div className="dr-history-top">
                  <span className="dr-history-label">{h.label}</span>
                  <div className="dr-history-meta">
                    <span className="dr-history-date">{h.date}</span>
                    <button className="dr-history-detail-btn" onClick={() => setCraDate(h.date)}>
                      <i className="fa-solid fa-file-lines" /> 결과 상세보기
                    </button>
                  </div>
                </div>
                <div className="dr-history-stats">
                  <span>평균 <strong>{hAvg}점</strong></span>
                  <span>최고 <strong>{Math.max(...h.scores)}점</strong></span>
                  <span>최저 <strong>{Math.min(...h.scores)}점</strong></span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="dr-ai-box">
          <div className="dr-ai-label"><i className="fa-solid fa-robot" /> AI 성장 분석</div>
          <p>
            1차 검사 대비 평균 점수가 <strong>12.4점 상승</strong>했습니다.
            특히 정보활용(+13점)과 문제해결(+14점) 역량이 크게 향상되었습니다.
            글로벌 역량은 여전히 보완이 필요한 영역입니다.
          </p>
        </div>
      </Modal>

      {/* CRA 진로준비도 진단검사 결과표 */}
      <CRAReport
        open={craDate !== null}
        onClose={() => setCraDate(null)}
        examDate={craDate ?? ''}
      />
    </div>
  )
}
