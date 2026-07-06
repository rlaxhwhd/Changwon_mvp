import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import { getActiveStudent } from '../../data/students'
import {
  COUNSEL_RECORDS,
  COUNSEL_TOTAL,
  COUNSEL_DONE,
  COUNSEL_SCHEDULED,
  COUNSEL_RECENT_DATE,
  COUNSEL_TYPE_STATS,
} from '../../data/counsel'
import './CounselStatus.css'

// 게이지바 = 전체 상담 건수 대비 비율(%)로 의미를 명확히 한다.
const pctOf = (n: number) => Math.round((n / COUNSEL_TOTAL) * 100)

const stats = [
  { label: '총 상담 건수', value: `${COUNSEL_TOTAL}건`, color: 'blue', bar: 100 },
  { label: '완료', value: `${COUNSEL_DONE}건`, color: 'green', bar: pctOf(COUNSEL_DONE) },
  { label: '예정', value: `${COUNSEL_SCHEDULED}건`, color: 'purple', bar: pctOf(COUNSEL_SCHEDULED) },
  { label: '최근 상담', value: COUNSEL_RECENT_DATE, color: 'blue', bar: 0 },
]

const typeStats = COUNSEL_TYPE_STATS
const counselItems = COUNSEL_RECORDS

export default function CounselStatus() {
  const navigate = useNavigate()
  const student = getActiveStudent()

  // ── 전문가 코멘트 종합 분석: 기본 접힘 → 분석하기 클릭 → 로딩 → 결과 ──
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [reportOpen, setReportOpen] = useState(false)

  const handleAnalyze = () => {
    if (aiState !== 'idle') return
    setAiState('loading')
    window.setTimeout(() => setAiState('done'), 1800)
  }

  const targetRole = student.targetRole || 'IT 직무'

  return (
    <main className="cs-page">
      <section className="cs-hero">
        <button className="cs-back-btn" type="button" onClick={() => navigate('/main')}>
          홈으로
        </button>
        <div className="cs-hero-copy">
          <h1>상담현황</h1>
          <p>전문가 상담 내역과 AI 종합 분석을 확인하세요</p>
        </div>
      </section>

      <section className="cs-stats" aria-label="상담 요약">
        {stats.map((item) => (
          <article className="cs-stat-card" key={item.label}>
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              {item.bar > 0 && (
                <span className="cs-stat-bar" title={`전체 ${COUNSEL_TOTAL}건 중 ${item.bar}%`}>
                  <span style={{ width: `${item.bar}%` }} />
                </span>
              )}
            </div>
          </article>
        ))}
      </section>
      <p className="cs-stats-note">게이지바는 전체 상담 {COUNSEL_TOTAL}건 대비 비율입니다.</p>

      <section className="cs-panel">
        <h2>
          상담 유형별 분포
        </h2>
        <div className="cs-type-grid">
          {typeStats.map((item) => (
            <article className={`cs-type-card cs-type-card--${item.color}`} key={item.label}>
              <div>
                <p>{item.label}</p>
                <strong>{item.count}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cs-panel cs-history">
        <div className="cs-panel-head">
          <h2>
            상담 내역
          </h2>
          <span>카드를 클릭하면 상세 코멘트를 볼 수 있습니다</span>
        </div>

        <div className="cs-list">
          {counselItems.map((item) => (
            <button className="cs-row" type="button" key={`${item.type}-${item.date}`}>
              <div className="cs-row-main">
                <div className="cs-row-title">
                  <strong>{item.type}</strong>
                  <span className={`cs-status cs-status--${item.statusTone}`}>{item.status}</span>
                </div>
                <p className="cs-counselor">{item.counselor}</p>
                <p className="cs-description">{item.description}</p>
                <div className="cs-tags">
                  {item.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
              <time className="cs-date">
                <strong>{item.date}</strong>
                <span>{item.time}</span>
              </time>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-panel cs-ai">
        <div className="cs-panel-head">
          <h2>전문가 코멘트 종합 분석</h2>
          {aiState === 'done' && (
            <button type="button" onClick={() => setReportOpen(true)}>
              전체 리포트
            </button>
          )}
        </div>

        {aiState === 'idle' && (
          <div className="cs-ai-collapsed">
            <div className="cs-ai-collapsed-icon"><i className="fa-solid fa-robot" /></div>
            <div className="cs-ai-collapsed-copy">
              <strong>AI가 상담 기록을 종합 분석해드립니다</strong>
              <p>진로·심리·교수 상담사 코멘트와 진단 결과를 함께 분석해 맞춤 인사이트를 제공합니다.</p>
            </div>
            <button type="button" className="cs-ai-analyze-btn" onClick={handleAnalyze}>
              <i className="fa-solid fa-wand-magic-sparkles" /> 분석하기
            </button>
          </div>
        )}

        {aiState === 'loading' && (
          <div className="cs-ai-loading" role="status" aria-live="polite">
            <div className="cs-ai-loading-spinner">
              <i className="fa-solid fa-robot" />
              <span className="cs-ai-loading-ring" />
            </div>
            <p className="cs-ai-loading-title">AI가 {student.name}님의 상담 기록을 분석하고 있어요</p>
            <p className="cs-ai-loading-sub">
              {COUNSEL_TOTAL}회 상담 · 진단 결과 · 전문가 코멘트를 종합 중입니다…
            </p>
            <div className="cs-ai-loading-bar"><div className="cs-ai-loading-fill" /></div>
          </div>
        )}

        {aiState === 'done' && (
          <div className="cs-ai-grid">
            {/* ① 상담 패턴 분석 */}
            <article className="cs-ai-tile">
              <h3 className="cs-ai-tile-title">
                <i className="fa-solid fa-chart-line" /> 상담 패턴 분석
              </h3>
              <ul className="cs-ai-bullets">
                <li><strong>참여도:</strong> 총 {COUNSEL_TOTAL}회 (월 평균 1.7회)</li>
                <li><strong>주요 흐름:</strong> 탐색 → 준비 → 실행 진행 중</li>
                <li><strong>핵심 변화:</strong> 진로 목표가 <em>{targetRole}</em>로 구체화</li>
              </ul>
            </article>

            {/* ② 주요 발견점 */}
            <article className="cs-ai-tile">
              <h3 className="cs-ai-tile-title cs-ai-tile-title--warn">
                <i className="fa-solid fa-lightbulb" /> 주요 발견점
              </h3>
              <p className="cs-ai-tile-body">
                초기에는 진로 탐색에 집중했으나, 최근에는 <em>구체적인 직무({targetRole})</em>와
                취업 준비로 관심사가 명확히 이동하고 있습니다.
              </p>
            </article>

            {/* ③ AI 상담 종합 평가 — 전체 폭 */}
            <article className="cs-ai-tile cs-ai-tile--wide">
              <h3 className="cs-ai-tile-title cs-ai-tile-title--primary">
                <i className="fa-solid fa-robot" /> AI 상담 종합 평가
              </h3>
              <p className="cs-ai-tile-body">
                3개월간 {COUNSEL_TOTAL}회 상담을 통해 초기 진로 탐색에서 현재는 <em>{targetRole}</em>로
                목표가 구체화되는 긍정적 변화를 보이고 있습니다. 상담 주제가 탐색(60%) → 직무분석(30%) → 취업준비(10%)로
                점차 실행 단계로 이동하고 있습니다.
              </p>
              <p className="cs-ai-tile-body">
                <strong className="cs-ai-suggest-label">[제언]</strong> 진단 결과와 상담 내역을 종합하면, 진로 방향은
                명확하게 설정되었으나 <em>실무 경험과 구체적인 취업 준비</em>가 필요한 단계입니다.
                직무 이해도를 높이고 포트폴리오 구축에 집중해야 합니다.
              </p>
            </article>
          </div>
        )}
      </section>

      {/* 전체 리포트 모달 */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`${student.name}님의 상담 종합 리포트`}
        size="lg"
      >
        <div className="cs-report">
          <div className="cs-report-summary">
            <div>
              <small>총 상담 횟수</small>
              <strong>{COUNSEL_TOTAL}회</strong>
            </div>
            <div>
              <small>목표 직무</small>
              <strong>{targetRole}</strong>
            </div>
            <div>
              <small>목표 회사</small>
              <strong>{student.targetCompany?.name ?? '-'}</strong>
            </div>
            <div>
              <small>학생 유형</small>
              <strong>{student.studentType}</strong>
            </div>
          </div>

          <section className="cs-report-section">
            <h4><i className="fa-solid fa-chart-line" /> 상담 패턴 분석</h4>
            <ul>
              <li><strong>참여도:</strong> 총 {COUNSEL_TOTAL}회 (월 평균 1.7회)</li>
              <li><strong>주요 흐름:</strong> 탐색 → 준비 → 실행 진행 중</li>
              <li><strong>핵심 변화:</strong> 진로 목표가 {targetRole}로 구체화</li>
              <li><strong>상담 주제 분포:</strong> 탐색 60% · 직무분석 30% · 취업준비 10%</li>
            </ul>
          </section>

          <section className="cs-report-section">
            <h4><i className="fa-solid fa-magnifying-glass" /> 주요 발견점</h4>
            <p>
              초기에는 진로 탐색에 집중했으나, 최근에는 구체적인 직무({targetRole})와 취업 준비로 관심사가
              명확히 이동하고 있습니다. 상담사별 코멘트 톤도 "탐색 격려" → "실행 지도"로 자연스럽게 전환되었습니다.
            </p>
          </section>

          <section className="cs-report-section">
            <h4><i className="fa-solid fa-robot" /> AI 상담 종합 평가</h4>
            <p>
              3개월간 {COUNSEL_TOTAL}회 상담을 통해 초기 진로 탐색에서 현재는 <strong>{targetRole}</strong>로
              목표가 구체화되는 긍정적 변화를 보이고 있습니다.
              상담 주제가 탐색(60%) → 직무분석(30%) → 취업준비(10%)로 점차 실행 단계로 이동하고 있습니다.
            </p>
          </section>

          <section className="cs-report-section cs-report-suggest">
            <h4><i className="fa-solid fa-lightbulb" /> 제언</h4>
            <p>
              진단 결과와 상담 내역을 종합하면, 진로 방향은 명확하게 설정되었으나 실무 경험과 구체적인
              취업 준비가 필요한 단계입니다. 직무 이해도를 높이고 포트폴리오 구축에 집중해야 합니다.
            </p>
            <ul>
              <li>직무 관련 프로젝트 1~2건 추가 (캡스톤 · 사이드)</li>
              <li>포트폴리오 GitHub · Notion 완성도 점검</li>
              <li>지도교수 상담을 통한 실무 인턴 매칭 검토</li>
            </ul>
          </section>
        </div>
      </Modal>
    </main>
  )
}
