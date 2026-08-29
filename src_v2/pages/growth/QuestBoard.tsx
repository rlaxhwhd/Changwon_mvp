import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './QuestBoard.css'
import { usePageHead } from '../../components/PageCrumb'

type QuestTab = 'daily' | 'monthly' | 'semester'

const questTabs: Array<{ id: QuestTab; label: string }> = [
  { id: 'daily', label: '일일 퀘스트' },
  { id: 'monthly', label: '월간 퀘스트' },
  { id: 'semester', label: '학기 퀘스트' },
]

const questsByTab = {
  daily: [
    {
      title: '토익 영단어 10문제 학습하기',
      description: '오늘의 영단어 문제를 풀고 학습 기록을 남겨보세요.',
      xp: 20,
      icon: 'fa-book-open',
      path: '/growth/mission',
    },
    {
      title: '성장일지 1개 기록하기',
      description: '오늘의 경험과 배운 점을 성장일지에 정리해보세요.',
      xp: 10,
      icon: 'fa-pen-to-square',
      path: '/growth/journal/new',
    },
    {
      title: '채용공고 리스트 확인하기',
      description: '새로 등록된 공고를 확인하고 관심 기업을 찾아보세요.',
      xp: 10,
      icon: 'fa-briefcase',
      path: '/jobs',
    },
  ],
  monthly: [
    {
      title: '성장일지 2개 기록하기',
      description: '이번 달 경험과 배운 점을 성장일지에 정리해 남겨보세요.',
      xp: 300,
      icon: 'fa-book',
      path: '/growth/journal',
    },
    {
      title: '비교과 프로그램 2회 참여',
      description: '관심 있는 비교과 프로그램을 신청하고 참여해보세요.',
      xp: 300,
      icon: 'fa-clipboard-check',
      path: '/growth/program',
    },
    {
      title: '상담 2회 신청하기',
      description: '진로·심리·지도교수 상담을 신청해 계획을 구체화하세요.',
      xp: 300,
      icon: 'fa-comments',
      path: '/counsel/career',
    },
  ],
  semester: [
    {
      title: 'AI 자소서 생성 및 컨설팅',
      description: 'AI 자소서 도구로 초안을 만들고 컨설팅으로 완성도를 높이세요.',
      xp: 500,
      icon: 'fa-file-lines',
      path: '/jobs/home/resume',
    },
    {
      title: '자격증 1개 취득',
      description: '학과 관련 또는 공인 자격증을 1개 이상 취득해보세요.',
      xp: 900,
      icon: 'fa-certificate',
      path: '/growth/skill-tree',
    },
  ],
}

const weekDays = [
  { label: '월', checked: true },
  { label: '화', checked: true },
  { label: '수', checked: true },
  { label: '목', checked: true },
  { label: '금', checked: true },
  { label: '토', checked: false },
  { label: '일', checked: false },
]

const guideItems = [
  { icon: 'fa-rotate', text: '일일 퀘스트는 매일 00시에 초기화됩니다.' },
  { icon: 'fa-chart-line', text: 'XP를 모아 레벨을 올리고 보상을 받아보세요.' },
  { icon: 'fa-calendar-check', text: '연속 달성이 길수록 추가 XP를 받을 수 있습니다.' },
  { icon: 'fa-gift', text: '일일 퀘스트를 모두 완료하면 보상이 열립니다.' },
]

