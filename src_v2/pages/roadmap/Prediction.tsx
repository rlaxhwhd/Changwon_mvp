import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import './Prediction.css'
import { usePageHead } from '../../components/PageCrumb'

const COMPANIES = [
  { name: '넥슨코리아', rate: 58, gpa: '3.8', toeic: 750 },
  { name: '카카오게임즈', rate: 52, gpa: '3.7', toeic: 720 },
  { name: 'NHN', rate: 47, gpa: '3.6', toeic: 700 },
  { name: '넷마블', rate: 43, gpa: '3.5', toeic: 680 },
  { name: '쿠팡', rate: 38, gpa: '3.7', toeic: 780 },
]

const GAPS = [
  { area: '어학 성적', state: '미취득', impact: '높음', action: 'TOEIC 700+ 목표', level: 'high' },
  { area: '프로젝트 경험', state: '1건', impact: '높음', action: '팀 프로젝트 추가 참여', level: 'high' },
  { area: '인턴 경험', state: '없음', impact: '중간', action: '방학 중 인턴십 지원', level: 'mid' },
  { area: '자격증 보유', state: '1개 (SQLD)', impact: '중간', action: '정보처리기사 준비', level: 'mid' },
]

function BarChart() {
  return (
    <div className="pred-chart" aria-label="기업별 합격 예측률">
      {COMPANIES.map(company => (
        <div className="pred-chart-row" key={company.name}>
          <span className="pred-chart-name">{company.name}</span>
          <div className="pred-chart-track">
            <span className="pred-chart-fill" style={{ width: `${company.rate}%` }} />
          </div>
          <strong>{company.rate}%</strong>
        </div>
      ))}
      <div className="pred-axis" aria-hidden="true">
        {Array.from({ length: 11 }, (_, index) => (
          <span key={index}>{index * 10}%</span>
        ))}
      </div>
    </div>
  )
}

const GUIDE_FACTORS = [
  { icon: 'fa-chart-line', label: '본인 역량 진단 결과' },
  { icon: 'fa-language', label: '어학 점수 (TOEIC 등)' },
  { icon: 'fa-graduation-cap', label: '학점 / 성적' },
  { icon: 'fa-school', label: '소속 학과 및 전공' },
  { icon: 'fa-clipboard-check', label: '취업지원 역량진단 데이터' },
  { icon: 'fa-certificate', label: '보유 자격증' },
  { icon: 'fa-folder-open', label: '포트폴리오 / 프로젝트' },
]

export default function Prediction() {
  usePageHead('취업예측분석', 'AI가 분석한 기업별 합격 예측 결과입니다.')
  const navigate = useNavigate()
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <div className="pred-page">
      <section className="pred-hero">
        <div className="pred-hero-copy">
          <button className="pred-back-btn" aria-label="뒤로 가기" onClick={() => navigate(-1)}>
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div>
            <button className="pred-guide-btn" onClick={() => setGuideOpen(true)}>
              <i className="fa-regular fa-lightbulb" />
              분석 가이드
            </button>
          </div>
        </div>
        <div className="pred-hero-art" aria-hidden="true">
          <img className="pred-hero-img" src="/prediction.png" alt="" />
        </div>
      </section>

      <section className="pred-top-grid">
        <article className="pred-card pred-chart-card">
          <h2><i className="fa-solid fa-chart-line" />기업별 합격 예측률</h2>
          <BarChart />
          <p className="pred-card-note">기업명을 클릭하면 상세 분석을 확인할 수 있습니다.</p>
        </article>

        <article className="pred-card pred-target-card">
          <h2><i className="fa-solid fa-bullseye" />목표 기업 상세</h2>
          <div className="pred-score">
            <strong>58%</strong>
            <p>넥슨코리아 합격 예측률</p>
          </div>
          <div className="pred-score-meta">
            <div>
              <strong className="green">3</strong>
              <span>강점 영역</span>
            </div>
            <div>
              <strong className="red">4</strong>
              <span>보완 영역</span>
            </div>
          </div>
          <div className="pred-ai-box">
            <h3><i className="fa-solid fa-wand-magic-sparkles" />AI 분석</h3>
            <p>
              지원직무는 프로그래밍 역량과 문제해결 능수가 우수하지만, 어학 성적과 프로젝트 경험이 부족합니다.
              해당 영역을 보완하면 합격률이 75% 이상으로 상승할 것으로 예측됩니다.
            </p>
          </div>
        </article>
      </section>

      <section className="pred-bottom-grid">
        <article className="pred-card">
          <h2><i className="fa-solid fa-building" />기업별 상세 비교</h2>
          <div className="pred-table-wrap">
            <table className="pred-table">
              <thead>
                <tr>
                  <th>기업명</th>
                  <th>합격 예측률</th>
                  <th>합격 예측 학점</th>
                  <th>합격자 평균 TOEIC</th>
                  <th aria-label="상세" />
                </tr>
              </thead>
              <tbody>
                {COMPANIES.map(company => (
                  <tr key={company.name}>
                    <td>{company.name}</td>
                    <td className="blue">{company.rate}%</td>
                    <td>{company.gpa}</td>
                    <td>{company.toeic}</td>
                    <td><i className="fa-solid fa-chevron-right" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="pred-card">
          <h2><i className="fa-solid fa-triangle-exclamation warn" />부족 역량 분석</h2>
          <div className="pred-table-wrap">
            <table className="pred-table pred-gap-table">
              <thead>
                <tr>
                  <th>역량 영역</th>
                  <th>현재 상태</th>
                  <th>영향도</th>
                  <th>추천 액션</th>
                  <th aria-label="상세" />
                </tr>
              </thead>
              <tbody>
                {GAPS.map(gap => (
                  <tr key={gap.area}>
                    <td>{gap.area}</td>
                    <td>{gap.state}</td>
                    <td><span className={`pred-pill ${gap.level}`}>{gap.impact}</span></td>
                    <td>{gap.action}</td>
                    <td><i className="fa-solid fa-chevron-right" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <aside className="pred-info">
        <i className="fa-solid fa-circle-info" />
        <p>
          예측 결과는 지원자의 입력 정보와 유사한 합격자 데이터를 기반으로 산출된 참고용 지표입니다.
          실제 결과와 다를 수 있으며, 지속적인 자기계발과 경험이 중요합니다.
        </p>
      </aside>

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="분석 가이드" size="sm">
        <div className="pred-guide">
          <p className="pred-guide-lead">
            AI는 학생의 <strong>모든 데이터를 종합</strong>해 기업별 합격 예측률을 계산합니다.
          </p>

          <h4 className="pred-guide-subtitle">분석에 활용되는 데이터</h4>
          <ul className="pred-guide-list">
            {GUIDE_FACTORS.map(factor => (
              <li key={factor.label}>
                <span className="pred-guide-icon">
                  <i className={`fa-solid ${factor.icon}`} />
                </span>
                {factor.label}
              </li>
            ))}
          </ul>

          <p className="pred-guide-foot">
            이 데이터를 AI가 통합 분석해 기업별 합격 가능성과 보완이 필요한 역량을 제시합니다.
          </p>
        </div>
      </Modal>
    </div>
  )
}
