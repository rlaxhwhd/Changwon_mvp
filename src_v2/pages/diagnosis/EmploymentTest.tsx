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

const TEST_REDIRECT_URL =
  'https://cwnu.njob.net/poll_view.asp?cmd=view&sid=7&jmode=new&usess=20260611095410-20191238-9687'

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
  const [consentOpen, setConsentOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  const visibleTests = activeCategory === '전체'
    ? tests
    : tests.filter(test => test.category === activeCategory)

  const openConsent = (testTitle: string) => {
    setSelectedTest(testTitle)
    setAgreed(false)
    setConsentOpen(true)
  }

  const closeConsent = () => {
    setConsentOpen(false)
    setSelectedTest(null)
    setAgreed(false)
  }

  const handleAgree = () => {
    if (!agreed) return
    window.location.href = TEST_REDIRECT_URL
  }

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
        <span className="de-sort">최신순</span>
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

            <button className="de-start-btn" onClick={() => openConsent(test.title)}>
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

      {consentOpen && (
        <div className="de-modal-backdrop" onClick={closeConsent}>
          <div className="de-consent-modal" onClick={e => e.stopPropagation()}>
            <div className="de-consent-head">
              <div className="de-consent-head-copy">
                <span className="de-modal-badge">
                  <i className="fa-solid fa-shield-halved" /> 필수 동의
                </span>
                <h2>개인정보 수집·이용 안내</h2>
                <p>
                  {selectedTest ? `‘${selectedTest}’ ` : ''}응시를 위해 아래 개인정보 수집·이용에 동의해주세요.
                </p>
              </div>
              <button
                className="de-modal-close"
                aria-label="닫기"
                onClick={closeConsent}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="de-consent-body">
              <table className="de-consent-table">
                <tbody>
                  <tr>
                    <th>수집 항목</th>
                    <td>성명, 학번, 학과, 이메일, 검사 응답 및 결과 데이터</td>
                  </tr>
                  <tr>
                    <th>수집·이용 목적</th>
                    <td>진단검사 응시 및 결과 분석, 개인 맞춤형 진로·역량 가이드 제공, 통계 자료 활용</td>
                  </tr>
                  <tr>
                    <th>보유·이용 기간</th>
                    <td>졸업 후 5년 또는 회원 탈퇴 시까지 (관계 법령에 따라 보존 의무가 있는 경우 해당 기간까지)</td>
                  </tr>
                  <tr>
                    <th>제공받는 자</th>
                    <td>국립창원대학교 진로취업지원센터</td>
                  </tr>
                </tbody>
              </table>

              <p className="de-consent-note">
                귀하는 위 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
                단, 동의를 거부하실 경우 검사 응시 및 결과 분석 서비스 이용이 제한될 수 있습니다.
              </p>
            </div>

            <label className="de-consent-check">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span>위 개인정보 수집·이용 안내를 모두 확인하였으며 동의합니다. (필수)</span>
            </label>

            <div className="de-consent-foot">
              <button className="de-consent-cancel" onClick={closeConsent}>
                취소
              </button>
              <button
                className="de-consent-submit"
                disabled={!agreed}
                onClick={handleAgree}
              >
                동의하고 검사 시작
                <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
