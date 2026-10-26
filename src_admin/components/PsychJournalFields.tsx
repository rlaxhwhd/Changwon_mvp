import { isRemote, PSYCH_JOURNAL_METHODS, type PsychJournal } from '../data/schema/psychJournal'
import './CounselRecordFields.css'

const METHOD_LABEL: Record<typeof PSYCH_JOURNAL_METHODS[number], string> = {
  대면: '대면', 전화: '비대면 · 전화', ZOOM: '비대면 · ZOOM', 기타: '비대면 · 기타',
}

/** 심리상담 상담일지 양식([붙임 14]) 입력 — 저장은 부르는 화면이 한다. 진로취업 CounselRecordFields 와 같은 카드 모양을 쓴다. */
export default function PsychJournalFields({ value, onChange, comment, onCommentChange, people, disabled = false }: {
  value: PsychJournal
  onChange: (value: PsychJournal) => void
  comment: string
  onCommentChange: (value: string) => void
  /** 양식 머리의 상담자·내담자·학번 — 기록·신청 스냅샷에서 온다(여기서 입력하지 않는다) */
  people?: { counselor: string; client: string; studentNo: string }
  disabled?: boolean
}) {
  const set = <K extends keyof PsychJournal>(key: K, next: PsychJournal[K]) => onChange({ ...value, [key]: next })
  return <fieldset className="counsel-template" disabled={disabled} aria-label="심리상담 상담일지">
    <section className="counsel-template-card">
      <div className="counsel-template-heading"><h3>상담일지</h3><span>학생상담센터 상담일지 양식</span></div>
      <div className="counsel-template-meta">
        <label className="admin-field"><span>회기 <em className="admin-req-mark">*</em></span>
          <input type="number" min={1} max={99} value={value.session ?? ''}
            onChange={e => set('session', e.target.value ? Math.min(99, Math.max(1, Number(e.target.value))) : null)} />
        </label>
        <label className="admin-field"><span>상담일시 <em className="admin-req-mark">*</em></span>
          <input type="datetime-local" value={value.conductedAt} onChange={e => set('conductedAt', e.target.value)} />
        </label>
      </div>
      {people && <dl className="psych-journal-people">
        <div><dt>상담자</dt><dd>{people.counselor || '—'}</dd></div>
        <div><dt>내담자</dt><dd>{people.client || '—'}</dd></div>
        <div><dt>학번/직번</dt><dd>{people.studentNo || '—'}</dd></div>
      </dl>}
      <fieldset className="counsel-template-choice psych-journal-method">
        <legend>상담방법 <em className="admin-req-mark">*</em></legend>
        <div className="counsel-template-segments">
          {PSYCH_JOURNAL_METHODS.map(method => <label key={method} className={value.method === method ? 'is-selected' : ''}>
            <input type="radio" name="psych-journal-method" checked={value.method === method} onChange={() => set('method', method)} />
            {METHOD_LABEL[method]}
          </label>)}
        </div>
      </fieldset>
      {value.method === '기타' && <label className="admin-field psych-journal-gap"><span>기타 상담방법 <em className="admin-req-mark">*</em></span>
        <input type="text" maxLength={100} value={value.methodOther} onChange={e => set('methodOther', e.target.value)} placeholder="예: 화상 메신저" />
      </label>}
      {isRemote(value.method) && <label className="admin-field psych-journal-gap"><span>비대면 진행사유 <em className="admin-req-mark">*</em></span>
        <textarea rows={2} maxLength={2000} value={value.remoteReason} onChange={e => set('remoteReason', e.target.value)} />
      </label>}
    </section>

    <section className="counsel-template-card">
      <label className="admin-field"><span>상담내용(주요사항, 위기상황 등) <em className="admin-req-mark">*</em></span>
        <textarea rows={8} maxLength={20000} value={value.content} onChange={e => set('content', e.target.value)} placeholder="내부 기록입니다. 학생에게 보이지 않습니다." />
      </label>
      <div className="counsel-template-notes psych-journal-gap">
        <label className="admin-field"><span>위기상황</span>
          <textarea rows={3} maxLength={5000} value={value.crisis} onChange={e => set('crisis', e.target.value)} />
        </label>
        <label className="admin-field"><span>비고</span>
          <textarea rows={3} maxLength={5000} value={value.remarks} onChange={e => set('remarks', e.target.value)} />
        </label>
      </div>
      <label className="admin-field psych-journal-gap"><span>다음 상담 약속</span>
        <input type="datetime-local" value={value.nextAt} onChange={e => set('nextAt', e.target.value)} />
      </label>
    </section>

    <section className="counsel-template-card counsel-template-public">
      <label className="admin-field"><span>학생 공개 코멘트 <em className="admin-req-mark">*</em></span>
        <textarea rows={3} value={comment} onChange={e => onCommentChange(e.target.value)} placeholder="학생 화면 '상담 현황'에 그대로 노출됩니다." />
        <small className="admin-field-hint">학생이 읽는 문구입니다. 상담내용과 분리해 작성하세요.</small>
      </label>
    </section>
  </fieldset>
}
