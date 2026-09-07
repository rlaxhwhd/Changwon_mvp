import { useState } from 'react'
import { LuChartNoAxesColumn, LuDownload, LuFrown } from 'react-icons/lu'
import EmptyState from '../components/EmptyState'
import { getActiveCounselor } from '../data/counselors'
import { getCounselStats, PERIOD_OPTIONS, toStatsCsv } from '../data/counselStats'
import type { Bucket, PeriodPreset, StatsScope } from '../data/counselStats'
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

export default function CounselStats() {
  const counselor = getActiveCounselor()
  const myType = handledRequestTypes(counselor.role)[0]
  const [scope, setScope] = useState<StatsScope>('mine')
  const [period, setPeriod] = useState<PeriodPreset>('6')

  // 내 상담 범위는 내가 다루는 유형으로 한정한다. 전체 범위는 전 유형을 본다.
  const stats = getCounselStats({
    counselorId: counselor.id,
    scope,
    type: scope === 'mine' ? myType : undefined,
    period,
  })
  const { totals } = stats
  const maxMonth = Math.max(...stats.byMonth.map(m => m.requested), 1)

  const download = () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(
      new Blob([`\uFEFF${toStatsCsv(stats)}`], { type: 'text/csv;charset=utf-8' }),
    )
    link.download = `상담통계_${scope === 'mine' ? counselor.name : '전체'}_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
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
          <LuDownload /> CSV 내려받기
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
          <span>기간</span>
          <select value={period} onChange={event => setPeriod(event.target.value as PeriodPreset)}>
            {PERIOD_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
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
              ['기록지 작성률', `${totals.recordedRate}%`, '완료 건 기준'],
            ] as const).map(([label, value, hint]) => (
              <div className="admin-statsum-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{hint}</small>
              </div>
            ))}
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
              <div className="admin-card-head"><h2>유형별</h2></div>
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
