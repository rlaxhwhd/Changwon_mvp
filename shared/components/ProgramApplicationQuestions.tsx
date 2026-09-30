import { useState } from 'react'
import { type ApplicationAnswers, type ApplicationQuestion, type ProgramFile, uploadProgramFile } from '../programContent'
import { DOCUMENT_ACCEPT } from '../uploadPolicy'
import './ProgramApplicationQuestions.css'

export default function ProgramApplicationQuestions({ questions, answers, onChange, onBusyChange }: {
  questions: ApplicationQuestion[]; answers: ApplicationAnswers
  onChange: (answers: ApplicationAnswers) => void; onBusyChange: (busy: boolean) => void
}) {
  const [uploads, setUploads] = useState<Record<string, ProgramFile[]>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = (id: string, value: string | string[]) => onChange({ ...answers, [id]: value })
  const attach = async (question: ApplicationQuestion, selected: File[]) => {
    if (busy) return
    const previous = uploads[question.id] ?? []
    if (selected.length + previous.length > question.maxFiles) { setError(`파일은 최대 ${question.maxFiles}개입니다.`); return }
    setBusy(true); onBusyChange(true); setError('')
    const next = [...previous]
    try {
      for (const file of selected) next.push(await uploadProgramFile(file, true))
    } catch (e) { setError(e instanceof Error ? e.message : '파일을 올리지 못했습니다.') }
    finally {
      setUploads(prev => ({ ...prev, [question.id]: next }))
      change(question.id, next.map(file => file.id))
      setBusy(false); onBusyChange(false)
    }
  }
  return <div className="program-questions">
    {questions.map((q, index) => <fieldset key={q.id} disabled={busy}>
      <legend>{index + 1}. {q.question}{q.required && <span className="program-question-required"> (필수)</span>}</legend>
      {q.type === 'TEXT' && <textarea aria-label={q.question} maxLength={500} value={String(answers[q.id] ?? '')} onChange={e => change(q.id, e.target.value)} placeholder="최대 500자" />}
      {(q.type === 'SINGLE' || q.type === 'MULTIPLE') && q.options.map(option => <label key={option}>
        <input type={q.type === 'SINGLE' ? 'radio' : 'checkbox'} name={`program-${q.id}`} checked={q.type === 'SINGLE' ? answers[q.id] === option : (answers[q.id] ?? []).includes(option)}
          onChange={e => {
            const value = answers[q.id]
            const current = Array.isArray(value) ? value : []
            change(q.id, q.type === 'SINGLE' ? option : e.target.checked ? [...current, option] : current.filter(x => x !== option))
          }} />{option}
      </label>)}
      {q.type === 'CONSENT' && <><p className="program-question-consent">{q.content}</p>{[['yes', '동의합니다'], ['no', '동의하지 않습니다']].map(([value, label]) => <label key={value}><input type="radio" name={`program-${q.id}`} checked={answers[q.id] === value} onChange={() => change(q.id, value)} />{label}</label>)}</>}
      {q.type === 'FILE' && <>
        <p>문서·이미지·ZIP / 파일당 10MB 이하 / 최대 {q.maxFiles}개</p>
        <input aria-label={q.question} type="file" multiple={q.maxFiles > 1} accept={DOCUMENT_ACCEPT} onChange={e => { void attach(q, Array.from(e.target.files ?? [])); e.target.value = '' }} />
        {(uploads[q.id] ?? []).map(file => <div key={file.id}>{file.name} <button type="button" onClick={() => {
          const remaining = uploads[q.id].filter(f => f.id !== file.id)
          setUploads(prev => ({ ...prev, [q.id]: remaining })); change(q.id, remaining.map(f => f.id))
        }} aria-label={`${file.name} 제거`}>제거</button></div>)}
      </>}
    </fieldset>)}
    {busy && <p role="status">첨부파일 업로드 중…</p>}
    {error && <p role="alert">{error}</p>}
  </div>
}
