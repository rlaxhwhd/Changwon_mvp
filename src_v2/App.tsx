import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'

// AI 커리어 라운지
import AiLounge from './pages/AiLounge'

// 역량 강화
import GrowthHome from './pages/growth/GrowthHome'
import ProgramApply from './pages/growth/ProgramApply'
import QuestBoard from './pages/growth/QuestBoard'
import GrowthJournal from './pages/growth/GrowthJournal'
import GrowthJournalForm from './pages/growth/GrowthJournalForm'
import SkillTree from './pages/growth/SkillTree'

// 진단 센터
import EmploymentTest from './pages/diagnosis/EmploymentTest'
import PersonalityTest from './pages/diagnosis/PersonalityTest'

// 전문상담
import CareerCounsel from './pages/counsel/CareerCounsel'
import PsychCounsel from './pages/counsel/PsychCounsel'
import ProfessorCounsel from './pages/counsel/ProfessorCounsel'

// 경력개발 로드맵
import AiRoadmap from './pages/roadmap/AiRoadmap'
import Prediction from './pages/roadmap/Prediction'
import AiJobs from './pages/roadmap/AiJobs'
import AiResume from './pages/roadmap/AiResume'

// 취업지원
import JobSupport from './pages/jobs/JobSupport'

// 마이페이지
import Portfolio from './pages/mypage/Portfolio'
import MyPrograms from './pages/mypage/MyPrograms'
import CounselStatus from './pages/mypage/CounselStatus'
import MissionLog from './pages/mypage/MissionLog'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Landing />,
    },
    {
      element: <Layout />,
      children: [
        // AI 커리어 라운지
        { path: '/lounge', element: <AiLounge /> },

        // 역량 강화
        { path: '/growth',              element: <GrowthHome /> },
        { path: '/growth/program',      element: <ProgramApply /> },
        { path: '/growth/quest',        element: <QuestBoard /> },
        { path: '/growth/journal',      element: <GrowthJournal /> },
        { path: '/growth/journal/new',  element: <GrowthJournalForm /> },
        { path: '/growth/journal/:entryId/edit', element: <GrowthJournalForm /> },
        { path: '/growth/skill-tree',   element: <SkillTree /> },

        // 진단 센터
        { path: '/diagnosis',            element: <Navigate to="/diagnosis/employment" replace /> },
        { path: '/diagnosis/employment', element: <EmploymentTest /> },
        { path: '/diagnosis/personality',element: <PersonalityTest /> },

        // 전문상담
        { path: '/counsel',           element: <Navigate to="/counsel/career" replace /> },
        { path: '/counsel/career',    element: <CareerCounsel /> },
        { path: '/counsel/psych',     element: <PsychCounsel /> },
        { path: '/counsel/professor', element: <ProfessorCounsel /> },

        // 경력개발 로드맵
        { path: '/roadmap',             element: <Navigate to="/roadmap/ai" replace /> },
        { path: '/roadmap/ai',          element: <AiRoadmap /> },
        { path: '/roadmap/prediction',  element: <Prediction /> },
        { path: '/roadmap/jobs',        element: <AiJobs /> },
        { path: '/roadmap/resume',      element: <AiResume /> },

        // 취업지원
        { path: '/jobs', element: <JobSupport /> },

        // 마이페이지
        { path: '/mypage',           element: <Navigate to="/mypage/portfolio" replace /> },
        { path: '/mypage/portfolio', element: <Portfolio /> },
        { path: '/mypage/programs',  element: <MyPrograms /> },
        { path: '/mypage/counsel',   element: <CounselStatus /> },
        { path: '/mypage/mission',   element: <MissionLog /> },
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
  return <RouterProvider router={router} />
}
