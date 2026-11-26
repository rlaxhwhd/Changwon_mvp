import { LuDownload } from 'react-icons/lu'
import { Fragment, useEffect, useMemo, useState } from 'react'
import AdminModal from './AdminModal'
import { downloadXlsx } from '../../shared/xlsx'
import { downloadStudentRoster } from '../data/programManageFilter'
import {
  GROWTH_GROUPS, METRICS, ROSTER_LABEL, ROSTER_STATES, buildStatRows, completionBreakdown, fetchSurveySummary,
  metricSheetRows, programPeriod, statTotals, statsSheetRows,
} from '../data/programStats'
import type { MetricKey, ProgramStatRow, RosterKind, Share } from '../data/programStats'
import type { Program } from '../data/schema/program'
import './ProgramStatsModal.css'

// 프로그램 관리 「통계확인」 — 집계는 data/programStats 가 하고 여기서는 그린다.
// 체크를 해제한 프로그램은 전체 행·그래프·엑셀에서 빠진다(요청: 50개 중 2개를 빼면 48개로 다시 계산).

const ROSTER_KINDS: RosterKind[] = ['participants', 'notCompleted', 'completed', 'uniqueCompleted']
const rowCount = (row: ProgramStatRow, kind: RosterKind) =>
  kind === 'uniqueCompleted' ? new Set(row.completedStudentIds).size : row[kind]
const stamp = () => new Date().toISOString().slice(0, 10).replaceAll('-', '')
const fileSafe = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_')

function MetricValue({ value, unit }: { value: number | null; unit: string }) {
  if (value === null) return <span className="pstats-none" title="조사를 실시하지 않았거나 응답이 없습니다">-</span>
  return <>{value.toFixed(1)}<small>{unit}</small></>
}

