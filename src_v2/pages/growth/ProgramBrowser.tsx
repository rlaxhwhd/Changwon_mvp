import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { LuSearch } from 'react-icons/lu'
import { PROGRAM_AUDIENCES, PROGRAM_ORDERS, programAudiences, sortPrograms } from '../../../src_admin/data/programs'
import type { ProgramAudience, ProgramOrder } from '../../../src_admin/data/programs'
import { PROGRAM_STATUSES, programStatusLabel } from '../../../src_admin/data/schema/program'
import type { Program, ProgramStatus } from '../../../src_admin/data/schema/program'
import ProgramCardGrid from './ProgramCardGrid'
import './ProgramBrowser.css'

const ALL = '전체'
const AUDIENCE_TABS: { value: ProgramAudience | typeof ALL; label: string }[] = [{ value: ALL, label: ALL }, ...PROGRAM_AUDIENCES]

interface Props {
  programs: Program[]
  onSelect: (id: string) => void
  /** 조건에 맞는 공고가 없을 때 보일 화면 — 포털마다 안내가 다르다. */
  empty: ReactNode
  /** 정렬 옆에 붙는 포털 전용 도구(학생의 찜 목록 보기). */
  actions?: ReactNode
  wished?: Set<string>
  onToggleWish?: (id: string) => void
  /** 대상·상태 선택 상자 대신 대상 태그 버튼을 쓴다(학생). */
  audienceTabs?: boolean
}

/** 비교과 공고 목록(검색·필터·정렬·카드) — 학생 /v2/programs 와 교직원 /admin/programs 가 같은 것을 쓴다. */
export default function ProgramBrowser({ programs, onSelect, empty, actions, wished, onToggleWish, audienceTabs }: Props) {
  const [query, setQuery] = useState('')
  const [audience, setAudience] = useState<ProgramAudience | typeof ALL>(ALL)
  const [status, setStatus] = useState<ProgramStatus | typeof ALL>(ALL)
  const [order, setOrder] = useState<ProgramOrder>('recommended')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = programs.filter(p => {
      if (audience !== ALL && !programAudiences(p).some(a => a.value === audience)) return false
      if (status !== ALL && p.status !== status) return false
      if (q && !`${p.title} ${p.desc} ${p.location}`.toLowerCase().includes(q)) return false
      return true
    })
    return sortPrograms(filtered, order)
  }, [programs, query, audience, status, order])

  return (
    <div className="pb">
      <div className="pb-filterbar">
        <div className="pb-search">
          <LuSearch />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="프로그램명·장소 검색"
          />
        </div>
        {audienceTabs ? (
          <div className="pb-tabs" role="group" aria-label="대상">
            {AUDIENCE_TABS.map(a => (
              <button
                key={a.value}
                type="button"
                className={`pb-tab${audience === a.value ? ' active' : ''}`}
                aria-pressed={audience === a.value}
                onClick={() => setAudience(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <label className="pb-select">
              <span>대상</span>
              <select value={audience} onChange={e => setAudience(e.target.value as ProgramAudience | typeof ALL)}>
                <option value={ALL}>{ALL}</option>
                {PROGRAM_AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            <label className="pb-select">
              <span>상태</span>
              <select value={status} onChange={e => setStatus(e.target.value as ProgramStatus | typeof ALL)}>
                <option value={ALL}>{ALL}</option>
                {PROGRAM_STATUSES.map(s => <option key={s} value={s}>{programStatusLabel(s)}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="pb-toolbar">
        <span className="pb-count">검색 결과 {list.length}건</span>
        <div className="pb-tools">
          {actions}
          <label className="pb-select">
            <select aria-label="정렬" value={order} onChange={e => setOrder(e.target.value as ProgramOrder)}>
              {PROGRAM_ORDERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <section className="pb-card">
        {list.length === 0 ? empty : (
          <ProgramCardGrid programs={list} onSelect={onSelect} wished={wished} onToggleWish={onToggleWish} />
        )}
      </section>
    </div>
  )
}
