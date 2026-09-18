import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../shared/api'
import { missionError } from '../../../shared/missions'
import type { QuestDashboard, QuestPeriod } from '../../../shared/quests'
import Modal from '../../components/Modal'
import StudentStatCards, { type StudentStat } from '../../components/StudentStatCards'
import QuestGrowthChart from '../../components/QuestGrowthChart'
import { getActiveStudent } from '../../data/students'
import { usePageHead } from '../../components/PageCrumb'
import './QuestBoard.css'

const periods: { id: QuestPeriod; label: string }[] = [
  { id: 'DAILY', label: '일일 퀘스트' }, { id: 'MONTHLY', label: '월간 퀘스트' }, { id: 'SEMESTER', label: '학기 퀘스트' },
]
const dayKey = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())

export default function QuestBoard() {
  usePageHead('퀘스트 대시보드', '기간별 퀘스트와 출석을 확인하고, 나의 성장을 경험치로 기록하세요.')
  const [period, setPeriod] = useState<QuestPeriod>('DAILY')
  const [today, setToday] = useState(dayKey)
  const [monthOffset, setMonthOffset] = useState(0)
  const [guide, setGuide] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<QuestDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setToday(dayKey())
    const timer = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const [year, month, day] = today.split('-').map(Number)
  const calendar = new Date(year, month - 1 + monthOffset, 1)
  const calendarYear = calendar.getFullYear(), calendarMonth = calendar.getMonth() + 1
  const monthKey = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate()
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true); setError('')
    api<QuestDashboard>(`/quests/dashboard?month=${monthKey}`, { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) setData(result) })
      .catch(reason => { if (!abort.signal.aborted) { setError(missionError(reason)); setData(null) } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [monthKey, today, revision])
  const student = getActiveStudent()
  const attended = data?.today === today && data.attendance.today
  const dates = data?.attendance.dates ?? []
  const busy = loading || saving
  const stats: StudentStat[] = periods.map((item, index) => {
    const count = data?.completed[item.id] ?? 0
    const quota = data?.rules[item.id]?.quota ?? 0
    return { kind: (['diagnosis', 'roadmap', 'program'] as const)[index], label: item.label,
      kicker: '나의 퀘스트', value: data ? String(count) : '—', unit: data ? `/ ${quota}개` : '',
      pct: quota ? Math.min(100, Math.round(count / quota * 100)) : 0,
      foot: data ? `완료 보상 ${data.rules[item.id].xp.toLocaleString()} XP` : '기록 불러오는 중' }
  })
  stats.push({ kind: 'counsel', label: '연속 출석', kicker: '꾸준한 성장', total: data ? String(data.attendance.streak) : '—', unit: '일', foot: attended ? '오늘 출석 완료' : '오늘도 출석을 이어가세요', channels: [] },
    { kind: 'level', label: '성장 레벨', levelUnit: 'LV', level: data ? String(data.level) : '—',
      tierLabel: data?.grade ? `${data.grade}학년 성장 목표` : '학년 정보 확인 필요', tier: data?.levelCap ? `최대 LV ${data.levelCap}` : '',
      xp: data ? `${data.xpInLevel.toLocaleString()} / ${data.xpPerLevel.toLocaleString()} XP` : '— / 1,000 XP',
      xpFoot: data?.atCap ? '학년 목표 달성' : '다음 레벨까지', pct: data ? data.xpInLevel / data.xpPerLevel * 100 : 0 })
  async function checkIn() {
    if (busy || attended || !data) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await api<{ duplicate: boolean; grantedXp: number }>('/quests/attendance', { method: 'POST' })
      setMessage(result.duplicate ? '오늘은 이미 출석했습니다.' : result.grantedXp ? `출석 완료! ${result.grantedXp.toLocaleString()} XP를 획득했습니다.` : '출석을 기록했습니다. 오늘 지급된 XP는 0입니다.')
      setRevision(value => value + 1)
    } catch (reason) { setError(missionError(reason)) }
    finally { setSaving(false) }
  }
  const attendanceNote = data?.attendanceRewardEligible
    ? `오늘 출석하면 ${data.rules.DAILY.xp.toLocaleString()} XP · 학년 상한까지 적립`
    : '학기 중 평일에 XP가 지급됩니다. 오늘은 출석 기록만 남겨요.'
  return <div className="qb-page" aria-busy={loading}>
    <header className="qb-toolbar"><div><small className="qb-welcome-meta">{student.major}{student.grade ? ` ${student.grade}학년` : ''} · {year}.{String(month).padStart(2, '0')}.{String(day).padStart(2, '0')}</small><h2><span>{student.name}</span>님의 성장 퀘스트<br />오늘의 작은 실천을 시작해 볼까요?</h2></div><button className="qb-button" onClick={() => setGuide(true)}><i className="fa-regular fa-circle-question" aria-hidden="true" /> 퀘스트 가이드</button></header>
    {error && <div className="qb-error" role="alert">{error}<button className="qb-text-button" onClick={() => setRevision(value => value + 1)}>다시 불러오기</button></div>}
    <StudentStatCards stats={stats} />
    <div className="qb-dashboard">
      <section data-slot="card" className="qb-panel qb-missions" aria-labelledby="qb-missions-title">
        <div className="qb-panel-heading" data-slot="card-header"><div><h2 id="qb-missions-title" data-slot="card-title">나의 퀘스트</h2><p data-slot="card-description">활동을 완료하고 경험치를 쌓아보세요.</p></div><span className="qb-subtle">{data?.semester?.label ?? '학기 일정 미설정'}</span></div>
        <div className="qb-tabs" role="tablist" aria-label="퀘스트 기간">{periods.map((item, index) => <button key={item.id} id={`qb-tab-${item.id}`} role="tab" aria-controls="qb-quest-panel" aria-selected={period === item.id} tabIndex={period === item.id ? 0 : -1} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1
          if (next < 0) return
          event.preventDefault(); setPeriod(periods[next].id); document.getElementById(`qb-tab-${periods[next].id}`)?.focus()
        }} onClick={() => setPeriod(item.id)}>{item.label}</button>)}</div>
        <div id="qb-quest-panel" role="tabpanel" aria-labelledby={`qb-tab-${period}`} tabIndex={0}>
          {period === 'DAILY' ? <><ul className="qb-quest-list"><li className={attended ? 'is-done' : ''}><span className="qb-quest-symbol" aria-hidden="true"><i className={`fa-solid ${attended ? 'fa-check' : 'fa-calendar-check'}`} /></span><div className="qb-quest-copy"><span className="qb-subtle">{attended ? '출석 완료' : '오늘의 출석'}</span><h3>오늘의 출석 남기기</h3><p>{attendanceNote}</p><div className="qb-row-actions"><button className="qb-text-button" disabled={busy || attended || !data} onClick={checkIn}>{saving ? '기록 중…' : attended ? '오늘 출석 완료' : '출석체크'}</button></div></div></li></ul><p className="qb-pending-note">나머지 일일 퀘스트는 등록 후 제공됩니다.</p></> : <div className="qb-empty"><i className="fa-regular fa-clipboard" aria-hidden="true" /><h3>{periods.find(item => item.id === period)?.label} 등록 준비 중</h3><p>참여할 활동과 완료 조건이 등록되면 이곳에서 확인할 수 있습니다.</p></div>}
        </div>
        {data && <div className="qb-growth-summary"><span>지금까지 쌓은 경험치</span><strong>{data.totalXp.toLocaleString()} XP</strong><p>1,000 XP마다 레벨이 올라갑니다. 학년별 상한을 초과한 XP는 이월되지 않습니다.</p></div>}
      </section>
      <aside className="qb-side">
        <section data-slot="card" className="qb-panel qb-attendance" aria-labelledby="qb-attendance-title"><div className="qb-panel-heading" data-slot="card-header"><div><h2 id="qb-attendance-title" data-slot="card-title">출석체크</h2><p data-slot="card-description">매일의 시작을 달력에 남겨보세요.</p></div><span className="qb-subtle">한국 시간 기준</span></div>
          <div className="qb-calendar-heading"><button aria-label="이전 달" disabled={busy} onClick={() => setMonthOffset(value => value - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><strong>{calendarYear}년 {calendarMonth}월</strong><button aria-label="다음 달" disabled={busy} onClick={() => setMonthOffset(value => value + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></div>
          <table className="qb-calendar"><caption className="qb-sr-only">{calendarYear}년 {calendarMonth}월 출석 현황</caption><thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{Array.from({ length: Math.ceil((calendar.getDay() + daysInMonth) / 7) }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, weekday) => {
            const date = week * 7 + weekday - calendar.getDay() + 1
            if (date < 1 || date > daysInMonth) return <td key={weekday} />
            const key = `${monthKey}-${String(date).padStart(2, '0')}`, checked = dates.includes(key)
            return <td key={weekday}><span className={`${key === today ? 'is-today' : ''} ${checked ? 'is-checked' : ''}`} aria-current={key === today ? 'date' : undefined} aria-label={`${calendarMonth}월 ${date}일${checked ? ', 출석 완료' : ''}`}>{date}{checked && <i className="fa-solid fa-check" aria-hidden="true" />}</span></td>
          })}</tr>)}</tbody></table>
          <div className="qb-calendar-footer"><span>{loading ? '기록 불러오는 중…' : data ? `이 달 출석 ${dates.length}일` : '기록 조회 실패'}</span>{monthOffset !== 0 && <button className="qb-text-button" disabled={busy} onClick={() => setMonthOffset(0)}>이번 달</button>}</div>
          <button className="qb-button qb-button--primary qb-attend-button" disabled={busy || attended || !data} onClick={checkIn}>{saving ? '출석 기록 중…' : attended ? '오늘 출석 완료' : '오늘 출석체크'}</button><p className="qb-attendance-note">매일 자정에 오늘의 출석 버튼이 초기화됩니다.<br />{attendanceNote}</p>
        </section>
        <section data-slot="card" className="qb-panel qb-growth" aria-labelledby="qb-growth-title"><div className="qb-panel-heading" data-slot="card-header"><div><h2 id="qb-growth-title" data-slot="card-title">퀘스트 성장 그래프</h2><p data-slot="card-description">매일 쌓은 경험치로 성장을 확인해요.</p></div></div>{data ? <QuestGrowthChart days={data.graph} /> : <p className="qb-pending-note">{loading ? '성장 기록을 불러오는 중입니다.' : '성장 기록을 불러오지 못했습니다.'}</p>}</section>
      </aside>
    </div>
    <footer className="qb-bottom"><span>오늘의 경험을 포트폴리오의 재료로 남겨보세요.</span><Link to="/growth">나의 성장 기록으로 <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></footer>
    <p className="qb-feedback" role="status">{message}</p>
    <Modal open={guide} onClose={() => setGuide(false)} title="퀘스트 가이드"><div className="qb-guide-content"><ol><li><h3>기간별 퀘스트</h3><p>일일 3개, 월간 4개, 학기 3개를 기준으로 운영합니다. 월간 퀘스트는 학기당 4회입니다. 현재는 출석 퀘스트부터 참여할 수 있습니다.</p></li><li><h3>매일 출석하기</h3><p>한국 시간 기준 하루 한 번 출석할 수 있습니다. 하루를 빠뜨리면 연속 기록이 끊깁니다. 오늘 체크 전에는 어제까지의 기록을 유지합니다. 학기 중 평일에만 출석 XP가 지급됩니다.</p></li><li><h3>경험치와 레벨</h3><p>LV 0부터 시작해 1,000 XP마다 레벨이 올라갑니다. 학년별 누적 상한은 1학년 LV 25, 2학년 LV 50, 3학년 LV 75, 4학년 LV 100입니다. 상한 초과분은 적립하지 않습니다. XP 보상이 변경돼도 이미 받은 XP는 유지됩니다.</p></li><li><h3>나의 성장 확인</h3><p>그래프는 실제 지급된 일별 XP를 보여줍니다. 주말·방학의 출석과 상한 초과분은 XP에 포함되지 않습니다. 보상 미리보기와 비교과 XP 지급 기능은 준비 중입니다.</p></li></ol><button className="qb-button qb-button--primary" onClick={() => setGuide(false)}>확인했어요</button></div></Modal>
  </div>
}
