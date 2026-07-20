import { LuSend, LuX } from 'react-icons/lu'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { askCounselBot, botGreeting, type ChatMessage } from '../data/counselChatbot'

/** 우측 하단 플로팅 상담 질문 챗봇 (모든 상담사 화면에서 따라다님). */
export default function Chatbot() {
  const { pathname } = useLocation()
  const sessionMatch = pathname.match(/^\/counsel\/session\/(.+)$/)
  const studentId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : undefined

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // 열릴 때 / 학생이 바뀔 때 인사말로 리셋
  useEffect(() => {
    setMessages(open ? [{ role: 'bot', text: botGreeting({ studentId }) }] : [])
  }, [open, studentId])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [messages, loading])

  const send = async (text: string) => {
    if (loading) return
    const trimmed = text.trim()
    setMessages(prev => [...prev, { role: 'user', text: trimmed || '질문 추천해줘' }])
    setInput('')
    setLoading(true)
    const reply = await askCounselBot(trimmed, { studentId })
    setMessages(prev => [...prev, { role: 'bot', text: reply }])
    setLoading(false)
  }

  return (
    <>
      <button
        type="button"
        className={`counsel-chatbot-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? '챗봇 닫기' : '상담 질문 챗봇 열기'}
      >
        {open ? <LuX /> : <img src="/chatbot.png" alt="" />}
      </button>

      {open && (
        <div className="counsel-chatbot-panel" role="dialog" aria-label="상담 질문 챗봇">
          <div className="counsel-chatbot-head">
            <img src="/chatbot.png" alt="" />
            <div>
              <strong>상담 질문 도우미</strong>
              <small>AI 실시간 추천 · gem5 연동 예정</small>
            </div>
          </div>

          <div className="counsel-chatbot-body" ref={bodyRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`counsel-chat-msg is-${msg.role}`}>
                {msg.text.split('\n').map((line, j) => <p key={j}>{line || ' '}</p>)}
              </div>
            ))}
            {loading && (
              <div className="counsel-chat-msg is-bot is-typing"><span /><span /><span /></div>
            )}
          </div>

          <div className="counsel-chatbot-quick">
            <button type="button" onClick={() => send('')} disabled={loading}>✨ 질문 추천</button>
          </div>
          <form className="counsel-chatbot-input" onSubmit={e => { e.preventDefault(); if (input.trim()) send(input) }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="학생에 대해 물어보세요…" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="보내기"><LuSend /></button>
          </form>
        </div>
      )}
    </>
  )
}
