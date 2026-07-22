import { LuFrown, LuGraduationCap, LuList, LuPencil, LuUserCheck, LuUsers, LuUserX } from 'react-icons/lu'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { getProgramById } from '../data/programs'
import EmptyState from '../components/EmptyState'

/**
 * 프로그램 관리 부모 셸 — 프로그램 수정 / 신청자 관리 / 선발자 관리 3개 탭.
 * 헤더 + 탭바를 렌더하고 각 탭 내용은 <Outlet/> 자식 라우트가 채운다.
 */
export default function ProgramShell() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // 라우트(탭) 전환마다 재렌더되므로 매번 최신 localStorage를 읽어 카운트를 갱신한다.
  const program = id ? getProgramById(id) : undefined

  if (!program) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div><h1 className="admin-page-title">프로그램 상세</h1></div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon={LuFrown}
            message="해당 프로그램을 찾을 수 없습니다."
            action={{ label: '프로그램 목록으로', onClick: () => navigate('/programs/manage') }}
          />
        </section>
      </div>
    )
  }

  const selectedCount = program.applicants.filter(a => (a.selectionStatus ?? '대기') === '선발').length
  const tabClass = ({ isActive }: { isActive: boolean }) => `admin-tab${isActive ? ' active' : ''}`

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuGraduationCap /> {program.title}
          </h1>
          <p className="admin-page-desc">
            <span className="admin-tag admin-tag-soft">{program.category}</span>{' '}
            {program.startDate} ~ {program.endDate} · {program.location || '장소 미정'} · 정원 {program.capacity}명
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs/manage" className="admin-btn admin-btn-ghost">
            <LuList /> 목록
          </Link>
          <Link to="/programs/blacklist" className="admin-btn admin-btn-ghost">
            <LuUserX /> 블랙리스트
          </Link>
        </div>
      </header>

      <div className="admin-tabs admin-program-shell-tabs">
        <NavLink to={`/programs/${program.id}/edit`} className={tabClass}>
          <LuPencil /> 프로그램 수정
        </NavLink>
        <NavLink to={`/programs/${program.id}/applicants`} className={tabClass}>
          <LuUsers /> 신청자 관리 <span className="admin-tab-count">{program.applicants.length}</span>
        </NavLink>
        <NavLink to={`/programs/${program.id}/selected`} className={tabClass}>
          <LuUserCheck /> 선발자 관리 <span className="admin-tab-count">{selectedCount}</span>
        </NavLink>
      </div>

      <Outlet />
    </div>
  )
}
