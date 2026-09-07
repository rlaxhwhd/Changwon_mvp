import type { IconType } from 'react-icons'
import {
  LuGraduationCap,
  LuBuilding2,
  LuUsersRound,
  LuChevronRight,
  LuActivity,
  LuMessagesSquare,
  LuBookOpen,
  LuBriefcase,
} from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import './Landing.css'

type LoginType = {
  key: string
  title: string
  desc: string
  icon: IconType
  tone: 'student' | 'company' | 'youth'
  onEnter: (nav: ReturnType<typeof useNavigate>) => void
}

const LOGIN_TYPES: LoginType[] = [
  {
    key: 'student',
    title: '학생/교직원',
    desc: '학생 및 교직원 전용 서비스',
    icon: LuGraduationCap,
    tone: 'student',
    onEnter: nav => nav('/main'),
  },
  {
    key: 'company',
    title: '기업',
    desc: '기업 담당자 전용 서비스',
    icon: LuBuilding2,
    tone: 'company',
    onEnter: () => window.alert('기업 담당자 서비스는 준비 중입니다.'),
  },
  {
    key: 'youth',
    title: '지역청년',
    desc: '지역청년 전용 서비스',
    icon: LuUsersRound,
    tone: 'youth',
    onEnter: () => window.alert('지역청년 서비스는 준비 중입니다.'),
  },
]

const FEATURES: { icon: IconType; title: string; desc: string }[] = [
  { icon: LuActivity, title: 'AI 맞춤 진단', desc: '나의 역량과 성향을 분석하여 맞춤형 진로를 제안합니다.' },
  { icon: LuMessagesSquare, title: '전문가 상담', desc: '진로·취업 전문가와 1:1 상담을 지원합니다.' },
  { icon: LuBookOpen, title: '역량 개발', desc: '비교과 프로그램과 학습 콘텐츠로 역량 강화를 지원합니다.' },
  { icon: LuBriefcase, title: '취업 지원', desc: '채용정보 제공 및 맞춤형 취업 지원 서비스를 제공합니다.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="v2lg">
      {/* 상단바 */}
      <header className="v2lg-header">
        <div className="v2lg-brand">
          <img src="/initiallogo_vertical_kor.png" alt="국립창원대학교" className="v2lg-logo" />
        </div>
        <span className="v2lg-platform">통합 진로·취업 지원 플랫폼</span>
      </header>

      <main className="v2lg-main">
        {/* 히어로 */}
        <section className="v2lg-hero">
          <p className="v2lg-eyebrow">당신의 미래를 디자인하는</p>
          <h1 className="v2lg-title">AI 기반 진로·취업 통합 지원 시스템</h1>
          <p className="v2lg-sub">
            진단부터 상담, 역량개발, 취업까지<br />
            창원대학교가 함께 하겠습니다.
          </p>
        </section>

        {/* 로그인 유형 선택 */}
        <div className="v2lg-select-label">
          <span>로그인 유형을 선택해주세요</span>
        </div>

        <section className="v2lg-cards">
          {LOGIN_TYPES.map(t => {
            const Icon = t.icon
            return (
              <article key={t.key} className={`v2lg-card is-${t.tone}`}>
                <span className="v2lg-card-icon">
                  <Icon />
                </span>
                <h2 className="v2lg-card-title">{t.title}</h2>
                <p className="v2lg-card-desc">{t.desc}</p>
                <button type="button" className="v2lg-card-btn" onClick={() => t.onEnter(navigate)}>
                  로그인하기 <LuChevronRight />
                </button>
              </article>
            )
          })}
        </section>

        {/* 서비스 특징 */}
        <section className="v2lg-features">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="v2lg-feature">
                <span className="v2lg-feature-icon">
                  <Icon />
                </span>
                <div className="v2lg-feature-text">
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            )
          })}
        </section>
      </main>

      {/* 푸터 */}
      <footer className="v2lg-footer">
        <span className="v2lg-footer-title">창원대학교 진로·취업 통합 지원 시스템</span>
        <nav className="v2lg-footer-links">
          <a href="#none" onClick={e => e.preventDefault()}>개인정보처리방침</a>
          <a href="#none" onClick={e => e.preventDefault()}>이용약관</a>
          <a href="#none" onClick={e => e.preventDefault()}>문의하기</a>
          <span className="v2lg-footer-tel">시스템 문의 : 055-213-XXXX</span>
        </nav>
      </footer>
    </div>
  )
}
