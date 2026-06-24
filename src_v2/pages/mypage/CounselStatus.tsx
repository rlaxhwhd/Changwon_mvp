import { useNavigate } from 'react-router-dom'
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
          <h2>
            AI 종합평가
          </h2>
          <button type="button">
            전체 리포트
          </button>
        </div>
        <div className="cs-ai-card">
          <div className="cs-ai-copy">
            <h3>
              전문가 코멘트 종합 분석
            </h3>
            <p>
              심리상담사, 교수, 취업상담사의 코멘트를 종합 분석한 결과, {student.name}님은 목표 의식과 성실성이 매우 높은 학생이지만 완벽주의 성향으로 인한
              번아웃 리스크와 어학(TOEIC) 스펙 부재가 주요 보완점으로 공통 지적됩니다.
            </p>
            <p>
              교수 코멘트에서는 전공 이해도와 리더십 잠재력이 높게 평가되었고, 심리상담에서는 대인관계 감수성이 장점으로 나타났습니다. 다만 팀 내에서
              주도성을 발휘하는 연습이 필요하다는 분석도 확인됩니다.
            </p>
            <strong>
              종합 추천: 번아웃 예방을 위한 주간 휴식 루틴 확보, TOEIC 700+ 단기 집중 준비, 캡스톤 프로젝트 리더 역할 도전을 권장합니다.
            </strong>
          </div>
          <div className="cs-ai-visual" aria-hidden="true">
            <span>AI</span>
          </div>
        </div>
      </section>
    </main>
  )
}
