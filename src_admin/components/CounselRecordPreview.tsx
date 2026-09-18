import { useState } from 'react'
import AdminModal from './AdminModal'
import CounselTemplateSummary from './CounselTemplateSummary'
import type { CounselTemplate } from '../data/schema/counselTemplate'

export default function CounselRecordPreview({ template, summary, comment, followUp, disabled }: {
  template?: CounselTemplate
  summary: string
  comment: string
  followUp: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="admin-btn admin-btn-ghost" disabled={disabled} onClick={() => setOpen(true)}>상담일지 미리보기</button>
    {open && <AdminModal title="상담일지 미리보기" onClose={() => setOpen(false)}>
      <p className="admin-field-hint">현재 입력한 내용입니다. 아직 저장되지 않은 변경사항이 포함될 수 있습니다.</p>
      <CounselTemplateSummary template={template} />
      <section className="counsel-record-preview-block"><h3>상담내용 · 학생 비공개</h3><p>{summary || '입력한 내용이 없습니다.'}</p></section>
      <section className="counsel-record-preview-block"><h3>학생 공개 코멘트</h3><p>{comment || '입력한 내용이 없습니다.'}</p></section>
      {followUp && <section className="counsel-record-preview-block"><h3>후속 조치</h3><p>{followUp}</p></section>}
    </AdminModal>}
  </>
}
