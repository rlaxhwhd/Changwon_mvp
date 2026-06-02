import { useState } from 'react'
import './EmploymentTest.css'

type Category = '전체' | '역량 · 직무' | '심리 · 성향' | '진로 · 적성'

interface TestCard {
  title: string
  desc: string
  time: string
  questions: string
  category: Category
  artKey: string
  image: string
}

const categories: Category[] = ['전체', '역량 · 직무', '심리 · 성향', '진로 · 적성']

const tests: TestCard[] = [
  {
    title: '9CORE 검사',
    desc: '9가지 핵심역량을 기반으로 현재 역량 수준을 진단합니다.',
    time: '약 25분',
    questions: '150문항',
    category: '역량 · 직무',
    artKey: '9core',
    image: '/diagnosis_1.png',
  },
  {
    title: '심리검사',
    desc: '나의 성격, 정서, 행동 특성을 종합적으로 파악합니다.',
    time: '약 20분',
    questions: '120문항',
    category: '심리 · 성향',
    artKey: 'psychology',
    image: '/diagnosis_2.png',
  },
  {
    title: 'CARES 검사',
    desc: '대학생의 진로적응과 직무역량을 종합적으로 진단합니다.',
    time: '약 30분',
    questions: '160문항',
    category: '진로 · 적성',
    artKey: 'cares',
    image: '/diagnosis_3.png',
  },
  {
    title: '직무역량검사',
    desc: '직무 수행에 필요한 핵심 역량 수준을 측정하고 분석합니다.',
    time: '약 20분',
    questions: '100문항',
    category: '역량 · 직무',
    artKey: 'job',
    image: '/diagnosis_4.png',
  },
  {
    title: '직업적성검사',
    desc: '다양한 직업 분야에서의 적성과 흥미를 탐색합니다.',
    time: '약 25분',
    questions: '140문항',
    category: '진로 · 적성',
    artKey: 'aptitude',
    image: '/diagnosis_5.png',
  },
]

export default function EmploymentTest() {
  const [activeCategory, setActiveCategory] = useState<Category>('전체')
  const visibleTests = activeCategory === '전체'
    ? tests
    : tests.filter(test => test.category === activeCategory)

  return (
    <div className="de-wrap">
      <section className="de-hero">
        <div className="de-hero-copy">
          <span>진단센터</span>
          <h1>다양한 검사로 나를 더 깊이 이해해보세요</h1>
          <p>
            심리, 역량, 진로 등 다양한 검사를 통해<br />
            현재의 나를 진단하고 더 나은 방향을 찾아보세요.
          </p>
        </div>
        <div className="de-hero-visual" aria-label="홀로그램 이미지 영역">
          <img className="de-hero-image" src="/diagnosis_1.1.png" alt="AI 홀로그램 뇌 진단 이미지" />
        </div>
      </section>

      <section className="de-toolbar" aria-label="검사 필터">
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
        <button className="de-sort">
          최신순
          <i className="fa-solid fa-chevron-down" />
        </button>
      </section>

      <section className="de-card-grid" aria-label="검사 목록">
        {visibleTests.map(test => (
          <article key={test.title} className="de-test-card">
            <div className={`de-card-art de-card-art-${test.artKey}`}>
              <div className="de-card-copy">
                <h2>{test.title}</h2>
                <p>{test.desc}</p>
              </div>
              <img className="de-card-image" src={test.image} alt="" aria-hidden="true" />
            </div>

            <div className="de-card-meta">
              <div>
                <span className="de-meta-icon"><i className="fa-regular fa-clock" /></span>
                <span>
                  <small>소요 시간</small>
                  <strong>{test.time}</strong>
                </span>
              </div>
              <div>
                <span className="de-meta-icon"><i className="fa-solid fa-chart-simple" /></span>
                <span>
                  <small>문항 수</small>
                  <strong>{test.questions}</strong>
                </span>
              </div>
            </div>

            <button className="de-start-btn">
              검사하기
              <i className="fa-solid fa-arrow-right" />
            </button>
          </article>
        ))}
      </section>

      <section className="de-notice">
        <div className="de-notice-title">
          <span><i className="fa-solid fa-circle-info" /></span>
          <strong>검사 전 안내사항</strong>
        </div>
        <p>
          검사 결과는 자기 이해와 성장의 참고자료로 활용해주세요.<br />
          모든 검사는 익명으로 진행되며, 결과는 본인만 확인할 수 있습니다.
        </p>
      </section>
    </div>
  )
}
