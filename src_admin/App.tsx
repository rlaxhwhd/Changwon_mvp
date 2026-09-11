import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import SystemManagement from './pages/SystemManagement'
import AcademicDirectory from './pages/AcademicDirectory'
import { hasActiveSession } from './data/session'
import Home from './pages/Home'
import CounselRequests from './pages/CounselRequests'
import CounselSchedule from './pages/CounselSchedule'
import CounselSession from './pages/CounselSession'
import CounselJournals from './pages/CounselJournals'
import CounselRecordPrint from './pages/CounselRecordPrint'
import CounselStats from './pages/CounselStats'
import DiagnosisStatus from './pages/DiagnosisStatus'
import GroupCounsels from './pages/GroupCounsels'
import PsychTests from './pages/PsychTests'
import PsychCounselRecordNew from './pages/PsychCounselRecordNew'
import StudentList from './pages/StudentList'
import StudentAll from './pages/StudentAll'
import StudentDetail from './pages/StudentDetail'
import RoadmapRequests from './pages/RoadmapRequests'
import RoadmapProgress from './pages/RoadmapProgress'
import RoadmapEditor from './pages/RoadmapEditor'
import RoadmapCreate from './pages/RoadmapCreate'
import JobList from './pages/JobList'
import JobForm from './pages/JobForm'
import JobView from './pages/JobView'
import JobManage from './pages/JobManage'
import JobApplicantsList from './pages/JobApplicantsList'
import JobApplicants from './pages/JobApplicants'
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
import { getActiveUser } from './data/staff'
import type { StaffRole } from './data/schema/staff'

