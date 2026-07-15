import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveCounselor, updateCounselorProfile } from '../data/counselors'

export default function SettingsProfile() {
  const counselor = getActiveCounselor()

  const [name, setName] = useState(counselor.name)
  const [dept, setDept] = useState(counselor.dept)
  const [scope, setScope] = useState(counselor.scope)
  const [email, setEmail] = useState(counselor.email ?? '')
  const [officeHours, setOfficeHours] = useState(counselor.officeHours ?? '')

  const dirty =
    name.trim() !== counselor.name ||
    dept.trim() !== counselor.dept ||
    scope.trim() !== counselor.scope ||
    email.trim() !== (counselor.email ?? '') ||
    officeHours.trim() !== (counselor.officeHours ?? '')

  const canSave = dirty && name.trim() !== '' && dept.trim() !== ''

  const handleSave = () => {
    if (!canSave) return
    updateCounselorProfile(counselor.id, {
      name: name.trim(),
      dept: dept.trim(),
      scope: scope.trim(),
      email: email.trim() || undefined,
      officeHours: officeHours.trim() || undefined,
    })
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">내 프로필</h1>
          <p className="admin-page-desc">상담사 프로필 정보를 조회·수정합니다.</p>
        </div>
      </header>

      <section className="admin-card admin-profile-card">
        <div className="admin-profile-hero">
          <span className="admin-student-avatar xl"></span>
          <div>
            <strong>{counselor.name}</strong>
            <div className="admin-profile-hero-tags">
              <span className="admin-tag admin-tag-soft">{counselor.roleLabel}</span>
              <span className="admin-tag">{counselor.dept}</span>
            </div>
          </div>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>
              이름 <em className="admin-req-mark">*</em>
            </span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </label>

          <label className="admin-field">
            <span>역할</span>
            <input type="text" value={counselor.roleLabel} disabled />
            <small className="admin-field-hint">역할은 로그인 시 결정되며 변경할 수 없습니다.</small>
          </label>

          <label className="admin-field">
            <span>
              소속 <em className="admin-req-mark">*</em>
            </span>
            <input type="text" value={dept} onChange={e => setDept(e.target.value)} />
          </label>

          <label className="admin-field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@changwon.ac.kr"
            />
          </label>

          <label className="admin-field admin-field-full">
            <span>담당 범위</span>
            <input type="text" value={scope} onChange={e => setScope(e.target.value)} />
          </label>

          <label className="admin-field admin-field-full">
            <span>가능 시간대 요약</span>
            <input
              type="text"
              value={officeHours}
              onChange={e => setOfficeHours(e.target.value)}
              placeholder="예: 월·수·금 14:00~17:00"
            />
            <small className="admin-field-hint">
              상세 요일·시간대는 <Link to="/settings/availability" className="admin-inline-link">가능 시간대</Link>에서 설정합니다.
            </small>
          </label>
        </div>

        <div className="admin-form-actions">
          <button className="admin-btn admin-btn-primary" disabled={!canSave} onClick={handleSave}>
            <i className="fa-solid fa-floppy-disk" /> 저장
          </button>
        </div>
      </section>
    </div>
  )
}
