import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import './EmploymentTest.css'

type SortOrder = 'recent' | 'oldest'

type Category = '전체' | '역량 · 직무' | '심리 · 성향' | '진로 · 적성'

interface ResultCard {
  title: string
  desc: string
  time: string
  questions: string
  category: Category
  artKey: string
  image: string
  recentAt: string
}

const categories: Category[] = ['전체', '역량 · 직무', '심리 · 성향', '진로 · 적성']

const results: ResultCard[] = [
  {
    title: '9CORE 검사',
    desc: '9가지 핵심역량을 기반으로 현재 역량 수준을 진단합니다.',
    time: '약 25분',
    questions: '150문항',
    category: '역량 · 직무',
    artKey: '9core',
    image: '/diagnosis_1.png',
    recentAt: '2026. 05. 14 14:20',
  },
  {
    title: '심리검사',
    desc: '나의 성격, 정서, 행동 특성을 종합적으로 파악합니다.',
    time: '약 20분',
    questions: '120문항',
    category: '심리 · 성향',
    artKey: 'psychology',
    image: '/diagnosis_2.png',
    recentAt: '2026. 05. 12 10:05',
  },
  {
    title: 'CARES 검사',
    desc: '대학생의 진로적응과 직무역량을 종합적으로 진단합니다.',
    time: '약 30분',
    questions: '160문항',
    category: '진로 · 적성',
    artKey: 'cares',
    image: '/diagnosis_3.png',
    recentAt: '2026. 05. 10 16:40',
  },
  {
    title: '직무역량검사',
    desc: '직무 수행에 필요한 핵심 역량 수준을 측정하고 분석합니다.',
    time: '약 20분',
    questions: '100문항',
    category: '역량 · 직무',
    artKey: 'job',
    image: '/diagnosis_4.png',
    recentAt: '2026. 05. 08 11:30',
  },
  {
    title: '직업적성검사',
    desc: '다양한 직업 분야에서의 적성과 흥미를 탐색합니다.',
    time: '약 25분',
    questions: '140문항',
    category: '진로 · 적성',
    artKey: 'aptitude',
    image: '/diagnosis_5.png',
    recentAt: '2026. 05. 03 09:15',
  },
]

const GUIDE_ITEMS = [
  {
    icon: 'fa-comments',
    title: '상담사 면담 자료로 활용',
    desc: '진로·심리·교수 상담을 신청할 때 검사 결과를 함께 공유하면, 상담사가 학생의 강점과 보완점을 빠르게 파악해 더 깊이 있는 상담을 받을 수 있어요.',
  },
  {
    icon: 'fa-route',
    title: 'AI 진로 로드맵에 자동 반영',
    desc: '검사 결과는 AI 진로 로드맵 생성 시 핵심 데이터로 사용되어, 학생의 적성과 역량에 맞춘 맞춤형 로드맵과 우선순위 추천을 만들어냅니다.',
  },
  {
    icon: 'fa-file-pdf',
    title: 'PDF 출력으로 외부 활용',
    desc: '검사 리포트는 PDF로 내려받아 학교 밖 상담기관, 멘토링, 취업 컨설팅 등 어디서든 본인의 진단 자료로 제출하거나 참고용으로 사용할 수 있어요.',
  },
  {
    icon: 'fa-shapes',
    title: '자소서·포트폴리오 작성 보조',
    desc: '객관적 진단 데이터로 본인의 강점과 직무 적합도를 정리해두면, 자기소개서·포트폴리오·면접 답변을 일관된 근거로 작성할 수 있습니다.',
  },
]

