import { useId } from 'react'
import { SURVEY_SCALE, type SurveyArea } from '../surveyStore'
import './SurveyQuestions.css'

export default function SurveyQuestions({ areas, answers, onChange, disabled = false }: {
  areas: SurveyArea[]
  answers: Record<string, number | string>
  onChange: (code: string, value: number | string) => void
  disabled?: boolean
}) {
  const prefix = useId()
  return <div className="survey-questions">{areas.flatMap(area => area.items.map(item => (
    <fieldset className="survey-question" key={item.code} disabled={disabled}>
      <legend><span className="survey-q" aria-hidden="true">Q</span><span>[{area.label}] {item.prompt}
        {item.kind === 'SCALE' ? <span className="survey-required" aria-label="필수"> *</span> : <span className="survey-optional"> (선택)</span>}
      </span></legend>
      {item.kind === 'TEXT' ? <textarea aria-label={item.prompt} rows={3} maxLength={2000}
        value={String(answers[item.code] ?? '')} placeholder="자유롭게 입력해 주세요."
        onChange={e => onChange(item.code, e.target.value)} />
        : <div className="survey-options">{SURVEY_SCALE.map(option => (
          <label key={option.value}>
            <input type="radio" name={`${prefix}-${item.code}`} required value={option.value}
              checked={answers[item.code] === option.value} onChange={() => onChange(item.code, option.value)} />
            <span>{option.label} ({option.value}점)</span>
          </label>
        ))}</div>}
    </fieldset>
  )))}</div>
}
