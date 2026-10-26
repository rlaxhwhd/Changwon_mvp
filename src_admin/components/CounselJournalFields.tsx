import { LuPaperclip } from 'react-icons/lu'
import CounselRecordFields from './CounselRecordFields'
import PsychJournalFields from './PsychJournalFields'
import type { PsychJournal } from '../data/schema/psychJournal'
import type { CounselRecord } from '../data/schema/counselRecord'
import type { CounselTemplate } from '../data/schema/counselTemplate'
import type { StudentType } from '../../src_v2/data/careerProcess'

interface Props {
  record?: CounselRecord
  requestId?: string
  career: boolean
  care7: boolean
  template: CounselTemplate
  setTemplate: (value: CounselTemplate) => void
  comment: string
  setComment: (value: string) => void
  diagnosisType: StudentType | null
  typeLocked: boolean
  saving?: boolean
  readOnly?: boolean
  /** 심리상담은 학생상담센터 상담일지 양식으로 쓴다 — career 가 false 일 때 쓰인다 */
  psychJournal: PsychJournal
  setPsychJournal: (value: PsychJournal) => void
  people?: { counselor: string; client: string; studentNo: string }
}

/** Shared journal layout for viewing and editing; persistence belongs to the caller. */
export default function CounselJournalFields({ record, requestId, career, care7, template, setTemplate,
  comment, setComment, psychJournal, setPsychJournal, people,
  diagnosisType, typeLocked, saving = false, readOnly = false }: Props) {
  return <fieldset className="counsel-journal-fields" disabled={readOnly || saving} aria-label="상담일지">
      {career ? <>
        {record?.summary && !record.template && <details className="admin-editor-hint"><summary>기존 상담내용 확인</summary><p style={{ whiteSpace: 'pre-wrap' }}>{record.summary}</p><p>기존 기록을 참고해 아래 항목으로 나누어 작성해 주세요.</p></details>}
        <CounselRecordFields value={template} onChange={setTemplate} comment={comment} onCommentChange={setComment}
          requestId={requestId ?? record?.requestId}
          diagnosisType={diagnosisType} care7={care7} disabled={saving} typeLocked={typeLocked} required />
      </> : <>
        {record?.summary && !record.psychJournal && <p className="admin-editor-hint">양식 도입 전에 쓴 상담내용을 「상담내용」 칸으로 옮겨 두었습니다. 나머지 항목을 채워 주세요.</p>}
        <PsychJournalFields value={psychJournal} onChange={setPsychJournal} comment={comment} onCommentChange={setComment}
          people={people} disabled={saving} />
      </>}

      <div className="admin-field">
        <span>첨부파일</span>
        <div className="admin-journal-attach">
          <LuPaperclip />
          <span>진단 결과지·이력서 등 상담 근거 자료를 첨부합니다.</span>
          <button type="button" className="admin-btn admin-btn-ghost sm" disabled>파일 선택</button>
        </div>
      </div>

  </fieldset>
}
