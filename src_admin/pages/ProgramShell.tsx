import { useCallback, useEffect, useState } from 'react'
import { LuChartColumn, LuFrown, LuGraduationCap, LuList, LuPencil, LuSmile, LuUserCheck, LuUsers, LuUserX } from 'react-icons/lu'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getProgramById, pendingApplicants, selectedApplicants } from '../data/programs'
import type { Program } from '../data/schema/program'
import { categoryLabel } from '../data/schema/program'
import EmptyState from '../components/EmptyState'
import { PROGRAM_EVENT, refreshProgram } from '../../shared/programStore'
import { useStore } from '../../shared/useRoadmapStore'

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
  const location = useLocation()
  useStore(PROGRAM_EVENT)
  const [, bumpVersion] = useState(0)
  const refresh = useCallback(() => bumpVersion(v => v + 1), [])
  const [retry, setRetry] = useState(0)
  const requestKey = `${id}:${location.key}:${retry}`
  const [loaded, setLoaded] = useState({ key: '', error: '' })
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    refreshProgram(id, controller.signal)
      .then(() => { if (!controller.signal.aborted) setLoaded({ key: requestKey, error: '' }) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, error: error instanceof Error ? error.message : '프로그램을 불러오지 못했습니다.' })
      })
    return () => controller.abort()
  }, [id, requestKey])
  const program = id ? getProgramById(id) : undefined

  if (id && loaded.key !== requestKey) return <div className="admin-page" role="status">프로그램과 신청 내역을 불러오는 중입니다…</div>
  if (loaded.error) return <div className="admin-page" role="alert">
    <p>{loaded.error}</p>
    <button className="admin-btn admin-btn-ghost" onClick={() => setRetry(value => value + 1)}>다시 시도</button>
    <Link className="admin-btn admin-btn-ghost" to="/programs/manage">프로그램 목록으로</Link>
  </div>

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
        <NavLink to={`/programs/${program.id}/satisfaction`} className={tabClass}>
          <LuSmile /> 만족도조사
        </NavLink>
        <NavLink to={`/programs/${program.id}/survey`} className={tabClass}>
          <LuChartColumn /> 향상도조사
        </NavLink>
      </div>

      <Outlet context={{ program, refresh } satisfies ProgramTabContext} />
    </div>
  )
}
