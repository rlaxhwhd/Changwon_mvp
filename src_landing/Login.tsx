import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LuUser, LuLock, LuEye, LuEyeOff } from 'react-icons/lu'
import { STAFF_USERS } from '../src_admin/data/staff'
import { api } from '../shared/api'
import './Login.css'

type UserTab = 'internal' | 'external'

// 데모 로그인 — 비밀번호는 '!'. 아이디는 학생=학번, 교직원=사번.
// 교직원 사번은 하드코딩하지 않고 통합 레지스트리(STAFF_USERS)에서 조회한다.
const DEMO_PW = '!'

/** 로그인 시도 → 성공 시 목적지로 이동하고 true, 실패면 false. */
async function tryLogin(rawId: string, pw: string): Promise<boolean> {
  const id = rawId.trim()
  try {
    const student = await api<{id: string}>('/auth/student/login', {method:'POST', body:JSON.stringify({studentNo:id,password:pw})})
    localStorage.setItem('dc_active_student', student.id)
    localStorage.removeItem('dc_active_staff')
    window.location.href = '/v2/main'
    return true
  } catch (error) {
    if (!(error instanceof Error && 'status' in error && error.status === 401)) throw error
  }
  if (pw !== DEMO_PW) return false
  // 교직원 로그인 — 사번(empNo)으로 상담사·교수·조교 조회 후 교직원 포털(/admin)로
  const staff = STAFF_USERS.find(u => u.empNo === id)
  if (staff) {
    await api('/auth/student/logout', {method:'POST'}).catch(() => undefined)
    try { localStorage.setItem('dc_active_staff', staff.id) } catch { /* noop */ }
    window.location.href = '/admin'
    return true
  }
  return false
}

export default function Login() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<UserTab>(params.get('type') === 'external' ? 'external' : 'internal')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    if (!id || !pw) {
      setError('아이디와 비밀번호를 입력하세요.')
      return
    }
    setPending(true); setError('')
    try {
      if (await tryLogin(id, pw)) return
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } catch {
      setError('로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    } finally { setPending(false) }
  }

  return (
    <div className="cwlogin">
      <div className="cwlogin-inner">
        <header className="cwlogin-brand">
          <img src="/initiallogo_vertical_kor.png" alt="창원대학교" className="cwlogin-logo" />
          <span className="cwlogin-brand-sep" />
          <span className="cwlogin-brand-text">커리어 플랫폼</span>
        </header>

        <h1 className="cwlogin-title">통합 로그인</h1>
        <p className="cwlogin-subtitle">학생/교직원 및 기업 사용자 로그인</p>

        <form className="cwlogin-card" onSubmit={handleSubmit}>
          <div className="cwlogin-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'internal'}
              className={`cwlogin-tab ${tab === 'internal' ? 'active' : ''}`}
              onClick={() => setTab('internal')}
            >
              내부사용자
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'external'}
              className={`cwlogin-tab ${tab === 'external' ? 'active' : ''}`}
              onClick={() => setTab('external')}
            >
              외부사용자
            </button>
          </div>

          <label className="cwlogin-field cwlogin-field--first">
            <span className="cwlogin-label">아이디</span>
            <span className="cwlogin-input">
              <LuUser className="cwlogin-input-icon" aria-hidden="true" />
              <input
                type="text"
                value={id}
                onChange={(e) => { setId(e.target.value); setError('') }}
                placeholder="아이디를 입력하세요"
                autoComplete="username"
              />
            </span>
          </label>

          <label className="cwlogin-field">
            <span className="cwlogin-label">비밀번호</span>
            <span className="cwlogin-input">
              <LuLock className="cwlogin-input-icon" aria-hidden="true" />
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError('') }}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="cwlogin-eye"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPw ? <LuEyeOff /> : <LuEye />}
              </button>
            </span>
          </label>

          {error && <p role="alert" className="cwlogin-error">{error}</p>}

          <button type="submit" className="cwlogin-submit" disabled={pending}>{pending ? '로그인 중…' : '로그인'}</button>
        </form>
      </div>
    </div>
  )
}
