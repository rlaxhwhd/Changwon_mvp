import { LuClipboardList, LuPin, LuPlus } from 'react-icons/lu'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { getPrograms, sortByPriority, updateProgram } from '../data/programs'
import type { Program } from '../data/schema/program'

type OperationStatus = '운영전' | '운영중' | '운영완료' | Program['status'] | '상태 미정'

function getOperationStatus(program: Program, today: string): OperationStatus {
  if (!program.runStartDate || !program.runEndDate) return program.status || '상태 미정'
  if (today < program.runStartDate) return '운영전'
  if (today > program.runEndDate) return '운영완료'
  return '운영중'
}

function statusClass(status: OperationStatus): string {
  if (status === '운영중') return 'admin-chip-ok'
  if (status === '운영완료') return 'admin-chip-done'
  if (status === '운영전') return 'admin-chip-wait'
  return 'admin-chip-cancel'
}

function period(program: Program): string {
  if (!program.runStartDate && !program.runEndDate) return '미정'
  return `${program.runStartDate || '미정'} ~ ${program.runEndDate || '미정'}`
}

export default function ProgramManage() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState<Program[]>(() => sortByPriority(getPrograms()))
  const today = new Date().toISOString().slice(0, 10)

  const togglePin = (id: string, pinned: boolean) => {
    updateProgram(id, { pinned })
    setPrograms(sortByPriority(getPrograms()))
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">프로그램 관리</h1>
          <p className="admin-page-desc">등록된 비교과 프로그램의 운영 현황을 확인합니다.</p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs/new" className="admin-btn admin-btn-primary">
            <LuPlus /> 프로그램 등록
          </Link>
        </div>
      </header>

      <section className="admin-card">
        {programs.length === 0 ? (
          <EmptyState
            icon={LuClipboardList}
            title="등록된 프로그램이 없습니다"
            message="프로그램을 등록하면 운영 현황을 이곳에서 관리할 수 있습니다."
            action={{ label: '프로그램 등록', onClick: () => navigate('/programs/new') }}
          />
        ) : (
          <div className="admin-roster admin-program-manage-roster">
            <div className="admin-roster-head">
              <span>상단고정</span>
              <span>번호</span>
              <span>회계년도</span>
              <span>프로그램명</span>
              <span>총회차</span>
              <span>운영기간</span>
              <span>모집인원</span>
              <span>신청인원</span>
              <span>운영상태</span>
              <span>담당자</span>
            </div>
            {programs.map((program, index) => {
              const operationStatus = getOperationStatus(program, today)
              return (
                <div
                  key={program.id}
                  role="button"
                  tabIndex={0}
                  className={`admin-roster-row${program.pinned ? ' is-pinned' : ''}`}
                  onClick={() => navigate(`/programs/${program.id}/edit`)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/programs/${program.id}/edit`)
                    }
                  }}
                >
                  <span
                    className="admin-roster-cell admin-pin-cell"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <label className="admin-pin-toggle" title="상단 고정">
                      <input
                        type="checkbox"
                        checked={!!program.pinned}
                        onChange={e => togglePin(program.id, e.target.checked)}
                      />
                      <LuPin />
                    </label>
                  </span>
                  <span className="admin-roster-cell">{programs.length - index}</span>
                  <span className="admin-roster-cell">{program.fiscalYear}</span>
                  <span className="admin-roster-cell"><strong>{program.title}</strong></span>
                  <span className="admin-roster-cell">{program.sessions}회</span>
                  <span className="admin-roster-cell"><small>{period(program)}</small></span>
                  <span className="admin-roster-cell">{program.capacity}명</span>
                  <span className="admin-roster-cell">{program.applicants.length}명</span>
                  <span><span className={`admin-chip ${statusClass(operationStatus)}`}>{operationStatus}</span></span>
                  <span className="admin-roster-cell">{program.manager || '미지정'}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
