import { LuPaperclip } from 'react-icons/lu'
import CounselRecordFields from './CounselRecordFields'
import type { CounselRecord } from '../data/schema/counselRecord'
import type { CounselTemplate } from '../data/schema/counselTemplate'
import type { StudentType } from '../../src_v2/data/careerProcess'

interface Props {
  record?: CounselRecord
  career: boolean
  care7: boolean
  template: CounselTemplate
  setTemplate: (value: CounselTemplate) => void
  summary: string
  setSummary: (value: string) => void
  comment: string
  setComment: (value: string) => void
  followUp: string
  setFollowUp: (value: string) => void
  diagnosisType: StudentType | null
  typeLocked: boolean
  saving?: boolean
  readOnly?: boolean
}

/** Shared journal layout for viewing and editing; persistence belongs to the caller. */
export default function CounselJournalFields({ record, career, care7, template, setTemplate,
  summary, setSummary, comment, setComment, followUp, setFollowUp,
  diagnosisType, typeLocked, saving = false, readOnly = false }: Props) {
  return <fieldset className="counsel-journal-fields" disabled={readOnly || saving} aria-label="상담일지">
      {career ? <>
        {record?.summary && !record.template && <details className="admin-editor-hint"><summary>기존 상담내용 확인</summary><p style={{ whiteSpace: 'pre-wrap' }}>{record.summary}</p><p>기존 기록을 참고해 아래 항목으로 나누어 작성해 주세요.</p></details>}
        <CounselRecordFields value={template} onChange={setTemplate} comment={comment} onCommentChange={setComment}
          diagnosisType={diagnosisType} care7={care7} disabled={saving} typeLocked={typeLocked} required />
      </> : <>
      <label className="admin-field">
        <span>상담 내용 (소견)</span>
        <textarea
          rows={5}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="상담에서 다룬 내용과 상담사 소견을 기록합니다."
        />
      </label>

      <label className="admin-field">
        <span>학생 공개 코멘트</span>
        <textarea
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="학생 화면 '상담 현황'에 그대로 노출됩니다."
        />
        <small className="admin-field-hint">학생이 읽는 문구입니다. 소견과 분리해 작성하세요.</small>
      </label>

      </>}

      <label className="admin-field">
        <span>후속 조치</span>
        <input
          type="text"
          value={followUp}
          disabled={saving}
          onChange={e => setFollowUp(e.target.value)}
          placeholder="예: 이력서 첨삭 재상담 권고"
        />
      </label>

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