function ShareBars({ title, base, shares }: { title: string; base: number; shares: Share[] }) {
  return (
    <section className="pstats-chart" aria-label={title}>
      <h3>{title}</h3>
      <p className="pstats-chart-base">수료인원(중복인원) {base.toLocaleString()}명 기준</p>
      {shares.length === 0 ? <p className="pstats-chart-empty">수료한 학생이 없습니다.</p> : (
        <ul>
          {shares.map(share => (
            <li key={share.label} title={`${share.label} ${share.count}명 · ${share.percent}%`}>
              <span className="pstats-bar-label">{share.label}</span>
              <span className="pstats-bar-track"><span className="pstats-bar" style={{ width: `${share.percent}%` }} /></span>
              <span className="pstats-bar-value"><strong>{share.percent}%</strong> {share.count.toLocaleString()}명</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function ProgramStatsModal({ programs, onClose }: { programs: Program[]; onClose: () => void }) {
  const [rows, setRows] = useState<ProgramStatRow[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState('')
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    let alive = true
    fetchSurveySummary(programs.map(p => p.id))
      .then(summary => { if (alive) setRows(buildStatRows(programs, summary)) })
      .catch((error: unknown) => { if (alive) setLoadError(error instanceof Error ? error.message : '통계를 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [programs])

  const included = useMemo(() => (rows ?? []).filter(r => !excluded.has(r.program.id)), [rows, excluded])
  const totals = useMemo(() => statTotals(included), [included])
  const breakdown = useMemo(() => completionBreakdown(included), [included])
  const allIncluded = !!rows && included.length === rows.length

  const toggle = (id: string) => setExcluded(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const toggleAll = () => setExcluded(allIncluded ? new Set((rows ?? []).map(r => r.program.id)) : new Set())

  const roster = (kind: RosterKind, targets: ProgramStatRow[], name: string) => {
    setDownloading(`${kind}:${name}`); setDownloadError('')
    downloadStudentRoster(targets.map(r => r.program.id), ROSTER_STATES[kind], `${fileSafe(name)}_${ROSTER_LABEL[kind]}_${stamp()}.xlsx`,
      kind === 'uniqueCompleted')
      .catch((error: unknown) => setDownloadError(error instanceof Error ? error.message : '명단을 내려받지 못했습니다.'))
      .finally(() => setDownloading(''))
  }

  const metricExcel = (key: MetricKey) => {
    const label = METRICS.find(m => m.key === key)!.label
    downloadXlsx(`비교과_통계_${label}_${stamp()}.xlsx`, metricSheetRows(included, key), label)
  }

  const countCell = (kind: RosterKind, count: number, targets: ProgramStatRow[], name: string) => (
    <td className="pstats-num">
      <button
        type="button" className="pstats-link" disabled={count === 0 || !!downloading}
        title={`${ROSTER_LABEL[kind]} 명단 엑셀 다운로드`} onClick={() => roster(kind, targets, name)}
      >
        {downloading === `${kind}:${name}` ? '받는 중…' : count.toLocaleString()}
      </button>
    </td>
  )

  return (
    <AdminModal title="프로그램 통계" size="xl" className="pstats-modal" onClose={onClose}>
      {loadError ? <p role="alert" className="admin-form-hint-warn">{loadError}</p>
        : !rows ? <p className="pstats-loading">통계를 불러오는 중…</p> : (
        <>
          <div className="pstats-toolbar">
            <p>
              선택한 <strong>{rows.length}</strong>개 중 <strong>{included.length}</strong>개 반영
              <small>체크를 해제한 프로그램은 전체값·그래프·엑셀에서 빠집니다. 인원 숫자를 누르면 명단을, 전체 행의 지표 값을 누르면 프로그램별 값 엑셀을 받습니다.</small>
            </p>
            <button
              type="button" className="admin-btn admin-btn-primary sm" disabled={included.length === 0}
              onClick={() => downloadXlsx(`비교과_통계_${stamp()}.xlsx`, statsSheetRows(included), '비교과 통계')}
            >
              <LuDownload /> 통계 엑셀 다운로드
            </button>
          </div>
          {downloadError && <p role="alert" className="admin-form-hint-warn">{downloadError}</p>}

          <div className="pstats-table-wrap">
            <table className="pstats-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="pstats-check"><input type="checkbox" checked={allIncluded} onChange={toggleAll} aria-label="전체 반영" /></th>
                  <th rowSpan={2} className="pstats-title">프로그램명</th>
                  <th rowSpan={2}>참가인원<small>중복포함</small></th>
                  <th rowSpan={2}>미수료인원<small>중복포함</small></th>
                  <th rowSpan={2}>수료인원<small>중복인원</small></th>
                  <th rowSpan={2}>수료인원<small>순인원</small></th>
                  <th rowSpan={2}>만족도<small>100점 환산</small></th>
                  <th colSpan={3}>역량향상률</th>
                  <th rowSpan={2}>참여율</th>
                  <th rowSpan={2}>이수율</th>
                </tr>
                <tr>{GROWTH_GROUPS.map(g => <th key={g.key}>{g.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const off = excluded.has(row.program.id)
                  return (
                    <tr key={row.program.id} className={off ? 'is-off' : undefined}>
                      <td className="pstats-check"><input type="checkbox" checked={!off} onChange={() => toggle(row.program.id)} aria-label={`${row.program.title} 반영`} /></td>
                      <td className="pstats-title"><strong>{row.program.title}</strong><small>{row.program.fiscalYear} · {programPeriod(row.program)}</small></td>
                      {ROSTER_KINDS.map(kind => <Fragment key={kind}>{countCell(kind, rowCount(row, kind), [row], row.program.title)}</Fragment>)}
                      {METRICS.map(m => <td key={m.key} className="pstats-num"><MetricValue value={row.metrics[m.key]} unit={m.unit} /></td>)}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pstats-check" />
                  <td className="pstats-title"><strong>전체</strong><small>{totals.programs}개 프로그램 · 지표는 값이 있는 프로그램만 평균</small></td>
                  {ROSTER_KINDS.map(kind => <Fragment key={kind}>{countCell(kind, totals[kind], included, `비교과_${totals.programs}개`)}</Fragment>)}
                  {METRICS.map(m => {
                    const average = totals.metrics[m.key]
                    return (
                      <td key={m.key} className="pstats-num">
                        <button type="button" className="pstats-link" disabled={average.count === 0}
                          title={`${m.label} 프로그램별 값·전체 평균 엑셀`} onClick={() => metricExcel(m.key)}>
                          <MetricValue value={average.value} unit={m.unit} />
                        </button>
                        <small className="pstats-count">{average.count}개</small>
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pstats-charts">
            <ShareBars title="학년별 비율" base={breakdown.total} shares={breakdown.grade} />
            <ShareBars title="단과대학별 비율" base={breakdown.total} shares={breakdown.college} />
          </div>
        </>
      )}
    </AdminModal>
  )
}
