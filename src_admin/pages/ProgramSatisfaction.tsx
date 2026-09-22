import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LuClipboardCheck, LuMessageSquareText, LuSmile, LuUserCheck } from 'react-icons/lu'
import type { ProgramTabContext } from './ProgramShell'
import { loadSatisfactionStats, type SatisfactionStats, type ScoreSummary } from '../../shared/surveyStore'
import EmptyState from '../components/EmptyState'
import './ProgramSurveyStats.css'

// 만족도조사 탭 — 집계는 서버(/programs/{id}/survey/satisfaction/stats)가 끝내고 여기서는 그린다.
// 문항은 코드관리(SURVEY_AREA group=SATISFACTION)에서 온다: 5점 척도 문항별 평균·분포와 서술형 답변 목록.

const fmt = (n: number | null) => (n == null ? '—' : n.toFixed(2))
const SCORES = ['5', '4', '3', '2', '1'] as const

/** 점수 분포 막대 — 5점(진한 색)부터 1점까지 누적 폭. */
function Distribution({ row }: { row: ScoreSummary }) {
  if (!row.n) return <span className="pss-dist is-empty" aria-hidden="true" />
  return (
    <span className="pss-dist" title={SCORES.map(s => `${s}점 ${row.distribution[s]}명`).join(' · ')}>
      {SCORES.map(s => (
        <i key={s} className={`s${s}`} style={{ width: `${(row.distribution[s] / row.n) * 100}%` }} />
      ))}
    </span>
  )
}

export default function ProgramSatisfaction() {
  const { program } = useOutletContext<ProgramTabContext>()
  const [stats, setStats] = useState<SatisfactionStats | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setStats(null); setError('')
    loadSatisfactionStats(program.id)
      .then(next => { if (alive) setStats(next) })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : '통계를 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [program.id])

  if (error) return <section className="admin-card"><p role="alert">{error}</p></section>
  if (!stats) return <p role="status" className="admin-page-desc">응답을 집계하는 중입니다…</p>
  if (!stats.satisfactionSurvey) {
    return (
      <section className="admin-card">
        <EmptyState icon={LuSmile} message="이 프로그램은 만족도 조사를 실시하지 않습니다. 프로그램 수정에서 「실시」로 바꾸면 수료 후 조사가 열립니다." />
      </section>
    )
  }
  if (stats.areas.length === 0) {
    return (
      <section className="admin-card">
        <EmptyState icon={LuSmile} message="등록된 만족도 문항이 없습니다. 시스템관리 › 코드관리(설문 · 조사 영역/문항)에서 문항을 등록하면 조사가 열립니다." />
      </section>
    )
  }
  const p = stats.participation
  const rate = p.completed ? Math.round((p.responses / p.completed) * 100) : 0
  const cards = [
    { label: '수료 인원', value: p.completed, unit: '명', icon: LuUserCheck, tint: '' },
    { label: '만족도 응답', value: p.responses, unit: '명', icon: LuClipboardCheck, tint: 'success' },
    { label: '응답률', value: rate, unit: '%', icon: LuSmile, tint: 'info' },
    { label: '서술형 답변', value: stats.comments.reduce((n, c) => n + c.answers.length, 0), unit: '건', icon: LuMessageSquareText, tint: 'accent' },
  ]

  return (
    <div className="pss">
      <section className="admin-stat-grid">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <article key={c.label} className="admin-stat-card">
              <span className={`admin-stat-icon ${c.tint}`}><Icon /></span>
              <div className="admin-stat-body">
                <span className="admin-stat-label">{c.label}</span>
                <span className="admin-stat-value">{c.value}<em>{c.unit}</em></span>
              </div>
            </article>
          )
        })}
      </section>

      <section className="admin-card pss-total">
        <header>
          <h2>전체 만족도</h2>
          <p>응답 {p.responses}명 · {stats.total.n}개 응답 기준 · 5점 만점</p>
        </header>
        <div className="pss-total-body pss-total-body--sat">
          <div><small>전체 평균</small><strong>{fmt(stats.total.avg)}</strong></div>
          {stats.areas.map(area => (
            <div key={area.key}><small>{area.label}</small><strong>{fmt(area.avg)}</strong></div>
          ))}
        </div>
        {p.responses === 0 && <p className="pss-note">아직 만족도 조사를 제출한 학생이 없습니다. 응답 여부는 선발자 관리에서 O/X 로 확인합니다.</p>}
      </section>

      {stats.areas.map((area, i) => (
        <section className="admin-card pss-area" key={area.key}>
          <header>
            <h2><span>{i + 1}</span>{area.label}</h2>
            <div className="pss-area-sum"><span>평균 <b>{fmt(area.avg)}</b></span><span>응답 <b>{area.n}</b></span></div>
          </header>
          <div className="table-wrap">
            <table className="pss-table">
              <thead>
                <tr><th>번호</th><th>문항</th><th>평균</th><th>분포</th>{SCORES.map(s => <th key={s}>{s}점</th>)}<th>응답</th></tr>
              </thead>
              <tbody>
                {area.items.map((item, j) => (
                  <tr key={item.code}>
                    <td>{j + 1}</td>
                    <td className="wrap">{item.prompt}</td>
                    <td>{fmt(item.avg)}</td>
                    <td><Distribution row={item} /></td>
                    {SCORES.map(s => <td key={s}>{item.distribution[s]}</td>)}
                    <td>{item.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {stats.comments.map((comment, i) => (
        <section className="admin-card pss-area" key={comment.code}>
          <header>
            <h2><span>{stats.areas.length + i + 1}</span>{comment.prompt}</h2>
            <div className="pss-area-sum"><span>답변 <b>{comment.answers.length}</b></span></div>
          </header>
          {comment.answers.length === 0
            ? <p className="pss-note">아직 답변이 없습니다.</p>
            : <ul className="pss-comments">{comment.answers.map((text, k) => <li key={k}>{text}</li>)}</ul>}
        </section>
      ))}
      <p className="pss-legend">{SCORES.map(s => <span key={s}><i className={`s${s}`} /> {s}점</span>)}</p>
    </div>
  )
}
