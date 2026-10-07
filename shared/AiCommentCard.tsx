import { useEffect, useRef, useState } from 'react'
import { streamAi, type ChatReply } from './chatbotApi'
import './AiCommentCard.css'
import { api, queryString } from './api'

type Props = {
  studentId: string
  kind: 'diagnosis' | 'counsel' | 'comprehensive' | 'roadmap'
  testId?: string
  attemptNo?: number
  counselRequestId?: string
}
const labels = { diagnosis: '진단 결과 AI 코멘트', counsel: '상담 AI 코멘트', comprehensive: '종합 AI 코멘트', roadmap: '로드맵 AI 검토' }

export default function AiCommentCard(props: Props) {
  return <Comment key={JSON.stringify(props)} {...props} />
}

function Comment(props: Props) {
  const [reply, setReply] = useState<ChatReply | null>(null)
  const [studentReply, setStudentReply] = useState<ChatReply | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    const abort = new AbortController()
    void api<{ comment: ChatReply | null; studentComment: ChatReply | null }>(`/ai/comments?${queryString(props)}`, { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) { setReply(result.comment); setStudentReply(result.studentComment) } })
      .catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : '저장된 코멘트를 불러오지 못했습니다.') })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [])
  async function generate() {
    if (controller.current) return
    const abort = new AbortController()
    controller.current = abort
    setPending(true); setError(''); setProgress('근거 자료를 확인하고 있어요.')
    try { setReply(await streamAi('/ai/comments', props, abort.signal, setProgress)) }
    catch (e) { setError(abort.signal.aborted ? '생성을 중지했습니다.' : e instanceof Error ? e.message : '코멘트를 생성하지 못했습니다.') }
    finally { controller.current = null; setPending(false); setProgress('') }
  }
  return <section className="dc-ai-comment" aria-label={labels[props.kind]} aria-busy={pending || loading}>
    <div className="dc-ai-comment-head"><div><strong>{labels[props.kind]}</strong>
      <p>기록과 참고 자료를 바탕으로 작성하며, 완성된 코멘트는 자동 저장됩니다.</p></div>
      <button type="button" disabled={pending || loading} onClick={() => void generate()}>
        {pending ? <><span className="dc-ai-spinner" aria-hidden="true" /> 생성 중</> : loading ? '불러오는 중' : reply ? '다시 생성' : '코멘트 생성'}
      </button></div>
    {(pending || loading) && <div className="dc-ai-comment-loading" role="status" aria-live="polite">
      <div className="dc-ai-comment-progress"><span className="dc-ai-spinner" aria-hidden="true" /><span>{pending ? progress : '저장된 코멘트를 불러오고 있어요.'}</span></div>
      <div className="dc-ai-comment-skeleton" aria-hidden="true"><span /><span /><span /></div>
    </div>}
    {error && <p role="alert">{error}</p>}
    {reply && <CommentResult reply={reply} label={studentReply ? '상담사용 코멘트' : undefined} />}
    {studentReply && <CommentResult reply={studentReply} label="학생에게 표시되는 코멘트" />}
  </section>
}

function CommentResult({ reply, label }: { reply: ChatReply; label?: string }) {
  return <div className="dc-ai-comment-result">
      {label && <strong className="dc-ai-comment-audience">{label}</strong>}
      {reply.savedAt && <p className="dc-ai-comment-saved">저장됨 · {new Date(reply.savedAt).toLocaleString('ko-KR')}</p>}
      {reply.stale && <p className="dc-ai-comment-stale">생성 이후 참고 기록이 변경되었습니다. 최신 기록으로 다시 생성할 수 있습니다.</p>}
      <div className="dc-ai-comment-text">{reply.text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</div>
      <details><summary>참고 근거 {reply.sources.length}개</summary>
        {reply.sources.map(source => <article key={source.id}>
          <strong>[{source.id}] {source.title}</strong><small>{source.origin}</small><p>{source.snippet}</p>
        </article>)}
      </details>
      {reply.notices.map(notice => <small key={notice}>{notice}</small>)}
    </div>
}
