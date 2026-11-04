import { useRef, useState } from 'react'
import { LuFileSpreadsheet, LuUpload } from 'react-icons/lu'
import { downloadXlsx } from '../../shared/xlsx'
import { useAsyncAction } from '../../shared/useAsyncAction'
import { UploadRejected } from '../data/xlsxUpload'
import type { UploadError } from '../data/xlsxUpload'

interface Props {
  /** 양식 파일 이름(.xlsx) */
  templateName: string
  /** 양식 머리글 — 서버가 이 이름으로 열을 찾는다. */
  header: string[]
  /** 파일을 올리고 완료 안내 문장을 돌려준다. */
  upload: (file: File) => Promise<string>
  onDone: () => void
}

/** 블랙리스트 엑셀 일괄 등록 — 양식 다운로드 · 엑셀 업로드 버튼과 결과(행별 오류) 안내. */
export function useExcelBulkUpload({ templateName, header, upload, onDone }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [rowErrors, setRowErrors] = useState<UploadError[]>([])
  const { run, saving, error } = useAsyncAction()

  const start = (file: File | undefined) => {
    if (!file) return
    setNotice(''); setRowErrors([])
    void run(async () => {
      try {
        setNotice(await upload(file))
        onDone()
      } catch (caught) {
        if (caught instanceof UploadRejected) setRowErrors(caught.errors)
        throw caught
      } finally {
        if (fileInput.current) fileInput.current.value = ''
      }
    })
  }

  const buttons = <>
    <button type="button" className="admin-btn admin-btn-ghost" onClick={() => downloadXlsx(templateName, [header])}>
      <LuFileSpreadsheet /> 엑셀 양식 다운로드
    </button>
    <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => fileInput.current?.click()}>
      <LuUpload /> {saving ? '업로드 중…' : '엑셀 업로드'}
    </button>
    <input ref={fileInput} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      onChange={e => start(e.target.files?.[0])} />
  </>

  const result = <>
    {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}
    {rowErrors.length > 0 && (
      <ul className="forecast-upload-errors" aria-label="업로드 오류 행">
        {rowErrors.map(e => <li key={e.row}><strong>{e.row}행</strong> {e.message}</li>)}
      </ul>
    )}
    {notice && <p role="status" className="admin-field-hint">{notice}</p>}
  </>

  return { buttons, result }
}