/** 로그인 게이트 — 지금은 통과시킨다.
 *  목업 공유용이라 /admin 을 열면 로그인을 거치지 않고 바로 화면이 나와야 한다.
 *  세션이 없어도 getActiveUser() 가 STAFF_USERS[0](상담사)로 떨어지므로
 *  역할·권한 판정은 그대로 성립한다.
 *  /login 라우트는 남겨 둔다 — 역할 전환 화면으로 여전히 쓴다.
 *  ★ 되살릴 때는 아래 한 줄의 주석만 풀면 된다. */
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
  if (role === 'admin') return <Navigate to="/system" replace />
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
        // 다건(?ids=)을 :recordId 보다 먼저 둔다 — 'print'가 id로 잡히지 않게.
        { path: '/counsel/records/print', element: <CounselRecordPrint /> },
        { path: '/counsel/records/:recordId/print', element: <CounselRecordPrint /> },
        {
          element: <Layout />,
          children: [
            // 역할별 홈 진입
            { path: '/', element: <RoleHome /> },
            // ── 시스템관리자 — 상단바 항목은 navConfig 의 admin 섹션과 짝이다.
            //    시스템 관리 외 항목과 현행 시스템관리 메뉴 대부분은 자리만 있다(NotReady).
            //    key 로 탭마다 상태(페이지·편집 폼)를 새로 시작한다.
            {
              element: <RequireRole roles={['admin']} />,
              children: [
                { path: '/system', element: <Navigate to="/system/menus" replace /> },
                { path: '/system/menus', element: <SystemManagement key="menus" tab="menus" /> },
                { path: '/system/codes', element: <SystemManagement key="codes" tab="codes" /> },
                { path: '/system/events', element: <SystemManagement key="events" tab="events" /> },
                { path: '/system/issues', element: <SystemManagement key="issues" tab="issues" /> },
                { path: '/members', element: <Navigate to="/members/assignments" replace /> },
                { path: '/members/assignments', element: <SystemManagement key="assignments" tab="assignments" /> },
                { path: '/members/academic', element: <AcademicDirectory /> },
                { path: '/notices', element: <SystemManagement key="notices" tab="notices" /> },
                ...[
                  ['/forecast', '취업예측분석시스템'], ['/diagnosis', '진단관리'], ['/counsel', '상담관리'], ['/roadmap', '로드맵관리'],
                  ['/extracurricular', '비교과프로그램관리'], ['/companies', '기업정보플랫폼'],
                  ['/system/groups', '그룹관리'], ['/system/auth', '권한관리'], ['/system/boards', '게시판관리'], ['/system/banners', '배너관리'],
                  ['/system/popups', '팝업관리'], ['/system/surveys', '설문조사 관리'], ['/system/access-log', '사용자 접속이력'],
                  ['/system/work-access', '업무접근 현황'], ['/system/access-stats', '접속통계'], ['/system/access-path', '접근경로'],
                  ['/system/admin-ip', '관리자 IP관리'], ['/system/auth-events', '권한변경이력'], ['/system/sms', 'SMS 관리'],
                ].map(([path, title]) => ({ path, element: <NotReady title={title} /> })),
              ],
            },

            // ── 상담사 (career + psych) ──
            {
              element: <RequireRole roles={['career', 'psych']} />,
              children: [
                { path: '/counsel/requests', element: <CounselRequests /> },
                { path: '/counsel/schedule', element: <CounselSchedule /> },
                { path: '/counsel/session/:studentId', element: <CounselSession /> },
                { path: '/counsel/journals', element: <CounselJournals /> },
                // 옛 「완료 상담 내역」 — 상담일지 대장의 '완료' 필터와 같은 집합이라 흡수했다.
                { path: '/counsel/records', element: <Navigate to="/counsel/journals" replace /> },
                { path: '/counsel/groups', element: <GroupCounsels /> },
                { path: '/counsel/stats', element: <CounselStats /> },
                { path: '/diagnosis/status', element: <DiagnosisStatus /> },
                { path: '/students', element: <StudentList /> },
                // '/students/all' 은 반드시 ':id' 보다 위에 — 아래로 내려가면 id='all' 로 잡힌다.
                { path: '/students/all', element: <StudentAll /> },
                { path: '/students/:id', element: <StudentDetail /> },
                { path: '/settings/availability', element: <SettingsAvailability /> },
              ],
            },

            // ── 심리 전용 [psych] — 심리검사 결과 작성 ──
            {
              element: <RequireRole roles={['psych']} />,
              children: [
                { path: '/counsel/psych-tests', element: <PsychTests /> },
                { path: '/counsel/psych-records/new', element: <PsychCounselRecordNew /> },
              ],
            },

            // ── 진로 전용 [career] — 로드맵·채용공고·비교과 운영 ──
            {
              element: <RequireRole roles={['career']} />,
              children: [
                { path: '/roadmap/requests', element: <RoadmapRequests /> },
                { path: '/roadmap/progress', element: <RoadmapProgress /> },
                // ⚠ '/roadmap/create' 는 반드시 ':studentId' 보다 위에 — 아래로 내려가면
                //   studentId='create' 인 학생을 찾다가 「찾을 수 없습니다」로 떨어진다.
                { path: '/roadmap/create', element: <RoadmapCreate /> },
                { path: '/roadmap/:studentId', element: <RoadmapEditor /> },
                { path: '/jobs', element: <JobList scope="internal" /> },
                { path: '/jobs/external', element: <JobList scope="external" /> },
                { path: '/jobs/new', element: <JobForm /> },
                // 고정 경로는 ':id' 보다 위에 — 아래로 내려가면 id='manage' 로 잡힌다.
                { path: '/jobs/manage', element: <JobManage /> },
                // 지원자관리는 :id/edit 보다 먼저 둔다 — 'applicants'가 :id 로 먹히지 않도록.
                { path: '/jobs/applicants', element: <JobApplicantsList /> },
                { path: '/jobs/applicants/:jobId', element: <JobApplicants /> },
                { path: '/jobs/:id/edit', element: <JobForm /> },
                { path: '/jobs/:id', element: <JobView /> },
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
