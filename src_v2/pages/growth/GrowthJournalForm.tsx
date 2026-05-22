import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadJournalEntries, saveJournalEntries, type Category, type Entry } from './GrowthJournal'
import './GrowthJournal.css'

const EMPTY_ENTRY = {
  category: '팀프로젝트' as Category,
  title: '',
  date: new Date().toISOString().slice(0, 10),
  situation: '',
  role: '',
  action: '',
  result: '',
  learning: '',
  resumeMemo: '',
  tagsText: '',
  resumeUsed: false,
}

export default function GrowthJournalForm() {
  const navigate = useNavigate()
  const { entryId } = useParams()
  const isEdit = Boolean(entryId)
  const entries = useMemo(() => loadJournalEntries(), [])
  const entry = useMemo(
    () => entries.find(item => String(item.id) === entryId),
    [entries, entryId],
  )

  const [form, setForm] = useState(() => entry ? {
    category: entry.category,
    title: entry.title,
    date: entry.date,
    situation: entry.situation,
    role: entry.role,
    action: entry.action,
    result: entry.result,
    learning: entry.learning,
    resumeMemo: entry.resumeMemo,
    tagsText: entry.tags.join(', '),
    resumeUsed: entry.resumeUsed,
  } : EMPTY_ENTRY)

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const tags = form.tagsText.split(',').map(tag => tag.trim()).filter(Boolean)
    const nextEntry: Entry = {
      id: entry?.id ?? Math.max(0, ...entries.map(item => item.id)) + 1,
      category: form.category,
      title: form.title || '제목 없는 성장경험일지',
      desc: form.situation,
      situation: form.situation,
      role: form.role,
      action: form.action,
      result: form.result,
      learning: form.learning,
      resumeMemo: form.resumeMemo,
      tags,
      date: form.date,
      bookmarked: entry?.bookmarked ?? false,
      resumeUsed: form.resumeUsed,
    }
    const nextEntries = entry
      ? entries.map(item => item.id === entry.id ? nextEntry : item)
      : [nextEntry, ...entries]
    saveJournalEntries(nextEntries)
    navigate('/growth/journal')
  }

  return (
    <div className="gj-wrapper">
      <div className="gj-content">
        <div className="gj-edit-shell">
          <div className="gj-edit-header">
            <button className="gj-back-btn" onClick={() => navigate('/growth/journal')}>
              <i className="fa-solid fa-arrow-left" /> 목록으로
            </button>
            <div>
              <h1 className="gj-edit-title">{isEdit ? '성장경험일지 상세/수정' : '새 성장경험일지 작성'}</h1>
              <p className="gj-edit-desc">
                경험의 상황, 나의 역할, 행동과 결과를 정리하면 자소서와 면접 답변에 바로 활용할 수 있어요.
              </p>
            </div>
          </div>

          <form className="gj-edit-card" onSubmit={handleSubmit}>
            <section className="gj-form-section">
              <div className="gj-section-head">
                <span className="gj-section-num">01</span>
                <div>
                  <h2>기본 정보</h2>
                  <p>경험을 빠르게 구분할 수 있는 정보를 입력하세요.</p>
                </div>
              </div>
              <div className="gj-form-grid">
                <label className="gj-field gj-field-wide">
                  <span>제목</span>
                  <input
                    value={form.title}
                    onChange={event => update('title', event.target.value)}
                    placeholder="예: 카페 매장 아르바이트 - 고객 응대 개선 경험"
                  />
                </label>
                <label className="gj-field">
                  <span>카테고리</span>
                  <select value={form.category} onChange={event => update('category', event.target.value)}>
                    <option>아르바이트</option>
                    <option>팀프로젝트</option>
                    <option>기타 활동</option>
                  </select>
                </label>
                <label className="gj-field">
                  <span>작성일</span>
                  <input type="date" value={form.date} onChange={event => update('date', event.target.value)} />
                </label>
                <label className="gj-field gj-field-wide">
                  <span>키워드</span>
                  <input
                    value={form.tagsText}
                    onChange={event => update('tagsText', event.target.value)}
                    placeholder="쉼표로 구분해 입력하세요. 예: 협업, 문제해결, 커뮤니케이션"
                  />
                </label>
              </div>
            </section>

            <section className="gj-form-section">
              <div className="gj-section-head">
                <span className="gj-section-num">02</span>
                <div>
                  <h2>경험 상세</h2>
                  <p>STAR 구조에 맞춰 경험을 구체적으로 정리하세요.</p>
                </div>
              </div>
              <div className="gj-form-grid">
                <label className="gj-field gj-field-wide">
                  <span>상황</span>
                  <textarea rows={4} value={form.situation} onChange={event => update('situation', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>나의 역할</span>
                  <textarea rows={5} value={form.role} onChange={event => update('role', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>행동</span>
                  <textarea rows={5} value={form.action} onChange={event => update('action', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>결과</span>
                  <textarea rows={5} value={form.result} onChange={event => update('result', event.target.value)} />
                </label>
                <label className="gj-field">
                  <span>배운 점</span>
                  <textarea rows={5} value={form.learning} onChange={event => update('learning', event.target.value)} />
                </label>
              </div>
            </section>

            <section className="gj-form-section">
              <div className="gj-section-head">
                <span className="gj-section-num">03</span>
                <div>
                  <h2>자소서 활용 메모</h2>
                  <p>어떤 문항이나 직무에 활용할 수 있을지 남겨두세요.</p>
                </div>
              </div>
              <label className="gj-field">
                <span>활용 메모</span>
                <textarea rows={5} value={form.resumeMemo} onChange={event => update('resumeMemo', event.target.value)} />
              </label>
              <label className="gj-check-field">
                <input
                  type="checkbox"
                  checked={form.resumeUsed}
                  onChange={event => update('resumeUsed', event.target.checked)}
                />
                <span>자소서에 활용한 경험으로 표시</span>
              </label>
            </section>

            <div className="gj-edit-actions">
              <button type="button" className="gj-cancel-btn" onClick={() => navigate('/growth/journal')}>
                취소
              </button>
              <button type="submit" className="gj-save-btn">
                {isEdit ? '수정 내용 저장' : '일지 저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
