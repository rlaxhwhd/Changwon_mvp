import { useMemo, useRef } from 'react'
import { LuRotateCcw } from 'react-icons/lu'
import { departments } from '../../shared/departmentStore'
import { STUDENT_TYPES, TYPE_PENDING_LABEL } from '../../src_v2/data/careerProcess'
import type { StatsFilters } from '../data/statsOverview'

// ─────────────────────────────────────────────────────────────────────────
// 통계 화면 공통 필터 한 줄 — 기간(달력 날짜 두 개)·단과대·학과·학년·진단유형·초기화.
// 통계 현황·KPI통계가 같이 쓴다. 기간 프리셋(개월)은 사용자 지시로 뺐다(2026-11-23).
// 아래 모든 수치·차트가 같은 조건을 본다 — 차트 카드 안에 필터를 두지 않는다.
// ─────────────────────────────────────────────────────────────────────────

function DotDateInput({ label, value, min, max, onChange }: { label: string; value: string; min?: string; max?: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <span className="admin-dot-date">
      <input ref={ref} type="date" aria-label={label} value={value} min={min} max={max} required
        onClick={() => ref.current?.showPicker?.()} onChange={e => { if (e.target.value) onChange(e.target.value) }} />
      <span aria-hidden="true">{value.replaceAll('-', '.')}</span>
    </span>
  )
}

export default function StatsFilterBar({ filters, onChange, onReset }: {
  filters: StatsFilters; onChange: (patch: Partial<StatsFilters>) => void; onReset: () => void
}) {
  const colleges = useMemo(() => {
    const seen = new Map<string, string>()
    for (const d of departments) seen.set(d.collegeCode, d.collegeName)
    return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [])
  const depts = useMemo(() => {
    const seen = new Map<string, string>()
    for (const d of departments) if (!filters.college || d.collegeCode === filters.college) seen.set(d.deptCode, d.deptName)
    return [...seen.entries()].sort(([, a], [, b]) => a.localeCompare(b, 'ko'))
  }, [filters.college])

  return (
    <section className="sd-filterbar" aria-label="통계 필터">
      <div className="sd-filter-group">
        <span className="sd-filter-label">기간</span>
        <span className="admin-date-range">
          <DotDateInput label="시작일" value={filters.from} max={filters.to} onChange={v => onChange({ from: v })} />~
          <DotDateInput label="종료일" value={filters.to} min={filters.from} onChange={v => onChange({ to: v })} />
        </span>
      </div>
      <label className="admin-select"><span>단과대학</span>
        <select value={filters.college} onChange={e => onChange({ college: e.target.value, dept: '' })}>
          <option value="">전체</option>{colleges.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select></label>
      <label className="admin-select"><span>학과</span>
        <select value={filters.dept} onChange={e => onChange({ dept: e.target.value })}>
          <option value="">전체</option>{depts.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select></label>
      <label className="admin-select"><span>학년</span>
        <select value={filters.grade} onChange={e => onChange({ grade: e.target.value })}>
          <option value="">전체</option>{[1, 2, 3, 4].map(g => <option key={g} value={g}>{g}학년</option>)}
        </select></label>
      <label className="admin-select"><span>진단유형</span>
        <select value={filters.type} onChange={e => onChange({ type: e.target.value })}>
          <option value="">전체</option>
          {STUDENT_TYPES.map(t => <option key={t.code} value={t.code}>{t.code} {t.label}</option>)}
          <option value="NONE">{TYPE_PENDING_LABEL}</option>
        </select></label>
      <button type="button" className="admin-btn sd-reset" onClick={onReset}><LuRotateCcw /> 초기화</button>
    </section>
  )
}
