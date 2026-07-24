import { FaArrowRight, FaBookOpen, FaBriefcase, FaBuilding, FaChartLine, FaComments, FaGraduationCap, FaUsers } from 'react-icons/fa'
import type { IconType } from 'react-icons'
import landingData from './landing.json'
import './Landing.css'

// 루트 랜딩 = Codex 디자인. 루트에는 라우터가 없으므로 useNavigate 대신
// window.location.href 로 이동(카드 클릭 → /v2). 데이터는 landing.json 단일소스.
const roleIcons: Record<string, IconType> = { graduation: FaGraduationCap, building: FaBuilding, users: FaUsers }
const featureIcons: Record<string, IconType> = { chart: FaChartLine, comments: FaComments, book: FaBookOpen, briefcase: FaBriefcase }

export default function Landing() {
  const handleLogin = (path: string) => { window.location.href = path }

  return (
    <div className="landing">
      <main className="landing-main">
        <header className="landing-topbar">
          <img className="landing-brand" src="/initiallogo_vertical_kor.png" alt="국립창원대학교" />
          <p className="landing-platform">{landingData.platformLabel}</p>
        </header>

        {/* 카드·기능바 묶음을 아래로 내리기 위한 신축 여백(자유공간을 위쪽에 더 배분) */}
        <div className="landing-spacer landing-spacer--top" aria-hidden="true" />

        <section className="landing-hero" aria-labelledby="landing-title">
          <p className="landing-eyebrow">{landingData.eyebrow}</p>
          <h1 className="landing-title" id="landing-title">{landingData.title}</h1>
          <p className="landing-description">{landingData.description.map(line => <span key={line}>{line}</span>)}</p>
        </section>

        <p className="landing-role-heading">{landingData.loginPrompt}</p>
        <section className="landing-roles" aria-label="로그인 유형">
          {landingData.roles.map(role => {
            const Icon = roleIcons[role.icon]
            return <article className={`landing-role landing-role--${role.accent}`} key={role.id}>
              <div className="landing-role-icon"><Icon aria-hidden="true" /></div>
              <h2 className="landing-role-title">{role.label}</h2>
              <p className="landing-role-description">{role.description}</p>
              <button className="landing-login" type="button" onClick={() => handleLogin(role.path)}>
                로그인하기 <FaArrowRight aria-hidden="true" />
              </button>
            </article>
          })}
        </section>

        <section className="landing-features" aria-label="주요 서비스">
          {landingData.features.map(feature => {
            const Icon = featureIcons[feature.icon]
            return <article className="landing-feature" key={feature.id}>
              <div className="landing-feature-icon"><Icon aria-hidden="true" /></div>
              <div><h2 className="landing-feature-title">{feature.title}</h2><p className="landing-feature-description">{feature.description}</p></div>
            </article>
          })}
        </section>

        {/* 푸터와의 간격(살짝만) — max-height 로 상한 */}
        <div className="landing-spacer landing-spacer--bottom" aria-hidden="true" />
      </main>
      <footer className="landing-footer">
        <p>{landingData.footer.name}</p>
        <div className="landing-footer-links">
          {landingData.footer.links.map(link => <a href="#footer" key={link}>{link}</a>)}
          <span>{landingData.footer.contact}</span>
        </div>
      </footer>
    </div>
  )
}
