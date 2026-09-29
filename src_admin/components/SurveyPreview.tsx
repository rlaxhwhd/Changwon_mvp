import { useEffect, useRef, useState } from 'react'
import { LuMaximize2, LuMinimize2, LuPrinter, LuX } from 'react-icons/lu'
import SurveyQuestions from '../../shared/components/SurveyQuestions'
import type { SurveyArea } from '../../shared/surveyStore'
import './SurveyPreview.css'

export default function SurveyPreview({ title, areas, onClose }: { title: string; areas: SurveyArea[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [expanded, setExpanded] = useState(false)
  const close = () => { dialog.current?.close(); onClose() }
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} className={`survey-preview${expanded ? ' is-expanded' : ''}`}
    aria-label="설문조사 미리보기" onCancel={event => { event.preventDefault(); close() }}>
    <header className="survey-preview-head"><h2>미리보기</h2><div>
      <button type="button" aria-label={expanded ? '원래 크기' : '크게 보기'} onClick={() => setExpanded(v => !v)}>{expanded ? <LuMinimize2 /> : <LuMaximize2 />}</button>
      <button type="button" aria-label="미리보기 닫기" onClick={close}><LuX /></button>
    </div></header>
    <div className="survey-preview-body">
      <h3 className="survey-document-title">{title}</h3>
      {areas.some(a => a.items.length) ? <SurveyQuestions areas={areas} answers={answers}
        onChange={(code, value) => setAnswers(prev => ({ ...prev, [code]: value }))} />
        : <p className="survey-preview-empty">미리 볼 문항이 없습니다. 조사할 영역을 선택해 주세요.</p>}
    </div>
    <footer className="survey-preview-footer"><span>미리보기 응답은 저장되지 않습니다.</span>
      <button type="button" onClick={() => window.print()}><LuPrinter /> 인쇄</button>
      <button type="button" onClick={close}>닫기</button>
    </footer>
  </dialog>
}
