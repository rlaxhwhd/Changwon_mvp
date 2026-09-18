import { useId } from 'react'
import { LuLockKeyhole, LuMessageSquareMore, LuSparkles } from 'react-icons/lu'
import { STUDENT_TYPE_MAP, type StudentType, typeLabel } from '../../src_v2/data/careerProcess'
import { COUNSEL_CHANNELS, QUALITATIVE_ITEMS, type CounselTemplate } from '../data/schema/counselTemplate'
import './CounselRecordFields.css'

interface Props {
  value: CounselTemplate
  onChange: (value: CounselTemplate) => void
  comment: string
  onCommentChange: (value: string) => void
  diagnosisType?: StudentType | null
  disabled?: boolean
  required?: boolean
  care7: boolean
  typeLocked?: boolean
}

/** 상담 진행·상담일지 작성에서 동일한 템플릿을 편집한다. 저장과 권한은 호출자가 담당한다. */
export default function CounselRecordFields({ value, onChange, comment, onCommentChange, diagnosisType, disabled, required, care7, typeLocked }: Props) {
  const id = useId()
  const patch = (fields: Partial<CounselTemplate>) => onChange({ ...value, ...fields })
  return (
    <fieldset className="counsel-template" disabled={disabled}>
      <legend className="counsel-template-sr">상담일지 입력</legend>
      {value.legacySummary && <details><summary>기존 양식의 상담내용</summary><p style={{ whiteSpace: 'pre-wrap' }}>{value.legacySummary}</p></details>}
      <div className="counsel-template-meta">
        <fieldset className="counsel-template-choice">
          <legend>상담 방식</legend>
          <div className="counsel-template-segments">
            {COUNSEL_CHANNELS.map(channel => <label key={channel} className={value.channel === channel ? 'is-selected' : ''}>
              <input type="radio" name={`${id}-channel`} checked={value.channel === channel} onChange={() => patch({ channel })} />
              {channel}
            </label>)}
          </div>
        </fieldset>
        <label className="admin-field">
          <span>상담 일시</span>
          <input type="datetime-local" value={value.conductedAt} onChange={e => patch({ conductedAt: e.target.value })} />
          <small className="admin-field-hint">한국 시간 기준</small>
        </label>
      </div>
      {care7 && <section className="counsel-template-card">
        <div className="counsel-template-heading"><h3>상담유형</h3><span>CARE 7+ 분류</span></div>
        <div className="counsel-template-type">
          <div><span className="counsel-template-caption">최근 진단 결과</span><strong>{diagnosisType ? `${diagnosisType} · ${typeLabel(diagnosisType)}` : '진단 결과 없음'}</strong></div>
          <label className="admin-field"><span>상담 후 최종 유형 {required && <em className="admin-req-mark">*</em>}</span>
            <select disabled={typeLocked} value={value.finalType ?? ''} onChange={e => patch({ finalType: (e.target.value || null) as StudentType | null })}>
              <option value="">{typeLocked ? '기존 일지에 저장된 유형 없음' : '최종 유형 선택'}</option>
              {Object.values(STUDENT_TYPE_MAP).map(type => <option key={type.code} value={type.code}>{type.code} · {type.label}</option>)}
            </select>
          </label>
        </div>
        <p className="admin-field-hint">{typeLocked ? '완료된 상담의 유형입니다. 재진단 후 새 CARE 7+ 상담에서 다시 확정할 수 있습니다.' : '진단 결과를 참고해 선택해 주세요. 상담으로 확정한 유형이 최종 유형으로 적용됩니다.'}</p>
        {value.finalType && value.finalType !== diagnosisType && <p className="admin-field-hint">유형이 변경되면 {typeLabel(value.finalType)}의 후속진단도 완료해야 취업지원을 이용할 수 있습니다.</p>}
      </section>}
      {care7 && <section className="counsel-template-card">
        <div className="counsel-template-heading"><h3>정성진단 <em className="admin-req-mark">*</em></h3><span>5개 항목 모두 필수 · 상·중·하 선택</span></div>
        <div className="counsel-template-ratings">
          {QUALITATIVE_ITEMS.map(([key, label]) => <fieldset key={key} className="counsel-template-rating">
            <legend>{label}</legend>
            <div className="counsel-template-segments">
              {(['상', '중', '하'] as const).map(rating => <label key={rating} className={value.qualitative[key] === rating ? 'is-selected' : ''}>
                <input type="radio" name={`${id}-${key}`} checked={value.qualitative[key] === rating}
                  onChange={() => patch({ qualitative: { ...value.qualitative, [key]: rating } })} />{rating}
              </label>)}
            </div>
          </fieldset>)}
        </div>
      </section>}
      <section className="counsel-template-card">
        <div className="counsel-template-heading"><h3>상담내용</h3><span>하나 또는 두 항목 모두 선택</span></div>
        <div className="counsel-template-checks">
          {([['program', '프로그램 현황 체크'], ['application', '입사지원 현황 체크']] as const).map(([key, label]) => <label key={key}>
            <input type="checkbox" checked={value[key].selected} onChange={e => patch({ [key]: { ...value[key], selected: e.target.checked } })} />{label}
          </label>)}
        </div>
        <div className="counsel-template-content">
          {value.program.selected && <label className="admin-field"><span>프로그램 현황 체크</span>
            <textarea rows={6} maxLength={9000} value={value.program.content} onChange={e => patch({ program: { ...value.program, content: e.target.value } })}
              placeholder="참여 프로그램, 참여 후기(만족도·성취계획 등), 이수 여부를 기록해 주세요." />
          </label>}
          {value.application.selected && <label className="admin-field"><span>입사지원 현황 체크</span>
            <textarea rows={6} maxLength={9000} value={value.application.content} onChange={e => patch({ application: { ...value.application, content: e.target.value } })}
              placeholder="지원 기업·직무, 현재 진행 상황(서류·인적성·1차/2차 면접·최종 등)을 기록해 주세요." />
          </label>}
        </div>
        {!value.program.selected && !value.application.selected && <p className="counsel-template-empty">위 항목을 선택하면 상담내용 입력란이 열립니다.</p>}
      </section>
      <div className="counsel-template-notes">
        <section className="counsel-template-card counsel-template-ai">
          <div className="counsel-template-heading"><h3><LuSparkles /> 상담일지 작성 AI</h3><span><LuLockKeyhole /> 학생 비공개</span></div>
          <p className="admin-field-hint">상담유형·정성진단·상담내용을 바탕으로 일지를 작성합니다.</p>
          <textarea aria-label="AI 상담일지" rows={6} readOnly value={value.aiJournal} placeholder="AI 연결 후 생성된 상담일지가 여기에 표시됩니다." />
          <div className="counsel-template-ai-footer"><span>AI 연결 준비 중</span><button type="button" className="admin-btn admin-btn-ghost sm" disabled>생성</button></div>
        </section>
        <section className="counsel-template-card counsel-template-public">
          <div className="counsel-template-heading"><h3><LuMessageSquareMore /> 학생 공개 코멘트 <em className="admin-req-mark">*</em></h3><span>학생에게 공개</span></div>
          <label className="admin-field"><span className="counsel-template-sr">학생 공개 코멘트</span>
            <textarea rows={6} maxLength={20000} value={comment} onChange={e => onCommentChange(e.target.value)} placeholder="학생에게 전하고 싶은 격려, 상담 요약, 다음 실천 과제를 작성해 주세요." />
          </label>
          <p className="admin-field-hint">이 코멘트는 학생의 상담 현황에 표시됩니다.</p>
        </section>
      </div>
    </fieldset>
  )
}
