import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
// 순차 게이팅은 라우트 한 곳에서 건다 — 화면은 자기가 잠겼는지 알 필요가 없다(CLAUDE.md 13조).
import StageGate from './components/StageGate'
import Main from './pages/Main'

// AI 커리어 라운지
import AiLounge from './pages/AiLounge'

// 역량 강화
import GrowthHome from './pages/growth/GrowthHome'
import ProgramApply from './pages/growth/ProgramApply'
import ProgramDetail from './pages/growth/ProgramDetail'
import RoadmapRequest from './pages/roadmap/RoadmapRequest'
import QuestBoard from './pages/growth/QuestBoard'
import GrowthJournal from './pages/growth/GrowthJournal'
import GrowthJournalForm from './pages/growth/GrowthJournalForm'
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
import AiJobs from './pages/roadmap/AiJobs'
import AiResume from './pages/roadmap/AiResume'

// 취업지원
import JobSupport from './pages/jobs/JobSupport'
import JobDetail from './pages/jobs/JobDetail'
import JobsHome from './pages/jobs/JobsHome'
import AiConsulting from './pages/jobs/AiConsulting'
import Notices from './pages/jobs/Notices'

// STAR 트랙 — 선발된 학생만 들어오는 별도 트랙. GNB 우측 STAR 표식이 진입점이다.
import StarTrack from './pages/star/StarTrack'

// 마이페이지
import Portfolio from './pages/mypage/Portfolio'
import MyPrograms from './pages/mypage/MyPrograms'
import MyApplications from './pages/mypage/MyApplications'
import CounselStatus from './pages/mypage/CounselStatus'
import Attendance from './pages/mypage/Attendance'
import { getActiveStudent } from './data/students'

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

        // STAR 트랙 (선발형) — 주 메뉴가 아니라 상단바 STAR 표식으로 들어온다
        { path: '/star', element: <StarTrack /> },

        // 역량 강화 — 로드맵이 정한 것을 실행하는 단계라 로드맵 확정 후 열린다.
        //   ⚠ 성장일지·미션은 게이팅 밖이다. 진단 전에도 기록은 남길 수 있어야 한다.
        { path: '/growth',              element: <StageGate stage="growth" title="내 성장"><GrowthHome /></StageGate> },
        { path: '/growth/program',      element: <StageGate stage="growth" title="비교과 프로그램"><ProgramApply /></StageGate> },
        { path: '/growth/program/:id',  element: <StageGate stage="growth" title="비교과 프로그램"><ProgramDetail /></StageGate> },
        { path: '/growth/quest',        element: <StageGate stage="growth" title="퀘스트 보드"><QuestBoard /></StageGate> },
        { path: '/growth/roadmap-status', element: <StageGate stage="roadmap" title="로드맵 진행 현황"><RoadmapStatus /></StageGate> },
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

        // 전문상담 — 라우트에 게이트를 두지 않는다. 일반 진로취업·심리·교수 상담은
        // CARE 7+ 파이프라인 밖이라 진단 없이 신청한다(PROCESS.md §2). 진단 2종을
        // 요구하는 것은 CareerCounsel 안의 「CARE 7+ 연계 상담」 카드 하나뿐이다.
        { path: '/counsel',           element: <Navigate to="/counsel/career" replace /> },
        { path: '/counsel/career',    element: <CareerCounsel /> },
        { path: '/counsel/psych',     element: <PsychCounsel /> },
        { path: '/counsel/professor', element: <ProfessorCounsel /> },

        // 경력개발 로드맵 — 상담에서 만들어진다. 상담 전에는 볼 것이 없다.
        { path: '/roadmap',             element: <Navigate to="/roadmap/skill-tree" replace /> },
        { path: '/roadmap/ai',          element: <Navigate to="/roadmap/skill-tree" replace /> },
        { path: '/roadmap/skill-tree',  element: <StageGate stage="roadmap" title="경력개발 로드맵"><AiRoadmap /></StageGate> },
        { path: '/roadmap/request',     element: <StageGate stage="roadmap" title="로드맵 변경 요청"><RoadmapRequest /></StageGate> },
        { path: '/roadmap/final',       element: <Navigate to="/roadmap/skill-tree" replace /> },
        // 구 경로 → 신 경로 (취업지원 하위로 이동)
        { path: '/roadmap/jobs',        element: <Navigate to="/jobs/joblist" replace /> },
        { path: '/roadmap/resume',      element: <Navigate to="/jobs/home" replace /> },

        // 취업지원 — 로드맵이 확정돼야 열린다(PROCESS.md §2).
        { path: '/jobs',                 element: <StageGate stage="employment" title="취업지원"><JobSupport scope="internal" /></StageGate> },
        { path: '/jobs/external',        element: <StageGate stage="employment" title="취업지원"><JobSupport scope="external" /></StageGate> },
        { path: '/jobs/joblist',         element: <StageGate stage="employment" title="AI 맞춤채용"><AiJobs /></StageGate> },
        { path: '/jobs/home',            element: <StageGate stage="employment" title="취업지원"><JobsHome /></StageGate> },
        { path: '/jobs/home/resume',     element: <StageGate stage="employment" title="AI 자소서"><AiResume /></StageGate> },
        { path: '/jobs/home/consulting', element: <StageGate stage="employment" title="AI 면접 코칭"><AiConsulting /></StageGate> },
        { path: '/jobs/resume',          element: <Navigate to="/jobs/home" replace /> },
        // 공지사항: /mypage/notices 에서 취업지원 하위로 옮겼다(기존 경로는 하위 호환용 리다이렉트).
        // ⚠ '/jobs/:id' 보다 위에 둔다 — 정적 세그먼트가 먼저 읽히게 해 공고 상세로 새지 않게 한다.
        { path: '/jobs/notices',         element: <Notices /> },
        // 목록과 같은 게이트를 건다 — 상세 직접 URL 로 순서를 우회할 수 없어야 한다(CLAUDE.md 13조).
        { path: '/jobs/:id',             element: <StageGate stage="employment" title="채용공고 상세"><JobDetail /></StageGate> },

        // 마이페이지
        { path: '/mypage',           element: <Navigate to={getActiveStudent().grade >= 4 ? '/mypage/portfolio' : '/mypage/programs'} replace /> },
        { path: '/mypage/portfolio',  element: getActiveStudent().grade >= 4 ? <Portfolio /> : <Navigate to="/growth" replace /> },
        { path: '/mypage/programs',   element: <StageGate stage="growth" title="비교과 프로그램 현황"><MyPrograms /></StageGate> },
        { path: '/mypage/applications', element: <MyApplications /> },
        { path: '/mypage/notices',    element: <Navigate to="/jobs/notices" replace /> },
        // 상담 현황: 라우팅을 /counsel/record로 이동 (기존 /mypage/counsel은 하위 호환용 리다이렉트)
        // 신청이 가능하면 그 조회도 가능해야 한다 — 일반 상담을 낸 신입생이 자기
        // 신청 결과를 못 보면 신청 완료 안내가 잠긴 화면을 가리키게 된다.
        { path: '/counsel/record',    element: <CounselStatus /> },
        { path: '/mypage/counsel',    element: <Navigate to="/counsel/record" replace /> },
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
  return <RouterProvider router={router} />
}
