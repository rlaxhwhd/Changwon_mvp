import { useRef, useState } from 'react'
import { downloadXlsx } from '../../shared/xlsx'
import { useAsyncAction } from '../../shared/useAsyncAction'
import { UploadRejected } from '../data/xlsxUpload'
import type { UploadError } from '../data/xlsxUpload'
import AdminModal from './AdminModal'
import '../pages/ProfessorCounsel.css'

interface Props {
  title: string
  /** 양식 파일 이름(.xlsx) */
  templateName: string
  /** 파일을 올리고 완료 안내 문장을 돌려준다. */
  upload: (file: File) => Promise<string>
  onDone: () => void
  onClose: () => void
}

/** 비교과 명단 엑셀 업로드 팝업 — 양식(차수·학번)을 받고, 파일을 골라 등록한다. */
export default function ProgramRosterUpload({ title, templateName, upload, onDone, onClose }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [notice, setNotice] = useState('')
  const [rowErrors, setRowErrors] = useState<UploadError[]>([])
  const { run, saving, error } = useAsyncAction()

  const submit = () => {
    if (!file) return
    setNotice(''); setRowErrors([])
    void run(async () => {
      try {
        setNotice(await upload(file))
        setFile(null)
        onDone()
      } catch (caught) {
        if (caught instanceof UploadRejected) setRowErrors(caught.errors)
        throw caught
      } finally {
        if (fileInput.current) fileInput.current.value = ''
      }
    })
  }

  return (
    <AdminModal title={title} onClose={onClose}>
      <dl className="professor-personal-grid">
        <dt>엑셀양식</dt>
        <dd className="professor-personal-wide">
          <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => downloadXlsx(templateName, [['차수', '학번']])}>
            다운로드
          </button>
        </dd>
        <dt>파일첨부 <em className="forecast-required" aria-hidden="true">*</em></dt>
        <dd className="professor-personal-wide">
          <button type="button" className="admin-btn admin-btn-ghost sm" onClick={() => fileInput.current?.click()}>
            첨부파일등록
          </button>
          {file?.name}
          <input ref={fileInput} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setNotice('') }} />
        </dd>
      </dl>
      {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}
      {rowErrors.length > 0 && (
        <ul className="forecast-upload-errors" aria-label="업로드 오류 행">
          {rowErrors.map(e => <li key={e.row}><strong>{e.row}행</strong> {e.message}</li>)}
        </ul>
      )}
      {notice && <p role="status" className="admin-field-hint">{notice}</p>}
      <div className="admin-program-upload-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={!file || saving} onClick={submit}>
          {saving ? '등록 중…' : '등록'}
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>닫기</button>
      </div>
    </AdminModal>
  )
}
