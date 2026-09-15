import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import StudentStatCards, { type StudentStat } from '../../components/StudentStatCards'
import { getActiveStudent } from '../../data/students'
import { usePageHead } from '../../components/PageCrumb'
import './QuestBoard.css'

type Period = 'daily' | 'monthly' | 'semester'
type Filter = 'all' | 'open' | 'done'
interface QuestExample { id: string; period: Period; title: string; description: string; path: string; action: string }
// Interaction examples only. These are not operational quest definitions or student achievements.
const examples: QuestExample[] = [
  { id: 'attendance', period: 'daily', title: '오늘의 출석 남기기', description: '출석 달력에서 오늘의 시작을 체크해 보세요.', path: '', action: '출석체크' },
  { id: 'journal', period: 'daily', title: '오늘 배운 점 기록하기', description: '작은 경험도 좋아요. 오늘의 배움과 다음 행동을 정리해 보세요.', path: '/growth/journal/new', action: '성장일지 작성' },
  { id: 'jobs', period: 'daily', title: '관심 있는 채용공고 살펴보기', description: '희망 직무에서 어떤 경험과 기술을 요구하는지 확인해 보세요.', path: '/jobs', action: '채용공고 보기' },
  { id: 'skills', period: 'monthly', title: '보유 스킬 정리하기', description: '이번 달 배운 기술을 성장 기록에 정리해 보세요.', path: '/growth', action: '성장 기록 열기' },
  { id: 'review', period: 'monthly', title: '한 달의 성장 돌아보기', description: '성장일지를 읽고 잘한 점과 보완할 점을 찾아보세요.', path: '/growth/journal', action: '성장일지 보기' },
  { id: 'program', period: 'monthly', title: '관심 비교과 프로그램 찾아보기', description: '다음 경험으로 이어질 프로그램을 탐색해 보세요.', path: '/growth/program', action: '프로그램 보기' },
  { id: 'project', period: 'semester', title: '프로젝트 경험 정리하기', description: '맡은 역할과 해결한 문제, 결과를 함께 남겨보세요.', path: '/growth', action: '프로젝트 기록' },
  { id: 'qualification', period: 'semester', title: '자격·어학 기록 점검하기', description: '취득한 자격과 어학 성적을 확인하고 최신 정보로 정리해 보세요.', path: '/growth', action: '자격·어학 기록' },
]
const periods: { id: Period; label: string; description: string }[] = [
  { id: 'daily', label: '일일 퀘스트', description: '오늘 실천할 작은 행동부터 시작해 보세요.' },
  { id: 'monthly', label: '월간 퀘스트', description: '한 달 동안 쌓은 경험을 돌아보고 정리해 보세요.' },
  { id: 'semester', label: '학기 퀘스트', description: '한 학기의 경험을 다음 도전으로 연결해 보세요.' },
]
const dayKey = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())

