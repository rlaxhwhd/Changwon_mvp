import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../shared/api'
import { missionError, type LearningWeek, type LearningQuestion, type MissionResult, type WeekKind } from '../../../shared/missions'
import { usePageHead } from '../../components/PageCrumb'
import MissionReview from '../../components/MissionReview'
import './TodayGrowthMission.css'

type Current = { weekStart: string; weekEnd: string; items: LearningWeek[] }
type Attempt = { id: string; title: string; questions: LearningQuestion[] }
export default function TodayGrowthMission() {
  usePageHead('성장 미션', '이번 주 TOEIC 영단어와 NCS·GSAT 문제를 학습하고 풀이를 기록합니다.')
  const [data, setData] = useState<Current | null>(null)
  const [kind, setKind] = useState<WeekKind>('TOEIC')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [result, setResult] = useState<MissionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('')
    api<Current>('/missions/current', { signal: abort.signal }).then(setData).catch(e => { if (!abort.signal.aborted) setError(missionError(e)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [revision])
  const mission = data?.items.find(item => item.kind === kind)
  const answered = attempt?.questions.filter(item => typeof answers[item.id] === 'number' || String(answers[item.id] ?? '').trim()).length ?? 0
  async function start() {
    if (!mission) return
    setBusy(true); setError('')
    try { setAttempt(await api<Attempt>('/missions/attempts', { method: 'POST', body: JSON.stringify({ weekId: mission.id, version: mission.version }) })); setAnswers({}); setResult(null) }
    catch (e) { setError(missionError(e)) } finally { setBusy(false) }
  }
  async function submit() {
    if (!attempt) return
    setBusy(true); setError('')
    try { setResult(await api<MissionResult>(`/missions/attempts/${attempt.id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) })) }
    catch (e) { setError(missionError(e)) } finally { setBusy(false) }
  }
  return <div className="lm-page"><header className="lm-heading"><div><span className="lm-kicker">WEEKLY LEARNING</span><h2>이번 주, 한 걸음 더</h2><p>{data ? `${data.weekStart} ~ ${data.weekEnd} · 한국 시간 기준` : '관리자가 게시한 학습을 확인합니다.'}</p></div><Link className="lm-button" to="/growth/mission-log">내 풀이 기록 →</Link></header>
    <div className="lm-tabs" aria-label="미션 유형">{(['TOEIC', 'NCS_GSAT'] as const).map(value => <button key={value} aria-pressed={kind === value} disabled={busy || (!!attempt && !result)} onClick={() => { setKind(value); setAttempt(null); setResult(null); setAnswers({}); setError('') }}>{value === 'TOEIC' ? 'TOEIC 영단어' : 'NCS / GSAT'}</button>)}</div>
    {loading ? <p className="lm-empty" role="status">이번 주 미션을 불러오는 중입니다.</p> : <div className="lm-layout"><section className="lm-main" aria-label="학습 및 문제풀이">
      {result ? <><h2>{result.title}</h2><MissionReview result={result} /><div className="lm-actions"><button className="lm-button" disabled={busy} onClick={() => { setAttempt(null); setResult(null); setAnswers({}) }}>학습으로 돌아가기</button><button className="lm-button lm-primary" disabled={busy} onClick={() => void start()}>다시 풀기</button></div></> : attempt ? <><div className="lm-section-heading"><h2>{attempt.title}</h2><span>{answered} / {attempt.questions.length} 답변</span></div><form onSubmit={e => { e.preventDefault(); void submit() }}><fieldset className="lm-form" disabled={busy}><ol className="lm-question-list">{attempt.questions.map((item, index) => <li className="lm-question" key={item.id}><div className="lm-question-heading"><span>Q{index + 1} · {item.kind}</span><span>{item.category}</span></div><h3 id={`question-${item.id}`}>{item.prompt}</h3>{item.kind === 'TOEIC' ? <input aria-labelledby={`question-${item.id}`} required maxLength={150} autoComplete="off" spellCheck={false} value={answers[item.id] ?? ''} onChange={e => setAnswers(previous => ({ ...previous, [item.id]: e.target.value }))} placeholder="뜻에 해당하는 영단어를 입력하세요" /> : <div className="lm-choices" role="group" aria-labelledby={`question-${item.id}`}>{item.choices.map((choice, i) => <label key={i} className={answers[item.id] === i ? 'selected' : ''}><input required type="radio" name={`answer-${item.id}`} value={i} checked={answers[item.id] === i} onChange={() => setAnswers(previous => ({ ...previous, [item.id]: i }))} /><span>{i + 1}.</span>{choice}</label>)}</div>}</li>)}</ol><div className="lm-actions"><button type="button" className="lm-button" onClick={() => { if (window.confirm('입력한 답안을 지우고 학습 화면으로 돌아갈까요?')) { setAttempt(null); setAnswers({}) } }}>학습으로 돌아가기</button><button className="lm-button lm-primary" disabled={answered !== attempt.questions.length}>{busy ? '채점 중…' : '답안 제출·채점'}</button></div></fieldset></form></> : mission ? <><div className="lm-section-heading"><h2>{mission.title}</h2><span>{mission.questions.length}{kind === 'TOEIC' ? '단어' : '문제'}</span></div><p className="lm-intro">{kind === 'TOEIC' ? '뜻과 예문을 학습한 뒤, 뜻에 맞는 영단어를 직접 입력해 보세요.' : '문제를 읽고 정답 보기를 선택하세요. 제출 후 해설을 확인할 수 있습니다.'}</p>{kind === 'TOEIC' ? <div className="lm-words">{mission.questions.map((item, index) => <article key={item.id}><span className="lm-word-index">{String(index + 1).padStart(2, '0')} · {item.category || '영단어'}</span><h3>{item.word}</h3><p>{item.prompt}</p>{item.example && <blockquote>{item.example}</blockquote>}{item.explanation && <small>{item.explanation}</small>}</article>)}</div> : <ol className="lm-preview-list">{mission.questions.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{item.kind} · {item.category || '직무적성'}</small><p>{item.prompt}</p></div></li>)}</ol>}<div className="lm-actions"><button className="lm-button lm-primary" disabled={busy} onClick={() => void start()}>{busy ? '준비 중…' : '문제 풀기 시작'}</button></div></> : <div className="lm-empty"><h2>이번 주 미션을 준비하고 있어요</h2><p>관리자가 {kind === 'TOEIC' ? 'TOEIC 영단어' : 'NCS/GSAT 문제'}를 게시하면 학습할 수 있습니다.</p></div>}
    </section><aside className="lm-side"><span className="lm-kicker">LEARNING GUIDE</span><h2>학습 안내</h2><ol><li><strong>이번 주 학습 확인</strong><p>게시된 단어와 문제를 확인하세요.</p></li><li><strong>답안 작성</strong><p>모든 문제에 답한 후 제출하세요. 작성 중인 답안은 새로고침하면 초기화됩니다.</p></li><li><strong>결과 복습</strong><p>채점된 답안과 해설은 내 풀이 기록에 보관됩니다.</p></li></ol><p className="lm-note">영단어는 대소문자를 구분하지 않습니다. 정답 또는 관리자가 지정한 허용 답안과 일치해야 합니다.</p><Link to="/growth/quest">퀘스트 대시보드 →</Link></aside></div>}
    {error && <div className="lm-error" role="alert">{error}{!attempt && <button className="lm-button" onClick={() => setRevision(x => x + 1)}>다시 조회</button>}</div>}
  </div>
}
