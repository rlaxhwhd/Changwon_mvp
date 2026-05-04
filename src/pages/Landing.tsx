import { useNavigate } from 'react-router-dom';
import SpaceBackground from '../scenes/SpaceBackground';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <>
      <SpaceBackground />
      <div className="landing">
        <div className="landing-kicker">CAREER MISSION CONTROL · 2026</div>
        <h1 className="landing-title">DREAMCATCH</h1>
        <p className="landing-sub">
          국립창원대학교 학생경력개발관리시스템. <br />
          당신의 커리어는 우주여행입니다. 미션을 클리어하고 다음 행성으로 도약하세요.
        </p>
        <div className="landing-cta">
          <button className="btn-aurora" onClick={() => navigate('/login')}>
            <i className="fa-solid fa-rocket" />
            MISSION START
          </button>
          <button className="btn-outline" onClick={() => navigate('/home')}>
            EXPLORE SYSTEM
          </button>
        </div>
        <div className="landing-scroll">
          <i className="fa-solid fa-angle-down" /> SCROLL TO EXPLORE
        </div>
      </div>
    </>
  );
}
