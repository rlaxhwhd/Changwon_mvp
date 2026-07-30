import type { IconType } from 'react-icons'
import { LuArrowRight, LuBriefcase, LuHeart, LuGraduationCap, LuClipboardCheck } from 'react-icons/lu'
import { Navigate } from 'react-router-dom'
import type { StaffRole } from '../data/schema/staff'
import { getStaffByRole, setActiveUser, hasActiveSession } from '../data/staff'

const ROLE_CARDS: { role: StaffRole; icon: IconType; desc: string }[] = [
  {
    role: 'career',
    icon: LuBriefcase,
    desc: '진로·취업 상담, IAP 유형 확정, 로드맵 편집, 채용공고를 관리합니다.',
  },
  {
    role: 'psych',
    icon: LuHeart,
    desc: '심리·정서 상담을 접수·진행하고 학생 성향 검사 결과를 열람합니다.',
  },
  {
    role: 'professor',
    icon: LuGraduationCap,
    desc: '지도학생을 조회하고 교수상담을 접수·기록하며 상담 노출을 설정합니다.',
  },
  {
    role: 'assistant',
    icon: LuClipboardCheck,
    desc: '담당 학과 학생 현황·전담교수 배정을 조회하고 포트폴리오를 관리합니다.',
  },
]

export default function Login() {
  // 이미 로그인된 세션이면 홈으로 포워딩. setActiveUser가 /login을 리로드하므로
  // 리로드 후 이 가드가 홈('/')으로 넘긴다. (RequireLogin은 미인증자만 막고 인증자는 못 내보냄)
  if (hasActiveSession()) return <Navigate to="/" replace />

  const handleSelect = (role: StaffRole) => {
    const user = getStaffByRole(role)
    if (!user) return
    // setActiveUser는 localStorage 저장 후 페이지를 리로드한다.
    // 리로드 후 App은 활성 사용자가 있으면 홈('/')으로 진입한다(App.tsx RequireLogin).
    setActiveUser(user.id)
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-login-logo">DC</span>
          <div>
            <div className="admin-login-title">DREAMCATCH</div>
            <div className="admin-login-sub">교직원 포털</div>
          </div>
        </div>
        <p className="admin-login-lead">역할을 선택해 로그인하세요.</p>

        <div className="admin-login-roles">
          {ROLE_CARDS.map(card => {
            const user = getStaffByRole(card.role)
            return (
              <button
                key={card.role}
                type="button"
                className="admin-role-card"
                onClick={() => handleSelect(card.role)}
                disabled={!user}
              >
                <span className="admin-role-icon">
                  {(() => { const Icon = card.icon; return <Icon /> })()}
                </span>
                <span className="admin-role-name">
                  {user ? user.roleLabel : card.role}
                </span>
                {user && (
                  <span className="admin-role-person">
                    {user.name} · {user.dept}
                  </span>
                )}
                <span className="admin-role-desc">{card.desc}</span>
                <span className="admin-role-cta">
                  로그인 <LuArrowRight />
                </span>
              </button>
            )
          })}
        </div>

        <p className="admin-login-note">국립창원대학교 역량개발관리시스템 교직원 전용 콘솔입니다.</p>
      </div>
    </div>
  )
}
