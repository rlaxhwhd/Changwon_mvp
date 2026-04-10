import { useState, useCallback, useRef } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import TopHeader from './components/TopHeader';
import ToastContainer from './components/Toast';
import { useToast } from './hooks/useToast';
import type { PageId } from './types';

import Home from './pages/Home';
import Home2 from './pages/Home2';
import Home4 from './pages/Home4';
import Home5 from './pages/Home5';
import Home6 from './pages/Home6';
import Landing3 from './pages/Landing3';
import Landing4 from './pages/Landing4';
import Landing5 from './pages/Landing5';
import StrategyCenter from './pages/StrategyCenter';
import Dashboard from './pages/Dashboard';
import AiRoadmap from './pages/AiRoadmap';
import AiPrediction from './pages/AiPrediction';
import AiJobs from './pages/AiJobs';
import AiEvaluation from './pages/AiEvaluation';
import AiResume from './pages/AiResume';
import ProgramApply from './pages/ProgramApply';
import CareerManage from './pages/CareerManage';
import ProgramReview from './pages/ProgramReview';
import PsychTest from './pages/PsychTest';
import NineCore from './pages/NineCore';
import Aptitude from './pages/Aptitude';
import CounselForm from './pages/CounselForm';
import CompanyInfo from './pages/CompanyInfo';
import Notice from './pages/Notice';
import MyPage from './pages/MyPage';
import CareerDiagnosis from './pages/CareerDiagnosis';
import PersonalityDiagnosis from './pages/PersonalityDiagnosis';
import JobPosting from './pages/JobPosting';
import WorknetJobs from './pages/WorknetJobs';
import YouthPolicy from './pages/YouthPolicy';
import MyHome from './pages/MyHome';
import MyPortfolio from './pages/MyPortfolio';
import MyPrograms from './pages/MyPrograms';
import MyCounselStatus from './pages/MyCounselStatus';
import MyMileage from './pages/MyMileage';

function App() {
  const [page, setPage] = useState<PageId>('landing');
  const [designVersion, setDesignVersion] = useState<1 | 2 | 3 | 4 | 5>(3);
  const historyRef = useRef<PageId[]>([]);
  const { toasts, showToast } = useToast();

  const navigate = useCallback((next: PageId) => {
    setPage(prev => {
      if (prev !== next) {
        historyRef.current.push(prev);
      }
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      setPage(prev);
    }
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'landing':
        if (designVersion === 5) return <Landing5 onNavigate={navigate} onToast={showToast} />;
        if (designVersion === 4) return <Landing4 onNavigate={navigate} onToast={showToast} />;
        if (designVersion === 3) return <Landing3 onNavigate={navigate} onToast={showToast} />;
        // Default: version 3 style landing for versions 1 & 2
        return <Landing3 onNavigate={navigate} onToast={showToast} />;
      case 'home':
        if (designVersion === 2) return <Home2 onNavigate={navigate} onToast={showToast} />;
        if (designVersion === 3) return <Home5 onNavigate={navigate} onToast={showToast} />;
        if (designVersion === 4) return <Home4 onNavigate={navigate} onToast={showToast} />;
        if (designVersion === 5) return <Home6 onNavigate={navigate} onToast={showToast} />;
        return <Home onNavigate={navigate} onToast={showToast} />;
      // ── 취업전략센터 (소개페이지) ──
      case 'strategy-intro':
      case 'strategy-support':
        return <StrategyCenter subPage="support" onToast={showToast} onNavigate={navigate} />;
      case 'strategy-center':
        return <StrategyCenter subPage="center" onToast={showToast} onNavigate={navigate} />;
      case 'strategy-plus':
        return <StrategyCenter subPage="plus" onToast={showToast} onNavigate={navigate} />;
      case 'strategy-location':
        return <StrategyCenter subPage="location" onToast={showToast} onNavigate={navigate} />;
      case 'strategy-work':
        return <StrategyCenter subPage="work" onToast={showToast} onNavigate={navigate} />;
      // ── AI 커리어 라운지 ──
      case 'dashboard':
        return <Dashboard onToast={showToast} onNavigate={navigate} />;
      case 'ai-roadmap':
        return <AiRoadmap />;
      case 'ai-prediction':
        return <AiPrediction />;
      case 'ai-jobs':
        return <AiJobs onToast={showToast} />;
      case 'ai-resume':
        return <AiResume onToast={showToast} />;
      case 'ai-evaluation':
        return <AiEvaluation />;
      // ── 진로취업 프로그램 ──
      case 'program-apply':
        return <ProgramApply onToast={showToast} />;
      case 'career-manage':
        return <CareerManage onToast={showToast} />;
      case 'program-review':
        return <ProgramReview onToast={showToast} />;
      // ── 검사 & 상담 ──
      case 'psych-test':
        return <PsychTest onNavigate={navigate} />;
      case 'nine-core':
        return <NineCore />;
      case 'aptitude':
        return <Aptitude />;
      case 'counsel-career':
        return <CounselForm type="career" onToast={showToast} />;
      case 'counsel-employ':
        return <CounselForm type="employ" onToast={showToast} />;
      case 'counsel-prof':
        return <CounselForm type="prof" onToast={showToast} />;
      case 'counsel-psych':
        return <CounselForm type="employ" onToast={showToast} />;
      // ── 기타 ──
      case 'company-info':
        return <CompanyInfo onToast={showToast} />;
      case 'notice':
        return <Notice onToast={showToast} />;
      case 'mypage':
        return <MyPage onToast={showToast} />;
      // ── v2 진단센터 ──
      case 'career-diagnosis':
        return <CareerDiagnosis onNavigate={navigate} />;
      case 'personality-diagnosis':
        return <PersonalityDiagnosis onNavigate={navigate} />;
      // ── v2 채용정보 ──
      case 'job-posting':
        return <JobPosting onToast={showToast} />;
      case 'worknet-jobs':
        return <WorknetJobs onToast={showToast} />;
      case 'youth-policy':
        return <YouthPolicy onToast={showToast} />;
      // ── v2 마이페이지 하위 ──
      case 'my-home':
        return <MyHome onToast={showToast} />;
      case 'my-portfolio':
        return <MyPortfolio onToast={showToast} onNavigate={navigate} />;
      case 'my-programs':
        return <MyPrograms onToast={showToast} />;
      case 'my-counsel-status':
        return <MyCounselStatus onToast={showToast} />;
      case 'my-mileage':
        return <MyMileage onToast={showToast} />;
    }
  };

  const isLanding = page === 'landing';
  const isHome = page === 'home';

  /* Landing page is full-screen, no header/nav */
  if (isLanding) {
    return (
      <div className="app-top-layout">
        <main className="main-top-home">
          {renderPage()}
        </main>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="app-top-layout">
      <TopHeader onNavigate={navigate} onToast={showToast} designVersion={designVersion} onDesignChange={setDesignVersion} />
      <main className={isHome ? 'main-top-home' : 'main-top-content'}>
        {!isHome && (
          <div className="back-to-home" style={{ display: 'flex', gap: 8 }}>
            {historyRef.current.length > 0 && (
              <button className="btn btn-sm btn-outline" onClick={goBack}>
                <i className="fa-solid fa-arrow-left" /> 뒤로가기
              </button>
            )}
            <button className="btn btn-sm btn-outline" onClick={() => { historyRef.current = []; navigate('home'); }}>
              <i className="fa-solid fa-house" /> 홈으로
            </button>
          </div>
        )}
        {renderPage()}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
