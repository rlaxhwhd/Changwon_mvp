import { useEffect, useRef, useState } from 'react'
import { streamAi, type ChatReply } from './chatbotApi'
import './AiCommentCard.css'

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
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function generate() {
    if (controller.current) return
    const abort = new AbortController()
    controller.current = abort
    setPending(true); setError(''); setProgress('근거 자료를 확인하고 있어요.')
    try { setReply(await streamAi('/ai/comments', props, abort.signal, setProgress)) }
    catch (e) { setError(abort.signal.aborted ? '생성을 중지했습니다.' : e instanceof Error ? e.message : '코멘트를 생성하지 못했습니다.') }
    finally { controller.current = null; setPending(false); setProgress('') }
  }
  return <section className="dc-ai-comment" aria-label={labels[props.kind]}>
    <div className="dc-ai-comment-head"><div><strong>{labels[props.kind]}</strong>
      <p>열람 가능한 기록과 내부 지식을 바탕으로 작성하는 검토용 초안입니다.</p></div>
      <button type="button" onClick={() => pending ? controller.current?.abort() : void generate()}>
        {pending ? '생성 중지' : reply ? '다시 생성' : '코멘트 생성'}
      </button></div>
    {pending && <p role="status">{progress}</p>}
    {error && <p role="alert">{error}</p>}
    {reply && <div className="dc-ai-comment-result">
      <div className="dc-ai-comment-text">{reply.text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</div>
      <details><summary>참고 근거 {reply.sources.length}개</summary>
        {reply.sources.map(source => <article key={source.id}>
          <strong>[{source.id}] {source.title}</strong><small>{source.origin}</small><p>{source.snippet}</p>
        </article>)}
      </details>
      {reply.notices.map(notice => <small key={notice}>{notice}</small>)}
    </div>}
  </section>
}
