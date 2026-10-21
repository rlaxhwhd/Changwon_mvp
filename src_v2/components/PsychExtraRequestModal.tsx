import { useEffect, useState } from 'react'
import Modal from './Modal'
import PsychExtraWriterTable from '../../shared/components/PsychExtraWriterTable'
import { createPsychExtraRequest, loadPsychExtraWriter, type PsychExtraWriter } from '../../shared/psychExtraRequests'
import './PsychExtraRequestModal.css'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

/** 추가상담신청 — 심리상담 자리가 모두 마감된 학생이 원하는 날짜·시간대를 남긴다. 심리상담사 게시판으로 간다. */
export default function PsychExtraRequestModal({ open, onClose, onSaved }: Props) {
  const [writer, setWriter] = useState<PsychExtraWriter | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || writer) return
    let active = true
    loadPsychExtraWriter().then(row => { if (active) setWriter(row) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : '학생 정보를 불러오지 못했습니다.') })
    return () => { active = false }
  }, [open, writer])

  const submit = async () => {
    if (!title.trim()) { setError('제목을 입력해 주세요.'); return }
    setSaving(true)
    setError('')
    try {
      await createPsychExtraRequest({ title: title.trim(), body })
      setTitle('')
      setBody('')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : '신청하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="추가상담신청" size="md">
      <div className="pxr">
        <p className="pxr-notice">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          심리상담 자리가 모두 마감되어 신청을 못하는 학생은 원하는 날짜와 시간대를 적어주시면 연락드리겠습니다.
        </p>
        <h3 className="pxr-section">상담 정보</h3>
        <PsychExtraWriterTable writer={writer} />
        <label className="pxr-field">
          <span>제목<em aria-hidden="true">*</em></span>
          <input value={title} maxLength={200} required onChange={e => setTitle(e.target.value)} />
        </label>
        <label className="pxr-field pxr-field-body">
          <span>내용</span>
          <textarea rows={10} value={body} maxLength={20000} placeholder="원하는 날짜와 시간대, 상담받고 싶은 내용을 적어 주세요." onChange={e => setBody(e.target.value)} />
        </label>
        {error && <p className="pxr-error" role="alert">{error}</p>}
        <div className="pxr-actions">
          <button type="button" className="pxr-cancel" onClick={onClose}>취소</button>
          <button type="button" className="pxr-submit" disabled={saving || !title.trim()} onClick={submit}>{saving ? '신청 중…' : '신청하기'}</button>
        </div>
      </div>
    </Modal>
  )
}