export default function DiagnosisResult() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<Category>('전체')
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const visibleResults = (activeCategory === '전체'
    ? results
    : results.filter(result => result.category === activeCategory))
    .slice()
    .sort((a, b) =>
      sortOrder === 'recent'
        ? b.recentAt.localeCompare(a.recentAt)
        : a.recentAt.localeCompare(b.recentAt),
    )

  return (
    <div className="de-wrap">
      <section className="de-hero">
        <div className="de-hero-copy">
          <span>진단센터</span>
          <h1>다양한 검사로 나를 더 깊이 이해해보세요</h1>
          <p>
            심리, 역량, 진로 등 다양한 검사 결과를 통해<br />
            현재의 나를 확인하고 더 나은 방향을 찾아보세요.
          </p>
        </div>
        <div className="de-hero-visual" aria-label="AI 홀로그램 진단 이미지">
          <img className="de-hero-image" src="/diagnosis_1.2.png" alt="AI 홀로그램 진단 이미지" />
        </div>
      </section>

      <section className="de-toolbar" aria-label="결과 필터">
        <div className="de-tabs">
          {categories.map(category => (
            <button
              key={category}
              className={activeCategory === category ? 'active' : ''}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <button
          className="de-sort"
          onClick={() => setSortOrder(order => (order === 'recent' ? 'oldest' : 'recent'))}
          aria-label={`정렬: ${sortOrder === 'recent' ? '최신순' : '오래된순'}`}
        >
          {sortOrder === 'recent' ? '최신순' : '오래된순'}
          <i
            className="fa-solid fa-chevron-down"
            style={{ transform: sortOrder === 'recent' ? 'none' : 'rotate(180deg)' }}
          />
        </button>
      </section>

      <section className="de-card-grid" aria-label="진단 결과 목록">
        {visibleResults.map(result => (
          <article key={result.title} className="de-test-card">
            <div className={`de-card-art de-card-art-${result.artKey}`}>
              <div className="de-card-copy">
                <h2>{result.title}</h2>
                <p>{result.desc}</p>
              </div>
              <img className="de-card-image" src={result.image} alt="" aria-hidden="true" />
            </div>

            <div className="de-card-meta">
              <div>
                <span className="de-meta-icon"><i className="fa-regular fa-clock" /></span>
                <span>
                  <small>소요 시간</small>
                  <strong>{result.time}</strong>
                </span>
              </div>
              <div>
                <span className="de-meta-icon"><i className="fa-solid fa-chart-simple" /></span>
                <span>
                  <small>문항 수</small>
                  <strong>{result.questions}</strong>
                </span>
              </div>
            </div>

            <button
              className="de-start-btn"
              onClick={() => navigate(`/diagnosis/result/${result.artKey}`)}
            >
              결과보기
              <i className="fa-solid fa-arrow-right" />
            </button>
            <div className="de-recent-date">
              <i className="fa-regular fa-calendar-check" />
              최근 검사일시 {result.recentAt}
            </div>
          </article>
        ))}
      </section>

      <section className="de-notice">
        <div className="de-notice-title">
          <span><i className="fa-solid fa-circle-info" /></span>
          <strong>검사 결과 안내사항</strong>
        </div>
        <p>
          검사 결과는 자기 이해와 성장의 참고자료로 활용해주세요.<br />
          결과 리포트에서는 AI 분석 요약과 추천 로드맵을 함께 확인할 수 있습니다.
        </p>
        <button onClick={() => setIsGuideOpen(true)}>
          결과 활용 가이드 자세히 보기
          <i className="fa-solid fa-arrow-up-right-from-square" />
        </button>
      </section>

      <Modal
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="검사 결과, 이렇게 활용해보세요"
        size="md"
      >
        <div className="de-modal-body">
          <div className="de-modal-head-copy">
            <span className="de-modal-badge">
              <i className="fa-solid fa-lightbulb" />
              결과 활용 가이드
            </span>
            <p>
              진단 결과는 단순히 점수 확인용이 아니에요. 상담·로드맵·외부 활용까지
              여러 방면에서 학생의 진로 설계를 돕는 핵심 자료입니다.
            </p>
          </div>

          <ul className="de-modal-list">
            {GUIDE_ITEMS.map(item => (
              <li key={item.title} className="de-modal-item">
                <span className="de-modal-item-icon">
                  <i className={`fa-solid ${item.icon}`} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="de-modal-foot">
            <p>
              <i className="fa-solid fa-circle-info" />
              검사 결과는 개인정보 보호 기준에 따라 본인 동의 하에만 외부 공유가 가능합니다.
            </p>
            <button
              className="de-modal-primary"
              onClick={() => setIsGuideOpen(false)}
            >
              확인했어요
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
