import { formatJournalTime, isRemote, psychMethodLabel, type PsychJournal } from '../data/schema/psychJournal'

/** 심리상담 상담일지 읽기 전용 — 미리보기·일지 상세·인쇄가 같이 쓴다. 상담내용 본문은 부르는 쪽이 summary 로 보여 준다. */
export default function PsychJournalSummary({ journal }: { journal?: PsychJournal | null }) {
  if (!journal) return null
  return <div className="counsel-template-summary psych-journal-summary">
    <dl>
      <div><dt>회기</dt><dd>{journal.session ? `${journal.session}회기` : '미입력'}</dd></div>
      <div><dt>상담일시</dt><dd>{formatJournalTime(journal.conductedAt) || '미입력'}</dd></div>
      <div><dt>상담방법</dt><dd>{psychMethodLabel(journal)}</dd></div>
      <div><dt>다음 상담 약속</dt><dd>{formatJournalTime(journal.nextAt) || '—'}</dd></div>
      {isRemote(journal.method) && <div className="is-wide"><dt>비대면 진행사유</dt><dd>{journal.remoteReason || '미입력'}</dd></div>}
      {journal.crisis && <div className="is-wide"><dt>위기상황</dt><dd>{journal.crisis}</dd></div>}
      {journal.remarks && <div className="is-wide"><dt>비고</dt><dd>{journal.remarks}</dd></div>}
    </dl>
  </div>
}
