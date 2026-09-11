import { useCallback, useState } from 'react'
import { LuFrown, LuGraduationCap, LuList, LuPencil, LuUserCheck, LuUsers, LuUserX } from 'react-icons/lu'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { getProgramById, pendingApplicants, selectedApplicants } from '../data/programs'
import type { Program } from '../data/schema/program'
import { categoryLabel } from '../data/schema/program'
import EmptyState from '../components/EmptyState'

/** 탭 자식이 받는 컨텍스트 — 프로그램 1건은 셸이 소유한다(자식이 따로 조회하지 않는다). */
export interface ProgramTabContext {
  program: Program
  /** 신청자를 바꾼 뒤 호출 — 셸이 다시 읽어 탭 카운트까지 함께 갱신한다. */
  refresh: () => void
}

/**
 * 프로그램 관리 부모 셸 — 프로그램 수정 / 신청자 관리 / 선발자 관리 3개 탭.
 * 헤더 + 탭바를 렌더하고 각 탭 내용은 <Outlet/> 자식 라우트가 채운다.
 */
export default function ProgramShell() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // program 은 렌더마다 localStorage 를 다시 읽는다 — 자식이 신청자를 바꾸면
  // refresh() 로 이 셸을 재렌더시켜 탭 카운트와 자식 목록을 한 번에 맞춘다.
  const [, bumpVersion] = useState(0)
  const refresh = useCallback(() => bumpVersion(v => v + 1), [])
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

  // 탭 카운트는 각 탭이 실제로 보여주는 목록 길이와 같아야 한다 — 판정은 데이터층 한 곳.
  const pendingCount = pendingApplicants(program).length
  const selectedCount = selectedApplicants(program).length
  const tabClass = ({ isActive }: { isActive: boolean }) => `admin-tab${isActive ? ' active' : ''}`

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuGraduationCap /> {program.title}
          </h1>
          <p className="admin-page-desc">
            <span className="admin-tag admin-tag-soft">{categoryLabel(program.category)}</span>{' '}
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
          <LuUsers /> 신청자 관리 <span className="admin-tab-count">{pendingCount}</span>
        </NavLink>
        <NavLink to={`/programs/${program.id}/selected`} className={tabClass}>
          <LuUserCheck /> 선발자 관리 <span className="admin-tab-count">{selectedCount}</span>
        </NavLink>
      </div>

      <Outlet context={{ program, refresh } satisfies ProgramTabContext} />
    </div>
  )
}
