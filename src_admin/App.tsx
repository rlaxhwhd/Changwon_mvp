import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import CounselRequests from './pages/CounselRequests'
import CounselSchedule from './pages/CounselSchedule'
import CounselSession from './pages/CounselSession'
import CounselRecords from './pages/CounselRecords'
import CounselRecordPrint from './pages/CounselRecordPrint'
import CounselStats from './pages/CounselStats'
import DiagnosisStatus from './pages/DiagnosisStatus'
import GroupCounsels from './pages/GroupCounsels'
import PsychTests from './pages/PsychTests'
import StudentList from './pages/StudentList'
import StudentDetail from './pages/StudentDetail'
import RoadmapRequests from './pages/RoadmapRequests'
import RoadmapEditor from './pages/RoadmapEditor'
import JobList from './pages/JobList'
import JobForm from './pages/JobForm'
import ProgramList from './pages/ProgramList'
import ProgramManage from './pages/ProgramManage'
import ProgramForm from './pages/ProgramForm'
import ProgramShell from './pages/ProgramShell'
import ProgramDetail from './pages/ProgramDetail'
import ProgramNoticeView from './pages/ProgramNoticeView'
import ProgramBlacklist from './pages/ProgramBlacklist'
import SettingsProfile from './pages/SettingsProfile'
import SettingsAvailability from './pages/SettingsAvailability'
import AssistantStudents from './pages/AssistantStudents'
import AssistantAdvisor from './pages/AssistantAdvisor'
import AssistantAdvisorRecords from './pages/AssistantAdvisorRecords'
import ProfessorAdvisees from './pages/ProfessorAdvisees'
import ProfessorStudents from './pages/ProfessorStudents'
import ProfessorCounselRequests from './pages/ProfessorCounselRequests'
import ProfessorCounselRecords from './pages/ProfessorCounselRecords'
import ProfessorSchedule from './pages/ProfessorSchedule'
import ProfessorProfile from './pages/ProfessorProfile'
import NotReady from './pages/NotReady'
import { hasActiveSession, getActiveUser } from './data/staff'
import type { StaffRole } from './data/schema/staff'

/** 로그인 게이트 — 활성 교직원 세션이 없으면 /login 으로 보낸다. */
function RequireLogin() {
  if (!hasActiveSession()) return <Navigate to="/login" replace />
  return <Outlet />
}

/** 역할 가드 — 허용 역할이 아니면 홈으로. navConfig의 섹션 roles와 짝을 이룬다.
 *  (상담사 그룹 ['career','psych'] · 진로 전용 ['career'] · 교수 · 조교) */
function RequireRole({ roles }: { roles: StaffRole[] }) {
  if (!roles.includes(getActiveUser().role)) return <Navigate to="/" replace />
  return <Outlet />
}

/** '/' 진입 — 역할별 랜딩. 상담사는 대시보드, 교수·조교는 각자 첫 화면으로. */
function RoleHome() {
  const role = getActiveUser().role
  if (role === 'professor') return <Navigate to="/professor/advisees" replace />
  if (role === 'assistant') return <Navigate to="/assistant/students" replace />
  return <Home />
}

/** 설정 > 내 프로필 — 상담사는 프로필 편집기, 교수·조교는 준비 중. */
function RoleSettings() {
  const role = getActiveUser().role
  if (role === 'career' || role === 'psych') return <SettingsProfile />
  return <NotReady title="내 프로필" />
}

const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    {
      element: <RequireLogin />,
      children: [
        // 인쇄면 — 레이아웃(GNB·사이드바) 밖에 두어 화면 그대로가 인쇄물이 된다.
        { path: '/counsel/records/:recordId/print', element: <CounselRecordPrint /> },
        {
          element: <Layout />,
          children: [
            // 역할별 홈 진입
            { path: '/', element: <RoleHome /> },

            // ── 상담사 (career + psych) ──
            {
              element: <RequireRole roles={['career', 'psych']} />,
              children: [
                { path: '/counsel/requests', element: <CounselRequests /> },
                { path: '/counsel/schedule', element: <CounselSchedule /> },
                { path: '/counsel/session/:studentId', element: <CounselSession /> },
                { path: '/counsel/records', element: <CounselRecords /> },
                { path: '/counsel/groups', element: <GroupCounsels /> },
                { path: '/counsel/stats', element: <CounselStats /> },
                { path: '/students', element: <StudentList /> },
                { path: '/students/diagnostics', element: <DiagnosisStatus /> },
                { path: '/students/:id', element: <StudentDetail /> },
                { path: '/settings/availability', element: <SettingsAvailability /> },
              ],
            },

            // ── 심리 전용 [psych] — 심리검사 결과 작성 ──
            {
              element: <RequireRole roles={['psych']} />,
              children: [
                { path: '/counsel/psych-tests', element: <PsychTests /> },
              ],
            },

            // ── 진로 전용 [career] — 로드맵·채용공고·비교과 운영 ──
            {
              element: <RequireRole roles={['career']} />,
              children: [
                { path: '/roadmap/requests', element: <RoadmapRequests /> },
                { path: '/roadmap/:studentId', element: <RoadmapEditor /> },
                { path: '/jobs', element: <JobList /> },
                { path: '/jobs/new', element: <JobForm /> },
                { path: '/jobs/:id/edit', element: <JobForm /> },
                { path: '/programs', element: <ProgramList /> },
                { path: '/programs/manage', element: <ProgramManage /> },
                { path: '/programs/new', element: <ProgramForm /> },
                { path: '/programs/blacklist', element: <ProgramBlacklist /> },
                { path: '/programs/:id/notice', element: <ProgramNoticeView /> },
                {
                  path: '/programs/:id',
                  element: <ProgramShell />,
                  children: [
                    { index: true, element: <Navigate to="edit" replace /> },
                    { path: 'edit', element: <ProgramForm /> },
                    { path: 'applicants', element: <ProgramDetail mode="applicants" /> },
                    { path: 'selected', element: <ProgramDetail mode="selected" /> },
                  ],
                },
              ],
            },

            // ── 교수 (professor) — SPEC §3-5 (기능 화면은 후속 슬라이스) ──
            {
              element: <RequireRole roles={['professor']} />,
              children: [
                { path: '/professor/advisees', element: <ProfessorAdvisees /> },
                { path: '/professor/students', element: <ProfessorStudents /> },
                { path: '/professor/counsel/requests', element: <ProfessorCounselRequests /> },
                { path: '/professor/counsel/records', element: <ProfessorCounselRecords /> },
                { path: '/professor/schedule', element: <ProfessorSchedule /> },
                { path: '/professor/profile', element: <ProfessorProfile /> },
              ],
            },

            // ── 조교 (assistant) — SPEC §3-2 ──
            {
              element: <RequireRole roles={['assistant']} />,
              children: [
                { path: '/assistant/students', element: <AssistantStudents /> },
                { path: '/assistant/advisor', element: <AssistantAdvisor /> },
                { path: '/assistant/advisor/records', element: <AssistantAdvisorRecords /> },
                { path: '/assistant/companies', element: <NotReady title="학과 추천기업 관리" /> },
              ],
            },

            // ── 설정 (전 역할 공통) ──
            { path: '/settings', element: <RoleSettings /> },

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
