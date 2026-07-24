import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LuUser, LuLock, LuEye, LuEyeOff } from 'react-icons/lu'
import './Login.css'

type UserTab = 'internal' | 'external'

// 데모 계정 — 아이디로 목적지 분기 (비번은 '!')
const ACCOUNTS: Record<string, { pw: string; go: () => void }> = {
  '20250001': {
    pw: '!',
    go: () => {
      // 학생 로그인 — 관리자 세션 해제 후 학생 포털(/v2)로
      try { localStorage.removeItem('dc_active_counselor') } catch { /* noop */ }
      window.location.href = '/v2'
    },
  },
  '63044': {
    pw: '!',
    go: () => {
      // 교직원/관리자 로그인 — 상담사 세션 설정 후 관리자 포털(/admin)로
      try { localStorage.setItem('dc_active_counselor', 'career_park') } catch { /* noop */ }
      window.location.href = '/admin'
    },
  },
}

export default function Login() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<UserTab>(params.get('type') === 'external' ? 'external' : 'internal')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!id || !pw) {
      setError('아이디와 비밀번호를 입력하세요.')
      return
    }
    const account = ACCOUNTS[id.trim()]
    if (account && account.pw === pw) {
      account.go()
      return
    }
    setError('아이디 또는 비밀번호가 올바르지 않습니다.')
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

          {error && <p className="cwlogin-error">{error}</p>}

          <button type="submit" className="cwlogin-submit">로그인</button>
        </form>
      </div>
    </div>
  )
}
