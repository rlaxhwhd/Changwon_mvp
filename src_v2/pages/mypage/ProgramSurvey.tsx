import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { usePageHead } from '../../components/PageCrumb'
import { PROGRAM_EVENT } from '../../../shared/programStore'
import { useAsyncAction } from '../../../shared/useAsyncAction'
import {
  SURVEY_PHASE_LABEL, SURVEY_SCALE, loadSurveyForm, submitSurvey,
  type SurveyForm, type SurveyPhase,
} from '../../../shared/surveyStore'
import '../../../shared/components/CounselHistory.css'
import './ProgramSurvey.css'

// 비교과 조사 응답 페이지 — 사전·사후 역량 진단, 만족도 조사가 같은 화면을 쓴다.
// 문항·열림 여부는 서버(코드관리 + survey_window)가 주고, 여기서는 라디오를 그리고 제출만 한다.
const PHASES: SurveyPhase[] = ['PRE', 'POST', 'SATISFACTION']

export default function ProgramSurvey() {
  const { id = '', phase = '' } = useParams<{ id: string; phase: string }>()
  const valid = PHASES.includes(phase as SurveyPhase)
  const surveyPhase = (valid ? phase : 'PRE') as SurveyPhase
  const navigate = useNavigate()
  const [form, setForm] = useState<SurveyForm | null>(null)
  const [loadError, setLoadError] = useState('')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const action = useAsyncAction()
  usePageHead(form ? `${form.programTitle} · ${SURVEY_PHASE_LABEL[surveyPhase]}` : SURVEY_PHASE_LABEL[surveyPhase],
              '각 문항에 해당하는 정도를 선택한 뒤 제출합니다. 제출 후에는 수정할 수 없습니다.')

  useEffect(() => {
    if (!valid) return
    let alive = true
    setForm(null); setLoadError('')
    loadSurveyForm(id, surveyPhase)
      .then(next => {
        if (!alive) return
        setForm(next)
        setAnswers(Object.fromEntries(next.areas.flatMap(a => a.items).filter(i => i.value != null).map(i => [i.code, i.value as number])))
      })
      .catch(e => { if (alive) setLoadError(e instanceof Error ? e.message : '조사를 불러오지 못했습니다.') })
    return () => { alive = false }
  }, [id, surveyPhase, valid])

  if (!valid) return <div className="cs-page ps-page"><div className="cs-empty"><Icon name="x" /><strong>없는 조사 종류입니다.</strong><Link className="cs-button" to="/mypage/programs">프로그램 현황으로</Link></div></div>

  const items = form?.areas.flatMap(a => a.items) ?? []
  const remaining = items.filter(i => answers[i.code] == null).length
  const submit = () => action.run(async () => {
    await submitSurvey(id, surveyPhase, answers)
    window.dispatchEvent(new Event(PROGRAM_EVENT))
    navigate('/mypage/programs', { replace: true })
  })

  return (
    <div className="cs-page ps-page">
      {loadError && <div className="cs-load-state" role="alert"><p>{loadError}</p></div>}
      {!form && !loadError && <p className="cs-load-state" role="status">조사 문항을 불러오는 중입니다.</p>}
      {form && (
        <>
          <section className="cs-panel ps-head">
            <span className={`cs-status cs-status--${form.submittedAt ? 'done' : form.open ? 'scheduled' : 'cancel'}`}>
              {form.submittedAt ? '제출 완료' : form.open ? '응답 가능' : '응답 불가'}
            </span>
            <h2>{form.programTitle}</h2>
            <p>{SURVEY_PHASE_LABEL[surveyPhase]} · {items.length}문항 · 5점 척도</p>
            {!form.open && <p className="ps-reason">{form.reason}</p>}
          </section>

          {form.areas.map((area, ai) => (
            <section className="cs-panel ps-area" key={area.key} aria-labelledby={`ps-area-${ai}`}>
              <h3 id={`ps-area-${ai}`}><span>{ai + 1}</span>{area.label}</h3>
              <div className="ps-scale-head" aria-hidden="true">
                <span />{SURVEY_SCALE.map(s => <small key={s.value}>{s.label}<br />({s.value}점)</small>)}
              </div>
              {area.items.map((item, ii) => (
                <fieldset className="ps-item" key={item.code} disabled={!form.open}>
                  <legend><b>{ii + 1}</b>{item.prompt}</legend>
                  <div className="ps-choices">
                    {SURVEY_SCALE.map(s => (
                      <label key={s.value} className={answers[item.code] === s.value ? 'is-on' : ''}>
                        <input type="radio" name={item.code} value={s.value} checked={answers[item.code] === s.value}
                               onChange={() => setAnswers(prev => ({ ...prev, [item.code]: s.value }))} />
                        <span className="ps-choice-label">{s.label} ({s.value}점)</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </section>
          ))}

          <section className="cs-panel ps-submit">
            {action.error && <p role="alert" className="ps-error">{action.error}</p>}
            {form.open ? (
              <>
                <p>{remaining > 0 ? `아직 응답하지 않은 문항이 ${remaining}개 있습니다.` : '모든 문항에 응답했습니다. 제출하면 수정할 수 없습니다.'}</p>
                <div className="ps-actions">
                  <Link className="cs-button" to="/mypage/programs">나중에 하기</Link>
                  <button type="button" className="cs-button is-primary" disabled={remaining > 0 || action.saving} onClick={submit}>
                    {action.saving ? '제출 중…' : '제출하기'}
                  </button>
                </div>
              </>
            ) : (
              <div className="ps-actions"><Link className="cs-button" to="/mypage/programs">프로그램 현황으로</Link></div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
