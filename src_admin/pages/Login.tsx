import type { IconType } from 'react-icons'
import { LuArrowRight, LuBriefcase, LuHeart } from 'react-icons/lu'
import { Navigate } from 'react-router-dom'
import type { CounselorRole } from '../data/counselors'
import { getCounselorByRole, setActiveCounselor, hasActiveSession } from '../data/counselors'

const ROLE_CARDS: { role: CounselorRole; icon: IconType; desc: string }[] = [
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
]

export default function Login() {
  // 이미 로그인된 세션이면 홈으로 포워딩. setActiveCounselor가 /login을 리로드하므로
  // 리로드 후 이 가드가 홈('/')으로 넘긴다. (RequireLogin은 미인증자만 막고 인증자는 못 내보냄)
  if (hasActiveSession()) return <Navigate to="/" replace />

  const handleSelect = (role: CounselorRole) => {
    const counselor = getCounselorByRole(role)
    if (!counselor) return
    // setActiveCounselor는 localStorage 저장 후 페이지를 리로드한다.
    // 리로드 후 App은 활성 상담사가 있으면 홈('/')으로 진입한다(App.tsx의 requireLogin).
    setActiveCounselor(counselor.id)
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-login-logo">DC</span>
          <div>
            <div className="admin-login-title">DREAMCATCH</div>
            <div className="admin-login-sub">상담사 포털</div>
          </div>
        </div>
        <p className="admin-login-lead">역할을 선택해 로그인하세요.</p>

        <div className="admin-login-roles">
          {ROLE_CARDS.map(card => {
            const counselor = getCounselorByRole(card.role)
            return (
              <button
                key={card.role}
                type="button"
                className="admin-role-card"
                onClick={() => handleSelect(card.role)}
                disabled={!counselor}
              >
                <span className="admin-role-icon">
                  {(() => { const Icon = card.icon; return <Icon /> })()}
                </span>
                <span className="admin-role-name">
                  {counselor ? counselor.roleLabel : card.role}
                </span>
                {counselor && (
                  <span className="admin-role-person">
                    {counselor.name} · {counselor.dept}
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

        <p className="admin-login-note">국립창원대학교 역량개발관리시스템 상담사 전용 콘솔입니다.</p>
      </div>
    </div>
  )
}