export default function QuestBoard() {
  usePageHead('퀘스트 보드', '일일·주간·월간 퀘스트와 학과 랭킹을 확인합니다. 매일 성장하는 습관이 큰 변화를 만듭니다.')
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<QuestTab>('daily')
  const activeQuests = questsByTab[activeTab]

  return (
    <main className="qb-page">
      <section className="qb-summary-grid" aria-label="퀘스트 요약">
        <article className="qb-card qb-progress-card">
          <div>
            <h2>다음 레벨까지</h2>
            <div className="qb-progress-value">
              <strong>Lv. 23</strong>
              <span>→ Lv. 24</span>
            </div>
            <div className="qb-progress-track" aria-hidden="true">
              <span style={{ width: '62.5%' }} />
            </div>
            <p>1,250 / 2,000 XP · 750 XP 남았어요</p>
          </div>
          <div className="qb-reward-wrap">
            <button className="qb-primary-btn" type="button">보상 미리보기</button>
          </div>
        </article>

        <article className="qb-card qb-rank-card">
          <h2>학과 내 순위</h2>
          <div className="qb-rank-value">
            <strong>12</strong>
            <span>위</span>
          </div>
          <p>컴퓨터공학과 128명 중</p>
        </article>

        <article className="qb-card qb-metric-card">
          <div>
            <h2>연속 달성</h2>
            <div className="qb-metric-value">
              <strong>7</strong>
              <span>일 연속</span>
            </div>
            <p>최고 기록 12일</p>
          </div>
          <span className="qb-metric-icon qb-metric-icon--warm">
            <i className="fa-solid fa-fire" />
          </span>
        </article>

        <article className="qb-card qb-metric-card">
          <div>
            <h2>획득 XP</h2>
            <div className="qb-metric-value">
              <strong>150</strong>
              <span>XP</span>
            </div>
            <p>오늘 획득한 총 XP</p>
          </div>
          <span className="qb-xp-badge">XP</span>
        </article>
      </section>

      <section className="qb-content-grid">
        <div className="qb-left-stack">
          <article className="qb-card qb-quest-card">
            <div className="qb-quest-head">
              <h2>종합 퀘스트</h2>
              <div className="qb-card-tabs" role="tablist" aria-label="퀘스트 유형">
                {questTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`qb-card-tab ${activeTab === tab.id ? 'active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="qb-quest-list">
              {activeQuests.map((quest) => (
                <div className="qb-quest-row" key={quest.title}>
                  <div className="qb-quest-copy">
                    <h3>{quest.title}</h3>
                    <p>{quest.description}</p>
                  </div>
                  <strong className="qb-xp">+{quest.xp} XP</strong>
                  <button
                    className="qb-start-btn"
                    type="button"
                    onClick={() => navigate(quest.path)}
                  >
                    시작하기
                  </button>
                </div>
              ))}
            </div>
          </article>

          <div className="qb-bottom-grid">
            <article className="qb-card qb-week-xp">
              <div>
                <h2>이번 주 XP 현황</h2>
                <div className="qb-week-value">
                  <strong>420</strong>
                  <span>/ 1,000 XP</span>
                </div>
                <div className="qb-progress-track qb-progress-track--small" aria-hidden="true">
                  <span style={{ width: '42%' }} />
                </div>
                <p>다음 레벨까지 580 XP 남았어요.</p>
              </div>
              <div className="qb-level-badge">
                <i className="fa-solid fa-star" />
                <span>Lv.24</span>
              </div>
            </article>

            <article className="qb-card qb-rewards">
              <h2>누적 완료 퀘스트</h2>
              <div className="qb-complete-total">
                <strong>48</strong>
                <span>개 완료</span>
              </div>
              <div className="qb-complete-list">
                <span>일일 32개</span>
                <span>월간 10개</span>
                <span>학기 6개</span>
              </div>
            </article>
          </div>
        </div>

        <aside className="qb-right-stack" aria-label="퀘스트 보조 정보">
          <article className="qb-card qb-attendance">
            <h2>이번 주 출석 체크</h2>
            <div className="qb-days">
              {weekDays.map((day) => (
                <div className="qb-day" key={day.label}>
                  <span>{day.label}</span>
                  <i className={`fa-solid ${day.checked ? 'fa-check' : 'fa-circle'} ${day.checked ? 'checked' : ''}`} />
                </div>
              ))}
            </div>
          </article>

          <article className="qb-card qb-guide">
            <h2>퀘스트 가이드</h2>
            <ul>
              {guideItems.map((item) => (
                <li key={item.text}>
                  <i className={`fa-solid ${item.icon}`} />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="qb-help-box">
              <div>
                <strong>궁금한 점이 있으신가요?</strong>
                <p>AI 도우미에게 물어보세요!</p>
              </div>
              <button type="button" onClick={() => navigate('/lounge')}>
                AI 도우미 열기
                <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </article>
        </aside>
      </section>
    </main>
  )
}