export default function QuestBoard() {
  usePageHead('퀘스트 대시보드', '기간별 퀘스트와 출석을 한곳에서 확인하고, 꾸준한 성장 습관을 만들어 보세요.')
  const [preview, setPreview] = useState(false)
  const [period, setPeriod] = useState<Period>('daily')
  const [filter, setFilter] = useState<Filter>('all')
  const [completed, setCompleted] = useState<string[]>([])
  const [attendance, setAttendance] = useState<string[]>([])
  const [today, setToday] = useState(dayKey)
  const [monthOffset, setMonthOffset] = useState(0)
  const [guide, setGuide] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const timer = window.setInterval(() => setToday(dayKey()), 30000)
    const refresh = () => setToday(dayKey())
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const [year, month, day] = today.split('-').map(Number)
  const calendar = new Date(year, month - 1 + monthOffset, 1)
  const calendarYear = calendar.getFullYear()
  const calendarMonth = calendar.getMonth() + 1
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate()
  const dateKey = (date: number) => `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`
  const attended = attendance.includes(today)
  const isDone = (id: string) => id === 'attendance' ? attended : completed.includes(id)
  const quests = preview ? examples.filter(item => item.period === period) : []
  const done = quests.filter(item => isDone(item.id)).length
  const visible = quests.filter(item => filter === 'all' || (filter === 'done' ? isDone(item.id) : !isDone(item.id)))
  const monthCount = attendance.filter(date => date.startsWith(dateKey(1).slice(0, 7))).length
  const student = getActiveStudent()
  const stats: StudentStat[] = periods.map((item, index) => {
    const items = examples.filter(quest => quest.period === item.id)
    const count = items.filter(quest => isDone(quest.id)).length
    return { kind: (['diagnosis', 'roadmap', 'program'] as const)[index], label: item.label,
      kicker: preview ? '화면 체험' : '나의 퀘스트', value: preview ? String(count) : '—',
      unit: preview ? `/ ${items.length}개` : '', pct: preview ? Math.round(count / items.length * 100) : 0,
      foot: preview ? '예시 퀘스트 완료 현황' : '운영 기준 확정 후 제공' }
  })
  stats.push({ kind: 'counsel', label: '오늘의 출석', kicker: '출석체크', total: preview ? attended ? '완료' : '미출석' : '—', unit: '', foot: preview ? '체험 출석 · 한국 시간 기준' : '출석 운영 준비 중', channels: [] },
    { kind: 'level', label: '성장 레벨', levelUnit: '', level: '', tierLabel: '', tier: '', xp: '', xpFoot: '', pct: 0, lockedReason: '레벨·경험치 기준 준비 중' })
  function checkIn() {
    if (!preview || attended) return
    const current = dayKey()
    setToday(current)
    setAttendance(previous => previous.includes(current) ? previous : [...previous, current])
    setMessage('오늘의 체험 출석을 체크했습니다. 실제 출석 기록으로 저장되지 않습니다.')
  }
  function togglePreview() {
    setPreview(!preview); setCompleted([]); setAttendance([]); setFilter('all'); setMonthOffset(0)
    setMessage(preview ? '화면 체험을 종료했습니다.' : '화면 체험을 시작했습니다. 예시 퀘스트로 동작을 확인해 보세요.')
  }
  return (
    <div className="qb-page">
      <header className="qb-toolbar">
        <div><small className="qb-welcome-meta">{student.major}{student.grade ? ` ${student.grade}학년` : ''} · {year}.{String(month).padStart(2, '0')}.{String(day).padStart(2, '0')}</small><h2><span>{student.name}</span>님의 성장 퀘스트<br />오늘의 작은 실천을 시작해 볼까요?</h2></div>
        <div className="qb-actions"><button className="qb-button" onClick={() => setGuide(true)}><i className="fa-regular fa-circle-question" aria-hidden="true" /> 퀘스트 가이드</button><button className="qb-button qb-button--primary" aria-pressed={preview} onClick={togglePreview}>{preview ? '화면 체험 종료' : '화면 체험하기'}</button></div>
      </header>
      <div className={`qb-notice ${preview ? 'is-preview' : ''}`}><i className="fa-solid fa-circle-info" aria-hidden="true" /><p><strong>{preview ? '화면 체험 중' : '퀘스트 운영 준비 중'}</strong>{preview ? '예시 항목입니다. 완료·출석 체크는 화면에서만 유지되며, 새로고침하거나 체험을 종료하면 초기화됩니다.' : '운영 기준이 확정되면 실제 퀘스트가 제공됩니다. 화면 체험에서 기능을 먼저 확인할 수 있습니다.'}</p></div>
      <StudentStatCards stats={stats} />
      <div className="qb-dashboard">
        <section data-slot="card" className="qb-panel qb-missions" aria-labelledby="qb-missions-title">
          <div className="qb-panel-heading" data-slot="card-header"><div><h2 id="qb-missions-title" data-slot="card-title">나의 퀘스트</h2><p data-slot="card-description">기간별 활동을 확인하고 성장 습관을 만들어 보세요.</p></div><span className="qb-subtle">{preview ? `${done} / ${quests.length} 완료` : '준비 중'}</span></div>
          <div className="qb-tabs" role="tablist" aria-label="퀘스트 기간">{periods.map((item, index) => <button key={item.id} id={`qb-tab-${item.id}`} role="tab" aria-controls="qb-quest-panel" aria-selected={period === item.id} tabIndex={period === item.id ? 0 : -1} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1
            if (next < 0) return
            event.preventDefault(); setPeriod(periods[next].id); setFilter('all'); document.getElementById(`qb-tab-${periods[next].id}`)?.focus()
          }} onClick={() => { setPeriod(item.id); setFilter('all') }}>{item.label}</button>)}</div>
          <div id="qb-quest-panel" role="tabpanel" aria-labelledby={`qb-tab-${period}`} tabIndex={0}>
            <p className="qb-period-description">{periods.find(item => item.id === period)?.description}</p>
            {preview && <><progress className="qb-progress" value={done} max={quests.length} aria-label="선택한 기간의 체험 완료 현황" /><div className="qb-filters" aria-label="완료 상태 필터">{([['all', '전체'], ['open', '진행 전'], ['done', '완료']] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></>}
            {visible.length ? <ul className="qb-quest-list">{visible.map(item => <li key={item.id} className={isDone(item.id) ? 'is-done' : ''}>
              <span className="qb-quest-symbol" aria-hidden="true"><i className={`fa-solid ${isDone(item.id) ? 'fa-check' : item.id === 'attendance' ? 'fa-calendar-check' : 'fa-arrow-trend-up'}`} /></span>
              <div className="qb-quest-copy"><span className="qb-subtle">{isDone(item.id) ? '체험 완료' : '체험 · 진행 전'}</span><h3>{item.title}</h3><p>{item.description}</p><div className="qb-row-actions">{item.path ? <Link to={item.path}>{item.action} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link> : <button className="qb-text-button" disabled={attended} onClick={checkIn}>{attended ? '오늘 출석 완료' : '체험 출석체크'}</button>}{item.id !== 'attendance' && <label className="qb-check"><input type="checkbox" checked={isDone(item.id)} onChange={() => { setCompleted(previous => previous.includes(item.id) ? previous.filter(id => id !== item.id) : [...previous, item.id]); setMessage(`${item.title}: 체험 완료 상태를 변경했습니다.`) }} />체험 완료 체크</label>}</div></div>
            </li>)}</ul> : <div className="qb-empty"><i className={`fa-regular ${preview ? 'fa-circle-check' : 'fa-clipboard'}`} aria-hidden="true" /><h3>{preview ? '해당 상태의 퀘스트가 없습니다' : `${periods.find(item => item.id === period)?.label}를 준비하고 있어요`}</h3><p>{preview ? '다른 상태를 선택해 퀘스트를 확인해 보세요.' : '참여 조건과 완료 기준이 정해지면 이곳에서 확인할 수 있습니다.'}</p><button className="qb-button" onClick={() => preview ? setFilter('all') : togglePreview()}>{preview ? '전체 퀘스트 보기' : '예시로 화면 체험하기'}</button></div>}
          </div>
        </section>
        <aside className="qb-side">
          <section data-slot="card" className="qb-panel qb-attendance" aria-labelledby="qb-attendance-title"><div className="qb-panel-heading" data-slot="card-header"><div><h2 id="qb-attendance-title" data-slot="card-title">출석체크</h2><p data-slot="card-description">꾸준한 시작을 달력에 남겨보세요.</p></div><span className="qb-subtle">{preview ? '화면 체험' : '준비 중'}</span></div>
            <div className="qb-calendar-heading"><button aria-label="이전 달" onClick={() => setMonthOffset(value => value - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button><strong>{calendarYear}년 {calendarMonth}월</strong><button aria-label="다음 달" onClick={() => setMonthOffset(value => value + 1)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button></div>
            <table className="qb-calendar"><caption className="qb-sr-only">{calendarYear}년 {calendarMonth}월 {preview ? '체험 출석 현황' : '달력 · 출석 운영 준비 중'}</caption><thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{Array.from({ length: Math.ceil((calendar.getDay() + daysInMonth) / 7) }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, weekday) => {
              const date = week * 7 + weekday - calendar.getDay() + 1
              if (date < 1 || date > daysInMonth) return <td key={weekday} />
              const key = dateKey(date); const checked = preview && attendance.includes(key)
              return <td key={weekday}><span className={`${key === today ? 'is-today' : ''} ${checked ? 'is-checked' : ''}`} aria-current={key === today ? 'date' : undefined} aria-label={`${calendarMonth}월 ${date}일${checked ? ', 체험 출석 완료' : ''}`}>{date}{checked && <i className="fa-solid fa-check" aria-hidden="true" />}</span></td>
            })}</tr>)}</tbody></table>
            <div className="qb-calendar-footer"><span>{preview ? `이 달 체험 출석 ${monthCount}일` : '실제 출석 기록은 아직 제공되지 않습니다.'}</span>{monthOffset !== 0 && <button className="qb-text-button" onClick={() => setMonthOffset(0)}>이번 달</button>}</div>
            <button className="qb-button qb-button--primary qb-attend-button" disabled={!preview || attended} onClick={checkIn}>{!preview ? '출석체크 준비 중' : attended ? '오늘 체험 출석 완료' : '오늘 체험 출석체크'}</button><p className="qb-attendance-note">{preview ? '체험 출석은 한국 시간 기준 하루 한 번 체크할 수 있습니다.' : '화면 체험에서 출석체크 동작을 확인할 수 있습니다.'}</p>
          </section>
          <section data-slot="card" className="qb-guide-card"><i className="fa-regular fa-compass" aria-hidden="true" /><h2>처음이라면 여기부터</h2><p>퀘스트 참여 방법과 출석체크 안내를 확인해 보세요.</p><button className="qb-text-button" onClick={() => setGuide(true)}>퀘스트 가이드 읽기 <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button></section>
        </aside>
      </div>
      <footer className="qb-bottom"><span>오늘의 경험을 포트폴리오의 재료로 남겨보세요.</span><Link to="/growth">나의 성장 기록으로 <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></footer>
      <p className="qb-feedback" role="status">{message}</p>
      <Modal open={guide} onClose={() => setGuide(false)} title="퀘스트 가이드"><div className="qb-guide-content"><p>현재는 운영 준비 단계입니다. 화면 체험으로 참여 흐름을 확인할 수 있습니다.</p><ol><li><h3>기간별 퀘스트 확인</h3><p>일일·월간·학기 탭에서 활동을 확인합니다. 체험에서는 전체·진행 전·완료 필터를 사용할 수 있습니다. 실제 기간과 초기화 규칙은 추후 안내합니다.</p></li><li><h3>활동으로 이동</h3><p>각 활동의 링크를 통해 성장 기록, 성장일지 등의 기존 화면으로 이동합니다. 화면을 방문하는 것만으로 퀘스트가 완료되지는 않습니다.</p></li><li><h3>완료와 출석 체험</h3><p>완료 체크는 동작 확인용입니다. 출석 버튼은 오늘 날짜만 체크하며, 과거 날짜는 소급 체크하지 않습니다. 체험 기록은 새로고침·페이지 이동·체험 종료 시 초기화됩니다.</p></li><li><h3>레벨·경험치·보상</h3><p>기준을 준비하고 있습니다. 현재 레벨·경험치를 산정하거나 보상을 지급하지 않습니다.</p></li></ol><button className="qb-button qb-button--primary" onClick={() => setGuide(false)}>확인했어요</button></div></Modal>
    </div>
  )
}
