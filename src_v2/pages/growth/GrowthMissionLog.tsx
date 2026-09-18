import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../shared/api'
import { missionError, type MissionResult } from '../../../shared/missions'
import MissionReview from '../../components/MissionReview'
import { usePageHead } from '../../components/PageCrumb'
import './TodayGrowthMission.css'
interface History { items: { id: string; title: string; kind: string; submitted_at: string; result: MissionResult }[]; totalCount: number }
export default function GrowthMissionLog() {
  usePageHead('내 풀이 기록', '제출한 미션의 답안과 해설을 다시 확인합니다.')
  const [data, setData] = useState<History | null>(null)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    api<History>(`/missions/history?page=${page}`, { signal: abort.signal }).then(setData).catch(e => { if (!abort.signal.aborted) setError(missionError(e)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [page, revision])
  return <div className="lm-page"><header className="lm-heading"><div><span className="lm-kicker">LEARNING HISTORY</span><h2>기록을 돌아보며, 한 번 더</h2><p>실제로 제출한 문제풀이만 표시합니다.</p></div><Link className="lm-button" to="/growth/mission">이번 주 미션 →</Link></header>
    {error ? <p className="lm-error" role="alert">{error}<button onClick={() => { setLoading(true); setError(''); setRevision(x => x + 1) }}>다시 조회</button></p> : loading ? <p className="lm-empty" role="status">풀이 기록을 불러오는 중입니다.</p> : !data?.items.length ? <div className="lm-main lm-empty"><h2>아직 제출한 풀이가 없습니다</h2><p>이번 주 미션을 풀고 첫 기록을 남겨보세요.</p></div> : <><p className="lm-intro">총 {data.totalCount}회 풀이</p>{data.items.map(item => <details key={item.id} className="lm-history"><summary><span><small>{new Date(item.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · {item.kind === 'TOEIC' ? 'TOEIC' : 'NCS/GSAT'}</small><strong>{item.title}</strong></span><b>{item.result.correctCount} / {item.result.totalCount} 정답</b><span>해설 보기</span></summary><MissionReview result={item.result} /></details>)}<div className="lm-actions"><button className="lm-button" disabled={page <= 1} onClick={() => { setLoading(true); setError(''); setPage(x => x - 1) }}>이전</button><span>{page} / {Math.ceil(data.totalCount / 10)}</span><button className="lm-button" disabled={page * 10 >= data.totalCount} onClick={() => { setLoading(true); setError(''); setPage(x => x + 1) }}>다음</button></div></>}
  </div>
}
