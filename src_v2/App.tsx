import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import NeonTrail from './components/NeonTrail'
import Landing from './pages/Landing'
import Main from './pages/Main'

// AI 커리어 라운지
import AiLounge from './pages/AiLounge'

// 역량 강화
import GrowthHome from './pages/growth/GrowthHome'
import ProgramApply from './pages/growth/ProgramApply'
import ProgramDetail from './pages/growth/ProgramDetail'
import QuestBoard from './pages/growth/QuestBoard'
import GrowthJournal from './pages/growth/GrowthJournal'
import GrowthJournalForm from './pages/growth/GrowthJournalForm'
import SkillTree from './pages/growth/SkillTree'
import TodayGrowthMission from './pages/growth/TodayGrowthMission'
import GrowthMissionLog from './pages/growth/GrowthMissionLog'
import RoadmapStatus from './pages/growth/RoadmapStatus'

// 진단 센터
// 진단센터: /diagnosis/employment 한 화면만 — 콘텐츠는 기존 DiagnosisResult 사용
import DiagnosisResult from './pages/diagnosis/DiagnosisResult'
import DiagnosisResultDetail from './pages/diagnosis/DiagnosisResultDetail'

// 전문상담
import CareerCounsel from './pages/counsel/CareerCounsel'
import PsychCounsel from './pages/counsel/PsychCounsel'
import ProfessorCounsel from './pages/counsel/ProfessorCounsel'

// 경력개발 로드맵
import AiRoadmap from './pages/roadmap/AiRoadmap'
import FinalRoadmap from './pages/roadmap/FinalRoadmap'
import Prediction from './pages/roadmap/Prediction'
import AiJobs from './pages/roadmap/AiJobs'
import AiResume from './pages/roadmap/AiResume'

// 취업지원
import JobSupport from './pages/jobs/JobSupport'
import JobDetail from './pages/jobs/JobDetail'
import JobsHome from './pages/jobs/JobsHome'
import AiConsulting from './pages/jobs/AiConsulting'

// 마이페이지
import Portfolio from './pages/mypage/Portfolio'
import MyPrograms from './pages/mypage/MyPrograms'
import CounselStatus from './pages/mypage/CounselStatus'
import Attendance from './pages/mypage/Attendance'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Landing />,
    },
    {
      element: <Layout />,
      children: [
        // 메인
        { path: '/main', element: <Main /> },

        // AI 커리어 라운지
        { path: '/lounge', element: <AiLounge /> },

        // 역량 강화
        { path: '/growth',              element: <GrowthHome /> },
        { path: '/growth/program',      element: <ProgramApply /> },
        { path: '/growth/program/:id',  element: <ProgramDetail /> },
        { path: '/growth/quest',        element: <QuestBoard /> },
        { path: '/growth/roadmap-status', element: <RoadmapStatus /> },
        { path: '/growth/mission',      element: <TodayGrowthMission /> },
        { path: '/growth/mission-log',  element: <GrowthMissionLog /> },
        { path: '/growth/journal',      element: <GrowthJournal /> },
        { path: '/growth/journal/new',  element: <GrowthJournalForm /> },
        { path: '/growth/journal/:entryId/edit', element: <GrowthJournalForm /> },
        { path: '/growth/skill-tree',   element: <Navigate to="/roadmap/skill-tree" replace /> },

        // 진단 센터
        { path: '/diagnosis',            element: <Navigate to="/diagnosis/employment" replace /> },
        { path: '/diagnosis/employment',           element: <DiagnosisResult /> },
        { path: '/diagnosis/employment/:testId',   element: <DiagnosisResultDetail /> },
        // 옛 경로는 employment로 리다이렉트해 외부 링크·즐겨찾기 유지
        { path: '/diagnosis/result',               element: <Navigate to="/diagnosis/employment" replace /> },
        { path: '/diagnosis/result/:testId',       element: <Navigate to="/diagnosis/employment" replace /> },

        // 전문상담
        { path: '/counsel',           element: <Navigate to="/counsel/career" replace /> },
        { path: '/counsel/career',    element: <CareerCounsel /> },
        { path: '/counsel/psych',     element: <PsychCounsel /> },
        { path: '/counsel/professor', element: <ProfessorCounsel /> },

        // 경력개발 로드맵
        { path: '/roadmap',             element: <Navigate to="/roadmap/ai" replace /> },
        { path: '/roadmap/ai',          element: <AiRoadmap /> },
        { path: '/roadmap/skill-tree',  element: <SkillTree /> },
        { path: '/roadmap/final',       element: <FinalRoadmap /> },
        // 구 경로 → 신 경로 (취업지원 하위로 이동)
        { path: '/roadmap/prediction',  element: <Navigate to="/jobs/prediction" replace /> },
        { path: '/roadmap/jobs',        element: <Navigate to="/jobs/joblist" replace /> },
        { path: '/roadmap/resume',      element: <Navigate to="/jobs/home" replace /> },

        // 취업지원
        { path: '/jobs',                 element: <JobSupport /> },
        { path: '/jobs/prediction',      element: <Prediction /> },
        { path: '/jobs/joblist',         element: <AiJobs /> },
        { path: '/jobs/home',            element: <JobsHome /> },
        { path: '/jobs/home/resume',     element: <AiResume /> },
        { path: '/jobs/home/consulting', element: <AiConsulting /> },
        { path: '/jobs/resume',          element: <Navigate to="/jobs/home" replace /> },
        { path: '/jobs/:id',             element: <JobDetail /> },

        // 마이페이지
        { path: '/mypage',           element: <Navigate to="/mypage/portfolio" replace /> },
        { path: '/mypage/portfolio',  element: <Portfolio /> },
        { path: '/mypage/programs',   element: <MyPrograms /> },
        { path: '/mypage/counsel',    element: <CounselStatus /> },
        { path: '/mypage/attendance', element: <Attendance /> },
        { path: '/mypage/mission',    element: <Navigate to="/growth/mission-log" replace /> },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ],
  { basename: '/v2' },
)

export default function App() {
  return (
    <>
      <NeonTrail />
      <RouterProvider router={router} />
    </>
  )
}
