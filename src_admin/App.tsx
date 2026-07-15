import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import CounselRequests from './pages/CounselRequests'
import CounselSchedule from './pages/CounselSchedule'
import CounselSession from './pages/CounselSession'
import CounselRecords from './pages/CounselRecords'
import StudentList from './pages/StudentList'
import StudentDetail from './pages/StudentDetail'
import RoadmapRequests from './pages/RoadmapRequests'
import RoadmapEditor from './pages/RoadmapEditor'
import JobList from './pages/JobList'
import JobForm from './pages/JobForm'
import ProgramList from './pages/ProgramList'
import ProgramForm from './pages/ProgramForm'
import ProgramDetail from './pages/ProgramDetail'
import ProgramBlacklist from './pages/ProgramBlacklist'
import SettingsProfile from './pages/SettingsProfile'
import SettingsAvailability from './pages/SettingsAvailability'
import { hasActiveSession, getActiveCounselor } from './data/counselors'

/** 로그인 게이트 — 활성 상담사 세션이 없으면 /login 으로 보낸다. */
function RequireLogin() {
  if (!hasActiveSession()) return <Navigate to="/login" replace />
  return <Outlet />
}

/** 진로 전용 가드 — 진로상담사(career)만 접근. 심리상담사면 홈으로 리다이렉트.
 *  로드맵·채용공고·비교과 운영이 공유한다(navConfig requiresRole:'career'와 짝). */
function RequireCareer() {
  if (getActiveCounselor().role !== 'career') return <Navigate to="/" replace />
  return <Outlet />
}

const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    {
      element: <RequireLogin />,
      children: [
        {
          element: <Layout />,
          children: [
            // 홈 대시보드
            { path: '/', element: <Home /> },

            // ── 상담 관리 /counsel (G1 구현) ──
            { path: '/counsel/requests', element: <CounselRequests /> },
            { path: '/counsel/schedule', element: <CounselSchedule /> },
            { path: '/counsel/session/:studentId', element: <CounselSession /> },
            { path: '/counsel/records', element: <CounselRecords /> },

            // ── 학생 관리 /students (G2 구현) ──
            { path: '/students', element: <StudentList /> },
            { path: '/students/:id', element: <StudentDetail /> },

            // ── 진로 전용 [career] — 로드맵·채용공고·비교과 운영 (G2·G3) ──
            {
              element: <RequireCareer />,
              children: [
                // 로드맵 관리 /roadmap (G2)
                { path: '/roadmap/requests', element: <RoadmapRequests /> },
                { path: '/roadmap/:studentId', element: <RoadmapEditor /> },

                // 채용공고 /jobs (G3)
                { path: '/jobs', element: <JobList /> },
                { path: '/jobs/new', element: <JobForm /> },
                { path: '/jobs/:id/edit', element: <JobForm /> },

                // 비교과 운영 /programs (G3)
                { path: '/programs', element: <ProgramList /> },
                { path: '/programs/new', element: <ProgramForm /> },
                { path: '/programs/blacklist', element: <ProgramBlacklist /> },
                { path: '/programs/:id', element: <ProgramDetail /> },
              ],
            },

            // ── 설정 /settings (G1 구현) ──
            { path: '/settings', element: <SettingsProfile /> },
            { path: '/settings/availability', element: <SettingsAvailability /> },

            { path: '*', element: <Navigate to="/" replace /> },
          ],
        },
      ],
    },
  ],
  { basename: '/admin' },
)

export default function App() {
  return <RouterProvider router={router} />
}
