import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageHead } from '../../components/PageCrumb'
import { getActiveStudent } from '../../data/students'
import { loadC5Form, submitC5, type C5Form, type C5Result } from '../../data/c5Screening'
import { api } from '../../../shared/api'
import { loadStudentDiagnoses } from '../../../shared/diagnosisStore'
import { useAsyncAction } from '../../../shared/useAsyncAction'
import SurveyQuestions from '../../../shared/components/SurveyQuestions'
import '../../../shared/components/CounselHistory.css'
import '../growth/ProgramSurvey.css'
import './C5Screening.css'

// C-5 취약요인 진단 — 비교과 조사 응답 화면(ProgramSurvey)과 같은 설문지 형식으로 응시한다.
// 판정(두 합계 평균 10 이상 → 심리상담센터 연계)은 서버가 한다.
export default function C5Screening() {
  usePageHead('C-5 취약요인 진단검사', '각 문항을 읽고 지난 2주 동안의 상태에 해당하는 곳을 선택한 뒤 제출합니다. 제출 후에는 수정할 수 없습니다.')
  const [form, setForm] = useState<C5Form | null>(null)
  const [loadError, setLoadError] = useState('')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState('')
  const action = useAsyncAction()

  useEffect(() => {
    const controller = new AbortController()
    loadC5Form(controller.signal).then(setForm)
      .catch(e => { if (!controller.signal.aborted) setLoadError(e instanceof Error ? e.message : '진단 문항을 불러오지 못했습니다.') })
    return () => { controller.abort() }
  }, [])

  const items = form?.scales.flatMap(s => s.items) ?? []
  const remaining = items.filter(i => answers[i.code] == null).length
  const submit = () => action.run(async () => {
    const { result } = await submitC5(answers)
    setForm(current => current && { ...current, open: false, result })
    await loadStudentDiagnoses(getActiveStudent().id)
    window.scrollTo({ top: 0 })
  })
  const requestCore = () => action.run(async () => {
    await api('/diagnosis/retake-request', { method: 'POST', body: JSON.stringify({ testId: 'ccore' }) })
    await loadStudentDiagnoses(getActiveStudent().id)
    setForm(current => current && { ...current, coreRequest: current.coreRequest ?? 'PENDING' })
    setNotice('C-CORE 재검사 요청이 접수되었습니다. 상담사가 확인 후 승인합니다.')
  })

  const showResult = form && !form.open && form.result
  return (
    <div className="cs-page ps-page">
      {loadError && <div className="cs-load-state" role="alert"><p>{loadError}</p></div>}
      {!form && !loadError && <p className="cs-load-state" role="status">진단 문항을 불러오는 중입니다.</p>}
      {form && <>
        <section className="cs-panel ps-head">
          <span className={`cs-status cs-status--${form.result && !form.open ? 'done' : form.open ? 'scheduled' : 'cancel'}`}>
            {form.result && !form.open ? '응시 완료' : form.open ? '응시 가능' : '응시 불가'}
          </span>
          <h2>C-5 취약요인 진단검사</h2>
          <p>{form.scales.map(s => `${s.label} ${s.items.length}문항`).join(' · ')} · 4단계 응답</p>
          {!form.open && !form.result && <p className="ps-reason">C-CORE 결과가 취약관리형인 학생의 후속진단입니다. 응시 권한이 없거나 이미 응시했습니다.</p>}
        </section>

        {showResult ? <C5ResultView result={form.result!} coreRequest={form.coreRequest} busy={action.saving} onRequest={requestCore} />
          : form.open && <section className="ps-document">
            {form.scales.map(scale => <div className="c5-scale" key={scale.code}>
              <h3 className="survey-document-title">[{scale.label}] {scale.instruction}</h3>
              <SurveyQuestions areas={[{ key: scale.code, label: scale.label, options: scale.options,
                items: scale.items.map(i => ({ ...i, kind: 'SCALE' as const, value: null })) }]}
                answers={answers} disabled={action.saving}
                onChange={(code, value) => setAnswers(prev => ({ ...prev, [code]: Number(value) }))} />
            </div>)}
          </section>}

        <section className="cs-panel ps-submit">
          {action.error && <p role="alert" className="ps-error">{action.error}</p>}
          {notice && <p role="status">{notice}</p>}
          {form.open ? <>
            <p>{remaining > 0 ? `아직 응답하지 않은 문항이 ${remaining}개 있습니다.` : '모든 문항에 응답했습니다. 제출하면 수정할 수 없습니다.'}</p>
            <div className="ps-actions">
              <Link className="cs-button" to="/diagnosis/employment">나중에 하기</Link>
              <button type="button" className="cs-button is-primary" disabled={remaining > 0 || action.saving} onClick={submit}>
                {action.saving ? '제출 중…' : '제출하기'}
              </button>
            </div>
          </> : <div className="ps-actions"><Link className="cs-button" to="/diagnosis/employment">진단검사 목록으로</Link></div>}
        </section>
      </>}
    </div>
  )
}

function C5ResultView({ result, coreRequest, busy, onRequest }: {
  result: C5Result; coreRequest: C5Form['coreRequest']; busy: boolean; onRequest: () => void
}) {
  return <section className="ps-document">
    <h3 className="survey-document-title">진단 결과 · {result.completedAt.slice(0, 10)}</h3>
    <table className="c5-score">
      <thead><tr><th>검사</th><th>합계</th><th>만점</th></tr></thead>
      <tbody>
        <tr><td>PHQ-9</td><td>{result.phq9}점</td><td>27점</td></tr>
        <tr><td>GAD-7</td><td>{result.gad7}점</td><td>21점</td></tr>
        <tr className="c5-score-average"><td>평균</td><td>{result.average}점</td><td>기준 10점</td></tr>
      </tbody>
    </table>
    {result.referred
      ? <div className="c5-guide" role="status">
        <strong>심리상담센터로 연계되었습니다.</strong>
        <p>지금 겪고 있는 어려움을 전문 상담으로 함께 살펴보면 좋겠습니다. 심리상담사가 결과를 확인한 뒤 연락드릴 예정입니다.</p>
      </div>
      : <div className="c5-guide" role="status">
        <strong>C-CORE 재진단을 권유합니다.</strong>
        <p>정서 상태는 연계 기준보다 안정적입니다. 지금의 진로 준비 상태를 다시 확인할 수 있도록 C-CORE 핵심진단을 다시 받아 보세요. 재검사를 요청하면 상담사가 확인 후 승인합니다.</p>
        <button type="button" className="cs-button is-primary" disabled={busy || !!coreRequest} onClick={onRequest}>
          {coreRequest === 'PENDING' ? 'C-CORE 재검사 승인 대기' : coreRequest === 'APPROVED' ? 'C-CORE 재검사 응시 가능' : busy ? '요청 중…' : 'C-CORE 재검사 요청'}
        </button>
      </div>}
  </section>
}
