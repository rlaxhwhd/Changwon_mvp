import { useState, type CSSProperties } from 'react'
import { LuFileDown } from 'react-icons/lu'
import { downloadXlsx } from '../../shared/xlsx'
import StatsFilterBar from '../components/StatsFilterBar'
import { getActiveUser } from '../data/staff'
import { defaultStatsFilters, type StatsFilters } from '../data/statsOverview'
import { formatKpiTarget, formatKpiValue, KPI_STATUS_LABEL, kpiReportRows, useKpiStats, type KpiIndicator } from '../data/statsKpi'

// ─────────────────────────────────────────────────────────────────────────
// KPI통계(/stats/kpi, 2026-11-23) — CARE+7 7단계 참여 퍼널 + 단계별 KPI 목표 대비 실적 표.
// 사용자 사진(DC-AD-HOME-001)을 따른다. 퍼널·자동 진단·지표값은 전부 /stats/kpi 가 준다.
// 7단계 색은 고정 순서(엔티티=색) — 필터로 값이 바뀌어도 색은 그대로.
// ─────────────────────────────────────────────────────────────────────────

const STAGE_COLORS = ['var(--blue)', 'var(--teal)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--yellow)', 'var(--red)']

export default function StatsKpi() {
  const me = getActiveUser()
  const [filters, setFilters] = useState<StatsFilters>(defaultStatsFilters)
  const set = (patch: Partial<StatsFilters>) => setFilters(f => ({ ...f, ...patch }))
  const { data, error, loading, refresh } = useKpiStats(filters, me.id)
  const max = Math.max(1, ...(data?.funnel.map(s => s.count ?? 0) ?? []))

  return (
    <div className="admin-page sd-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">KPI통계</h1>
          <p className="admin-page-desc">CARE+7 통합 성과 — 재학생 기준
            {data && <> · 재학생 <strong>{data.enrolled.toLocaleString()}</strong>명 · {data.refDate} 조회</>}</p>
        </div>
        <button type="button" className="admin-btn admin-btn-primary" disabled={!data}
          onClick={() => data && downloadXlsx(`KPI_성과보고서_${filters.from.replaceAll('-', '')}_${filters.to.replaceAll('-', '')}.xlsx`, kpiReportRows(data, filters))}>
          <LuFileDown /> 성과보고서 생성</button>
      </header>

      <StatsFilterBar filters={filters} onChange={set} onReset={() => setFilters(defaultStatsFilters())} />

      {error && <p role="alert" className="sd-error">{data ? '최신 조회에 실패해 이전 결과를 표시합니다.' : 'KPI 통계를 조회하지 못했습니다.'} {error}
        <button type="button" className="admin-btn" onClick={refresh}>다시 조회</button></p>}
      {!data && !error && <p role="status" className="sd-empty">KPI 통계를 불러오는 중입니다.</p>}

      {data && (
        <div className={`sd-body${loading ? ' is-loading' : ''}`} aria-busy={loading}>
          <section className="sd-card">
            <header className="sd-card-head"><div><h3>7단계 참여 퍼널 — 어디서 학생이 이탈하는가</h3><p>재학생 중 각 단계를 한 번이라도 지난 학생 수 · 누적 현황(기간 필터 미적용)</p></div></header>
            <ol className="kpi-funnel" aria-label="7단계 참여 퍼널">
              {data.funnel.map((s, i) => (
                <li key={s.key} className={`kpi-funnel-stage${s.count === null ? ' is-na' : ''}`}
                  style={{ '--h': `${s.count === null ? 18 : Math.max(18, (s.count / max) * 100)}%`, '--c': STAGE_COLORS[i] } as CSSProperties}
                  title={`${s.label} ${s.count === null ? '집계 전' : `${s.count.toLocaleString()}명`}`}>
                  <span className="kpi-funnel-bar"><i /></span>
                  <span className="kpi-funnel-label">{s.label}</span>
                  <strong className="kpi-funnel-value">{s.count === null ? '집계 전' : s.count.toLocaleString()}</strong>
                </li>))}
            </ol>
            {data.diagnosis && (
              <p className="kpi-diagnosis"><strong>자동 진단</strong> — {data.diagnosis.fromStage}단계({data.diagnosis.fromLabel}) → {data.diagnosis.toStage}단계({data.diagnosis.toLabel}) 구간
                전환율 <b>{data.diagnosis.rate}%</b>로 전 구간 중 최저입니다. {data.diagnosis.toLabel} 단계의 공급·연계가 충분한지 점검이 필요합니다.</p>)}
          </section>

          <section className="sd-card">
            <header className="sd-card-head"><div><h3>단계별 KPI 목표 대비 실적</h3><p>목표값은 사업 지표표 기준 · 원천이 없는 지표는 「집계 전」</p></div></header>
            <div className="sd-table-wrap kpi-table-wrap">
              <table className="sd-table kpi-table">
                <thead><tr><th>단계</th><th>핵심 KPI</th><th>산출식</th><th>현재</th><th>목표</th><th>달성률</th><th>추이</th><th>상태</th></tr></thead>
                <tbody>
                  {data.groups.map((g, gi) => g.indicators.map((ind, ii) => (
                    <tr key={ind.key} className={ii === 0 ? 'kpi-group-start' : ''}>
                      {ii === 0 && <td rowSpan={g.indicators.length} className="kpi-stage-cell"><span className="kpi-stage-dot" style={{ background: STAGE_COLORS[gi] }} />{gi + 1} {g.label}</td>}
                      <td className="kpi-name">{ind.name}{ind.note && <small title={ind.note}> ⓘ</small>}</td>
                      <td className="kpi-formula">{ind.formula}</td>
                      <td className="kpi-num">{formatKpiValue(ind)}</td>
                      <td className="kpi-num">{formatKpiTarget(ind)}</td>
                      <td className="kpi-num">{ind.rate === null ? '—' : `${Math.round(ind.rate)}%`}</td>
                      <td><span className="kpi-trend"><i style={{ width: `${Math.min(100, ind.rate ?? 0)}%`, background: STAGE_COLORS[gi] }} /></span></td>
                      <td><StatusBadge indicator={ind} /></td>
                    </tr>)))}
                </tbody>
              </table>
            </div>
          </section>
        </div>)}
    </div>
  )
}

function StatusBadge({ indicator }: { indicator: KpiIndicator }) {
  return <span className={`kpi-status kpi-status-${indicator.status.toLowerCase()}`}>{KPI_STATUS_LABEL[indicator.status]}</span>
}
