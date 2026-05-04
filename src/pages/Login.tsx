import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onToast: (msg: string) => void;
}

export default function Login({ onToast }: Props) {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!studentId || !password) {
      onToast('학번과 비밀번호를 입력하세요');
      return;
    }
    onToast('로그인 성공 · 미션 컨트롤로 진입합니다');
    setTimeout(() => navigate('/home'), 700);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">DREAMCATCH</div>
        <div className="login-tag">Career Mission Control</div>

        <div className="login-field">
          <label htmlFor="studentId">STUDENT ID</label>
          <input
            id="studentId"
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="20250000"
            autoComplete="username"
          />
        </div>
        <div className="login-field">
          <label htmlFor="password">ACCESS CODE</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="login-submit">
          LAUNCH MISSION <i className="fa-solid fa-rocket" style={{ marginLeft: 8 }} />
        </button>
        <div className="login-foot">
          <a>비밀번호 찾기</a>
          <a>처음 방문 학생 가이드</a>
        </div>
      </form>
    </div>
  );
}
