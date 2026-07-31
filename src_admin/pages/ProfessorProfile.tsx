/**
 * ---------------------------------------------------------------------------
 * 교수 상담 노출 설정 화면. 로그인 교수의 학생 선택 화면 노출 정보를 관리한다.
 * 데이터는 교수 JSON 기본값과 dc_professor_profile override를 병합해 읽는다.
 * ---------------------------------------------------------------------------
 */
import { LuSave } from 'react-icons/lu'
import { useState } from 'react'
import { getProfessorCounselProfile, updateProfessorCounselProfile } from '../data/professorProfiles'
import { getActiveUser } from '../data/staff'

export default function ProfessorProfile() {
  const user = getActiveUser()
  const profile = getProfessorCounselProfile(user.id)
  const [accept, setAccept] = useState(profile.accept)
  const [officeHours, setOfficeHours] = useState(profile.officeHours)
  const [intro, setIntro] = useState(profile.intro)
  const dirty = accept !== profile.accept || officeHours !== profile.officeHours || intro !== profile.intro

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담 노출 설정</h1>
          <p className="admin-page-desc">{user.name} 교수님의 학생 상담 신청 화면 노출을 설정합니다.</p>
        </div>
      </header>
      <section className="admin-card admin-profile-card">
        <div className="admin-profile-hero">
          <span className="admin-student-avatar xl" />
          <div>
            <strong>{user.name}</strong>
            <div className="admin-profile-hero-tags">
              <span className="admin-tag admin-tag-soft">{user.roleLabel}</span>
              <span className="admin-tag">{user.dept}</span>
            </div>
          </div>
        </div>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>상담 신청 허락</span>
            <select value={String(accept)} onChange={event => setAccept(event.target.value === 'true')}>
              <option value="true">신청 받음</option>
              <option value="false">받지 않음</option>
            </select>
            <small className="admin-field-hint">받지 않음으로 전환하면 학생 교수 목록에서 제외됩니다.</small>
          </label>
          <label className="admin-field">
            <span>오피스아워</span>
            <input value={officeHours} onChange={event => setOfficeHours(event.target.value)} />
          </label>
          <label className="admin-field admin-field-full">
            <span>상담 소개</span>
            <textarea value={intro} onChange={event => setIntro(event.target.value)} placeholder="학생에게 보여줄 상담 소개를 입력하세요." />
          </label>
        </div>
        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={!dirty}
            onClick={() => updateProfessorCounselProfile(user.id, { accept, officeHours, intro })}
          >
            <LuSave /> 저장
          </button>
        </div>
      </section>
    </div>
  )
}
