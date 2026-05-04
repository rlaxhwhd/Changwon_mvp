import { useState, useCallback, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/Home';
import Roadmap from './pages/Roadmap';
import DiagnosisCenter from './pages/DiagnosisCenter';
import ProgramApply from './pages/ProgramApply';
import {
  IntroSupport, IntroCenter, IntroPlus, IntroLocation, IntroWork,
  CounselCareer, CounselPsych, CounselProf,
  CareerManage, ProgramReview,
  RoadmapPrediction, RoadmapJobs, RoadmapResume,
  Lounge,
  JobPosting, WorknetJobs, YouthPolicy,
  MyHome, MyPortfolio, MyPrograms, MyCounsel, MyMileage, MyEvaluation,
} from './pages/subpages';

export default function App() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onToast={showToast} />} />

        <Route element={<Layout onToast={showToast} />}>
          <Route path="/home" element={<Home />} />

          <Route path="/intro/support" element={<IntroSupport />} />
          <Route path="/intro/center" element={<IntroCenter />} />
          <Route path="/intro/plus" element={<IntroPlus />} />
          <Route path="/intro/location" element={<IntroLocation />} />
          <Route path="/intro/work" element={<IntroWork />} />

          <Route path="/diagnosis/career" element={<DiagnosisCenter type="career" />} />
          <Route path="/diagnosis/personality" element={<DiagnosisCenter type="personality" />} />

          <Route path="/counsel/career" element={<CounselCareer />} />
          <Route path="/counsel/psych" element={<CounselPsych />} />
          <Route path="/counsel/prof" element={<CounselProf />} />

          <Route path="/program/apply" element={<ProgramApply />} />
          <Route path="/program/manage" element={<CareerManage />} />
          <Route path="/program/review" element={<ProgramReview />} />

          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/roadmap/prediction" element={<RoadmapPrediction />} />
          <Route path="/roadmap/jobs" element={<RoadmapJobs />} />
          <Route path="/roadmap/resume" element={<RoadmapResume />} />

          <Route path="/lounge" element={<Lounge />} />

          <Route path="/jobs/posting" element={<JobPosting />} />
          <Route path="/jobs/worknet" element={<WorknetJobs />} />
          <Route path="/jobs/policy" element={<YouthPolicy />} />

          <Route path="/my/home" element={<MyHome />} />
          <Route path="/my/portfolio" element={<MyPortfolio />} />
          <Route path="/my/programs" element={<MyPrograms />} />
          <Route path="/my/counsel" element={<MyCounsel />} />
          <Route path="/my/mileage" element={<MyMileage />} />
          <Route path="/my/evaluation" element={<MyEvaluation />} />
        </Route>

        <Route path="*" element={<Landing />} />
      </Routes>

      {toast && (
        <div className="toast-wrap">
          <div className="toast">{toast}</div>
        </div>
      )}
    </>
  );
}
