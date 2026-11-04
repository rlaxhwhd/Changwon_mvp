import { useMetadata } from '../../shared/useMetadata'
import { LuFrown, LuGraduationCap, LuPlus, LuUserX } from 'react-icons/lu'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPrograms, countPrograms } from '../data/programs'
import { programStatusLabel } from '../data/schema/program'
import EmptyState from '../components/EmptyState'
import ProgramBrowser from '../../src_v2/pages/growth/ProgramBrowser'

export default function ProgramList() {
  useMetadata()
  const navigate = useNavigate()
  const all = useMemo(() => getPrograms(), [])
  const counts = useMemo(() => countPrograms(), [])

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">비교과 프로그램</h1>
          <p className="admin-page-desc">
            등록 {counts.total}건 · {programStatusLabel('RECRUITING')} {counts.RECRUITING} — 학생 비교과 신청의 공급 측. 신청자·출석을 관리합니다.
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs/blacklist" className="admin-btn admin-btn-ghost">
            <LuUserX /> 블랙리스트
          </Link>
          <Link to="/programs/new" className="admin-btn admin-btn-primary">
            <LuPlus /> 프로그램 등록
          </Link>
        </div>
      </header>

      <ProgramBrowser
        programs={all}
        onSelect={id => navigate(`/programs/${id}/notice`)}
        empty={all.length === 0 ? (
          <EmptyState
            icon={LuGraduationCap}
            title="등록된 비교과 프로그램이 없습니다"
            message="프로그램을 등록하면 학생 비교과 신청 화면의 공급 목록에 노출됩니다."
            action={{ label: '프로그램 등록하기', onClick: () => navigate('/programs/new') }}
          />
        ) : <EmptyState icon={LuFrown} message="조건에 맞는 프로그램이 없습니다." />}
      />
    </div>
  )
}
