import { LuMessageSquareMore } from 'react-icons/lu'
import CounselTemplateSummary from './CounselTemplateSummary'
import type { CounselRecord } from '../data/schema/counselRecord'

/** Internal journal content shared by the journal register and counseling history. */
export default function CounselJournalBody({ record }: { record: CounselRecord }) {
  return (
<div className="admin-journal-body">
                      <CounselTemplateSummary template={record.template} />
                      <div className="admin-record-item-summary">
                        <span className="admin-record-label">상담내용</span>
                        <p>{record.summary || '아직 작성되지 않았습니다.'}</p>
                      </div>
                      <div className="admin-record-item-comment">
                        <span className="admin-record-label">
                          <LuMessageSquareMore /> 학생 공개 코멘트
                        </span>
                        <p>{record.comment || '아직 작성되지 않았습니다.'}</p>
                      </div>
                      {record.followUp && (
                        <div className="admin-record-item-followup">
                          <span className="admin-record-label">후속 조치</span>
                          <p>{record.followUp}</p>
                        </div>
                      )}
                    </div>
  )
}
