import { useEffect, useRef, useState } from 'react'
import { LuArrowUpRight, LuRotateCcw, LuSend, LuSquare, LuX } from 'react-icons/lu'
import { ApiError } from './api'
import { askChatbot, type ChatReply, type ChatSource, type ChatTurn } from './chatbotApi'
import './Chatbot.css'

type Message = { id: number; role: 'user' | 'assistant'; text: string; reply?: ChatReply; failed?: boolean }

function sourceUrl(source: ChatSource): string | undefined {
  try {
    const url = new URL(source.url)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

function Answer({ message }: { message: Message }) {
  const sources = message.reply?.sources ?? []
  return <>
    <div className="dc-chat-text">{message.text.split(/(\[[SR]\d+\]|\*\*[^*\n]+\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
      const source = sources.find(item => `[${item.id}]` === part)
      const href = source && sourceUrl(source)
      return href ? <a key={i} href={href} target="_blank" rel="noopener noreferrer" title={source?.title}>{part}</a> : part
    })}</div>
    {sources.length > 0 && <div className="dc-chat-sources">
      <strong>확인한 출처</strong>
      {sources.map(source => {
        const href = sourceUrl(source)
        return href ? <a key={source.id} href={href} target="_blank" rel="noopener noreferrer">
          <span>{source.title || new URL(href).hostname}</span><LuArrowUpRight aria-hidden="true" />
        </a> : <details key={source.id}><summary>[{source.id}] {source.title}</summary><small>{source.origin}</small><p>{source.snippet}</p></details>
      })}
    </div>}
    {message.reply?.notices.map(notice => <p className="dc-chat-notice" key={notice}>{notice}</p>)}
  </>
}

/** Mounted once in each authenticated portal, outside individual page routes. */
export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [loginRequired, setLoginRequired] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const serial = useRef(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [open])
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [messages, progress, error, open])

  async function send(raw: string, retry = false) {
    const question = raw.trim()
    if (!question || controller.current || question.length > 800) return
    const abort = new AbortController()
    controller.current = abort
    const previous = retry ? messages.slice(0, -1) : messages
    const id = ++serial.current
    const userMessage: Message = { id, role: 'user', text: question }
    const history: ChatTurn[] = []
    for (let i = 0; i < previous.length - 1; i++) {
      const turn = previous[i], answer = previous[i + 1]
      if (turn.role === 'user' && !turn.failed && answer.role === 'assistant') {
        history.push({ role: 'user', content: turn.text }, { role: 'assistant', content: answer.text.slice(0, 3000) })
      }
    }
    let recent = history.slice(-10)
    while (recent.reduce((sum, item) => sum + item.content.length, 0) > 12000) recent = recent.slice(2)
    setMessages([...previous, userMessage]); setInput(''); setError(''); setPending(true)
    setProgress('답변을 준비하고 있어요.')
    try {
      const reply = await askChatbot(question, recent, abort.signal, setProgress)
      setMessages(current => [...current, { id: ++serial.current, role: 'assistant', text: reply.text, reply }])
    } catch (reason) {
      setMessages(current => current.map(item => item.id === id ? { ...item, failed: true } : item))
      if (abort.signal.aborted) setError('답변 생성을 중지했습니다.')
      else {
        setError(reason instanceof Error ? reason.message : '답변을 받지 못했습니다.')
        if (reason instanceof ApiError && reason.status === 401) setLoginRequired(true)
      }
    } finally {
      controller.current = null; setPending(false); setProgress('')
    }
  }

  const retryMessage = messages.at(-1)?.failed ? messages.at(-1) : undefined
  return <div className="dc-chat">
    <button ref={buttonRef} type="button" className={`dc-chat-fab${open ? ' is-open' : ''}`}
      onClick={() => setOpen(value => !value)} aria-label={open ? '챗봇 닫기' : '챗봇 열기'}
      aria-expanded={open} aria-controls="dc-chat-panel">
      {open ? <LuX aria-hidden="true" /> : <img src="/chatbot.webp" alt="" />}
    </button>
    {open && <section id="dc-chat-panel" className="dc-chat-panel" role="dialog" aria-labelledby="dc-chat-title">
      <header className="dc-chat-head">
        <img src="/chatbot.webp" alt="" />
        <div><strong id="dc-chat-title">드림캐치 AI 도우미</strong><small>진로 고민부터 최신 정보 검색까지</small></div>
        <button type="button" aria-label="새 대화" title="새 대화" disabled={pending || !messages.length}
          onClick={() => { setMessages([]); setError(''); setInput(''); inputRef.current?.focus() }}><LuRotateCcw /></button>
        <button type="button" aria-label="대화창 닫기" onClick={() => { setOpen(false); buttonRef.current?.focus() }}><LuX /></button>
      </header>
      <div ref={bodyRef} className="dc-chat-body" role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && <div className="dc-chat-welcome">
          <span className="dc-chat-eyebrow">무엇이 궁금하세요?</span>
          <h2>함께 다음 단계를<br />찾아볼까요?</h2>
          <p>자격증 일정은 웹에서 확인하고,<br />진로·취업 준비는 대화로 풀어보세요.</p>
          <div className="dc-chat-suggestions">
            {['정보처리기사 일정 알려줘', '면접 준비는 어떻게 시작할까?', '나에게 맞는 진로를 찾고 싶어'].map(question =>
              <button type="button" key={question} onClick={() => void send(question)}>{question}<LuArrowUpRight aria-hidden="true" /></button>)}
          </div>
        </div>}
        {messages.map(message => <article className={`dc-chat-message is-${message.role}`} key={message.id}
          aria-label={message.role === 'user' ? '내 질문' : 'AI 답변'}><Answer message={message} /></article>)}
        {pending && <div className="dc-chat-progress" role="status"><span aria-hidden="true" />{progress}</div>}
        {error && <div className="dc-chat-error" role="alert"><p>{error}</p>
          {loginRequired ? <a href="/login">다시 로그인</a> : retryMessage &&
            <button type="button" onClick={() => void send(retryMessage.text, true)} disabled={pending}>다시 보내기</button>}
        </div>}
      </div>
      <form className="dc-chat-compose" onSubmit={event => { event.preventDefault(); void send(input) }}>
        <label className="dc-chat-sr" htmlFor="dc-chat-question">챗봇 질문</label>
        <textarea id="dc-chat-question" ref={inputRef} value={input} maxLength={800} rows={2}
          onChange={event => setInput(event.target.value)} placeholder="궁금한 내용을 물어보세요"
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault(); void send(input)
            }
          }} disabled={loginRequired} />
        {pending ? <button type="button" aria-label="답변 생성 중지" onClick={() => controller.current?.abort()}><LuSquare /></button>
          : <button type="submit" aria-label="질문 보내기" disabled={!input.trim() || loginRequired}><LuSend /></button>}
      </form>
      <p className="dc-chat-footnote">중요한 일정은 답변에 첨부된 공식 출처에서 확인해 주세요.</p>
    </section>}
  </div>
}
