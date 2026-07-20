import { LuGraduationCap, LuList, LuSave } from 'react-icons/lu'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addProgram } from '../data/programs'
import { blankProgram, PROGRAM_CATEGORIES, PROGRAM_STATUSES } from '../data/schema/program'
import type { Program, ProgramCategory, ProgramStatus } from '../data/schema/program'

type Draft = Omit<Program, 'id' | 'applicants' | 'createdAt'>

export default function ProgramForm() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Draft>(() => blankProgram())
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }))

  const canSave = draft.title.trim() !== '' && draft.startDate !== '' && draft.endDate !== '' && !saved

  const handleSave = () => {
    if (!canSave) return
    addProgram({ ...draft, title: draft.title.trim(), desc: draft.desc.trim() })
    setSaved(true)
    window.setTimeout(() => navigate('/programs'), 500)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuGraduationCap /> 프로그램 등록
          </h1>
          <p className="admin-page-desc">학생 비교과 신청 화면에 노출될 비교과 프로그램을 등록합니다.</p>
        </div>
        <div className="admin-head-actions">
          <Link to="/programs" className="admin-btn admin-btn-ghost">
            <LuList /> 프로그램 목록
          </Link>
        </div>
      </header>

      <section className="admin-card">
        <div className="admin-form-grid">
          <label className="admin-field admin-field-full">
            <span>프로그램명 <em className="admin-req-mark">*</em></span>
            <input
              type="text"
              value={draft.title}
              onChange={e => set('title', e.target.value)}
              placeholder="예: 데이터 직무 부트캠프"
            />
          </label>

          <label className="admin-field admin-field-full">
            <span>소개</span>
            <textarea
              rows={3}
              value={draft.desc}
              onChange={e => set('desc', e.target.value)}
              placeholder="프로그램 내용·대상·기대효과를 간단히 소개하세요."
            />
          </label>

          <label className="admin-field">
            <span>분류</span>
            <select value={draft.category} onChange={e => set('category', e.target.value as ProgramCategory)}>
              {PROGRAM_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>정원</span>
            <input
              type="number"
              min={1}
              value={draft.capacity}
              onChange={e => set('capacity', Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          <label className="admin-field">
            <span>신청 시작일 <em className="admin-req-mark">*</em></span>
            <input type="date" value={draft.startDate} onChange={e => set('startDate', e.target.value)} />
          </label>

          <label className="admin-field">
            <span>신청 마감일 <em className="admin-req-mark">*</em></span>
            <input type="date" value={draft.endDate} onChange={e => set('endDate', e.target.value)} />
          </label>

          <label className="admin-field">
            <span>진행 장소</span>
            <input
              type="text"
              value={draft.location}
              onChange={e => set('location', e.target.value)}
              placeholder="예: 공학관 502 실습실"
            />
          </label>

          <label className="admin-field">
            <span>상태</span>
            <select value={draft.status} onChange={e => set('status', e.target.value as ProgramStatus)}>
              {PROGRAM_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        {!canSave && !saved && (
          <p className="admin-form-hint admin-form-hint-warn">프로그램명과 신청 시작/마감일은 필수입니다.</p>
        )}

        <div className="admin-form-actions">
          <button className="admin-btn admin-btn-primary" disabled={!canSave} onClick={handleSave}>
            <LuSave /> {saved ? '등록됨' : '등록'}
          </button>
        </div>
      </section>
    </div>
  )
}
