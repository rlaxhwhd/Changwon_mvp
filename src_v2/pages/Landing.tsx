import { useNavigate } from 'react-router-dom'
import { type FormEvent } from 'react'

export default function Landing() {
  const navigate = useNavigate()

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    navigate('/main')
  }

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-logo">DREAMCATCH</div>
        <p className="landing-subtitle">국립창원대학교 AI 커리어 플랫폼</p>

        <form onSubmit={handleLogin}>
          <input
            className="landing-input"
            type="text"
            placeholder="학번"
            defaultValue="20201234"
          />
          <input
            className="landing-input"
            type="password"
            placeholder="비밀번호"
            defaultValue="••••••••"
          />
          <button type="submit" className="landing-btn">
            로그인
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--color-text-muted)' }}>
          국립창원대학교 학생 전용 서비스입니다
        </p>
      </div>
    </div>
  )
}
