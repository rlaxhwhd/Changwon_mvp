import { useRef, useState } from 'react'
import { LuChartNoAxesColumn, LuDownload, LuFrown } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { getJournalRows, getJournalSummary } from '../data/counselJournals'
import { getActiveCounselor } from '../data/counselors'
import { defaultStatsRange, DIAG_TYPE_OPTIONS, getCounselStats, toStatsRows } from '../data/counselStats'
import type { Bucket, StatsParams, StatsScope } from '../data/counselStats'
import { downloadXlsx } from '../../shared/xlsx'
import { handledRequestTypes } from '../data/schema/counselor'

const SCOPES: { value: StatsScope; label: string }[] = [
  { value: 'mine', label: '내 상담' },
  { value: 'all', label: '전체 상담사' },
]

/** 값-막대 목록 (유형·방식·학년·학과 공용). 최대값 기준 상대 폭. */
function BucketList({ items, empty, limit }: { items: Bucket[]; empty: string; limit?: number }) {
  if (items.length === 0) return <EmptyState icon={LuFrown} message={empty} />
  const shown = limit ? items.slice(0, limit) : items
  const max = Math.max(...shown.map(item => item.count), 1)
  return (
    <ul className="admin-stat-bars">
      {shown.map(item => (
        <li key={item.label}>
          <span className="admin-stat-bar-label">{item.label}</span>
          <span className="admin-stat-bar-track">
            <span style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
          </span>
          <strong className="admin-stat-bar-value">{item.count}</strong>
        </li>
      ))}
    </ul>
  )
}

/**
 * 날짜 칸 — 표시는 YYYY.MM.DD, 값은 YYYY-MM-DD. 브라우저 날짜 칸은 로케일대로 그려
 * 형식이 들쭉날쭉하므로 투명하게 덮고, 누르면 달력(showPicker)을 연다.
 */
function DotDateInput({ label, value, min, max, onChange }: {
  label: string; value: string; min?: string; max?: string; onChange: (value: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <span className="admin-dot-date">
      <input
        ref={ref} type="date" aria-label={label} value={value} min={min} max={max} required
        onClick={() => ref.current?.showPicker?.()}
        onChange={event => { if (event.target.value) onChange(event.target.value) }}
      />
      <span aria-hidden="true">{value.replaceAll('-', '.')}</span>
    </span>
  )
}

export default function CounselStats() {
  const counselor = getActiveCounselor()
  const myType = handledRequestTypes(counselor.role)[0]
  const [scope, setScope] = useState<StatsScope>('mine')
  const [range, setRange] = useState(defaultStatsRange)
  const [diagType, setDiagType] = useState<StatsParams['diagType']>(undefined)

  // 내 상담 범위는 내가 다루는 유형으로 한정한다. 전체 범위는 전 유형을 본다.
  const stats = getCounselStats({
    counselorId: counselor.id,
    scope,
    type: scope === 'mine' ? myType : undefined,
    diagType,
    from: range.from,
    to: range.to,
  })
  const { totals } = stats
  const journal = getJournalSummary(getJournalRows(counselor.id))
  const maxMonth = Math.max(...stats.byMonth.map(m => m.requested), 1)

  const download = () => {
    downloadXlsx(`상담통계_${scope === 'mine' ? counselor.name : '전체'}_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.xlsx`, toStatsRows(stats))
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">상담 통계</h1>
          <p className="admin-page-desc">
            {scope === 'mine' ? `${counselor.name} 상담사의 ${myType} 상담` : '전 상담사 상담'} 실적을 집계합니다.
          </p>
          <p className="admin-field-hint">
            완료율·취소율의 모수는 <strong>기간 내 신청 건</strong>입니다. 상담일이 아닌 신청일 기준으로 묶입니다.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={download} disabled={totals.requested === 0}>
          <LuDownload /> 엑셀 내려받기
        </button>
      </header>

      <div className="admin-filterbar">
        <label className="admin-select">
          <span>범위</span>
          <select value={scope} onChange={event => setScope(event.target.value as StatsScope)}>
            {SCOPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <span>진단유형</span>
          <select value={diagType ?? ''} onChange={event => setDiagType((event.target.value || undefined) as StatsParams['diagType'])}>
            <option value="">전체</option>
            {DIAG_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <div className="admin-select">
          <span>기간</span>
          <div className="admin-date-range">
            <DotDateInput label="시작일" value={range.from} max={range.to} onChange={from => { if (from <= range.to) setRange(r => ({ ...r, from })) }} />
            <span aria-hidden="true">~</span>
            <DotDateInput label="종료일" value={range.to} min={range.from} onChange={to => { if (to >= range.from) setRange(r => ({ ...r, to })) }} />
          </div>
        </div>
      </div>

      {totals.requested === 0 ? (
        <section className="admin-card">
          <EmptyState icon={LuChartNoAxesColumn} message="해당 기간에 집계할 상담 신청이 없습니다." />
        </section>
      ) : (
        <>
          <div className="admin-statsum">
            {([
              ['신청', `${totals.requested}건`, `대기 ${totals.waiting} · 확정 ${totals.confirmed}`],
              ['완료', `${totals.completed}건`, `완료율 ${totals.completionRate}%`],
              ['취소', `${totals.cancelled}건`, `취소율 ${totals.cancelRate}%`],
              ['평균 소요일', `${totals.avgLeadDays}일`, '신청 → 상담일'],
            ] as const).map(([label, value, hint]) => (
              <div className="admin-statsum-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{hint}</small>
              </div>
            ))}
            {/* 옛 홈 KPI 「상담일지 미작성」 — 기간·범위와 무관하게 내 상담일지 대장 기준, 누르면 미작성 목록 */}
            <Link className="admin-statsum-card is-link" to={`/counsel/journals?status=${encodeURIComponent('미작성')}`}>
              <span>상담일지 미작성</span>
              <strong>{journal.미작성}건</strong>
              <small>{journal.완료} / {journal.total} 작성</small>
            </Link>
          </div>

          <div className="admin-card-head"><h2>월별 추이</h2></div>
          <section className="admin-card">
            <div className="admin-stat-months">
              {stats.byMonth.map(month => (
                <div className="admin-stat-month" key={month.key}>
                  <div className="admin-stat-month-bars" aria-hidden="true">
                    <span className="is-requested" style={{ height: `${Math.round((month.requested / maxMonth) * 100)}%` }} />
                    <span className="is-completed" style={{ height: `${Math.round((month.completed / maxMonth) * 100)}%` }} />
                  </div>
                  <strong>{month.requested}</strong>
                  <small>{month.key.slice(2).replace('-', '.')}</small>
                </div>
              ))}
            </div>
            <p className="admin-stat-legend">
              <em className="is-requested" /> 신청
              <em className="is-completed" /> 완료
            </p>
          </section>

          <div className="admin-statsec-grid">
            <section className="admin-card">
              <div className="admin-card-head"><h2>진단유형별</h2></div>
              <BucketList items={stats.byType} empty="집계 없음" />
            </section>
            <section className="admin-card">
              <div className="admin-card-head"><h2>방식별</h2></div>
              <BucketList items={stats.byMethod} empty="집계 없음" />
            </section>
            <section className="admin-card">
              <div className="admin-card-head"><h2>학년별</h2></div>
              <BucketList items={stats.byGrade} empty="집계 없음" />
            </section>
            <section className="admin-card">
              <div className="admin-card-head"><h2>학과별 <small>상위 10</small></h2></div>
              <BucketList items={stats.byMajor} empty="집계 없음" limit={10} />
            </section>
          </div>
        </>
      )}
    </div>
  )
}
