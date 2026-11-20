import { useLayoutEffect, useRef, useState } from 'react'
import JobGuide from '../../src_v2/components/JobGuide'
import type { JobGuideSource } from '../../src_v2/components/JobGuide'
import { JOB_GUIDE_TEMPLATE_LABEL, blankGuideFields } from '../data/schema/job'
import type { JobGuideFields, JobGuideTemplate } from '../data/schema/job'
import './JobGuideEditor.css'

// ─────────────────────────────────────────────────────────────────────────
// 채용공고 등록 폼의 「모집요강 템플릿」 입력 — 상담사는 칸만 채우고, 그림은 JobGuide 가 그린다.
// 회사명·제목·연봉·근무지·근무형태·마감은 폼 위쪽 값이 그대로 들어가므로 여기서 다시 받지 않는다.
// 길이 상한은 서버 GuideFields 와 같다(서버가 정본 — 넘으면 422).
// ─────────────────────────────────────────────────────────────────────────

const TEMPLATES: JobGuideTemplate[] = ['POSTER', 'HIGHLIGHT', 'DOCUMENT']
const TEMPLATE_HINT: Record<JobGuideTemplate, string> = {
  POSTER: '큰 헤드라인 + 4칸 요약. 눈길을 끌어야 하는 공고',
  HIGHLIGHT: '연봉·채용형태·마감을 큰 숫자로. 처우가 강점인 공고',
  DOCUMENT: '의뢰서 항목을 표로. 항목이 많은 추천채용',
}
const DOC_PRESETS = ['이력서', '자기소개서', '성적증명서', '졸업(예정)증명서', '자격증 사본', '포트폴리오']
const STEP_PRESETS = ['서류전형', '인적성검사', '필기시험', '면접전형(1차)', '면접전형(2차)', '합격자 발표']

type TextKey = Exclude<keyof JobGuideFields, 'documents' | 'steps'>
interface FieldSpec { key: TextKey; label: string; max: number; placeholder: string; multiline?: boolean }

const BASIC: FieldSpec[] = [
  { key: 'headline', label: '한 줄 소개', max: 80, placeholder: '예: 함께 성장할 철강판매관리 인재를 찾습니다' },
  { key: 'emphasis', label: '강조 단어', max: 20, placeholder: '한 줄 소개 안의 단어. 예: 성장' },
  { key: 'duty', label: '담당업무', max: 300, placeholder: '예: 영업본부 철강판매관리', multiline: true },
  { key: 'workHours', label: '근무시간', max: 100, placeholder: '예: 월~금 08:00~17:00' },
  { key: 'employmentNote', label: '채용형태 보충', max: 100, placeholder: '예: 수습 3개월' },
  { key: 'salaryNote', label: '급여 비고', max: 100, placeholder: '예: 평가에 따라 다를 수 있음' },
  { key: 'qualification', label: '자격요건', max: 500, placeholder: '줄바꿈하면 항목이 나뉩니다', multiline: true },
  { key: 'preferred', label: '우대사항', max: 500, placeholder: '줄바꿈하면 항목이 나뉩니다', multiline: true },
]
const COMPANY: FieldSpec[] = [
  { key: 'industry', label: '업종', max: 100, placeholder: '예: 제조업(냉연강판)' },
  { key: 'revenue', label: '매출액', max: 50, placeholder: '예: 3,600억원' },
  { key: 'headcount', label: '근로자 수', max: 50, placeholder: '예: 110명' },
  { key: 'address', label: '근무지 상세', max: 200, placeholder: '비우면 지역 값을 씁니다' },
]
const APPLY: FieldSpec[] = [
  { key: 'applyMethod', label: '신청방법', max: 500, placeholder: '예: 서류를 첨부해 드림캐치에서 지원', multiline: true },
  { key: 'contact', label: '문의처', max: 200, placeholder: '예: 취업전략센터 055-000-0000' },
  { key: 'note', label: '하단 안내', max: 200, placeholder: '예: 자기소개서 컨설팅은 쪽지로 신청' },
]

interface Props {
  template: JobGuideTemplate | null
  fields: JobGuideFields | null
  source: JobGuideSource
  onChange: (template: JobGuideTemplate | null, fields: JobGuideFields | null) => void
}

export default function JobGuideEditor({ template, fields, onChange }: Omit<Props, 'source'>) {
  const f = fields ?? blankGuideFields()
  const [customDoc, setCustomDoc] = useState('')
  const [customStep, setCustomStep] = useState('')
  const put = (next: Partial<JobGuideFields>) => onChange(template, { ...f, ...next })

  // 템플릿을 바꿔도 입력값은 그대로 — 끌 때만 비운다(서버도 끄면 값을 저장하지 않는다).
  const pick = (next: JobGuideTemplate | null) => onChange(next, next ? f : null)

  const hasDoc = (name: string) => f.documents.some(d => d.name === name)
  const toggleDoc = (name: string) => put({
    documents: hasDoc(name) ? f.documents.filter(d => d.name !== name) : [...f.documents, { name, note: '', optional: false }],
  })
  const addCustomDoc = () => {
    const name = customDoc.trim()
    if (!name || hasDoc(name) || f.documents.length >= 12) return
    put({ documents: [...f.documents, { name, note: '', optional: false }] })
    setCustomDoc('')
  }
  const addStep = (step: string) => {
    const name = step.trim()
    if (!name || f.steps.length >= 6) return
    put({ steps: [...f.steps, name] })
  }

  const field = (spec: FieldSpec) => (
    <label key={spec.key} className={`jge-field${spec.multiline ? ' is-wide' : ''}`}>
      <span>{spec.label}</span>
      {spec.multiline
        ? <textarea className="jf-input jge-textarea" rows={3} maxLength={spec.max} placeholder={spec.placeholder}
            value={f[spec.key]} onChange={e => put({ [spec.key]: e.target.value })} />
        : <input className="jf-input" maxLength={spec.max} placeholder={spec.placeholder}
            value={f[spec.key]} onChange={e => put({ [spec.key]: e.target.value })} />}
    </label>
  )

  return (
    <div className="jge">
      <div className="jge-picker" role="radiogroup" aria-label="모집요강 템플릿">
        <button type="button" role="radio" aria-checked={template === null}
          className={`jge-pick${template === null ? ' is-on' : ''}`} onClick={() => pick(null)}>
          <b>사용 안 함</b><small>아래 편집기에 직접 작성</small>
        </button>
        {TEMPLATES.map(t => (
          <button key={t} type="button" role="radio" aria-checked={template === t}
            className={`jge-pick is-${t.toLowerCase()}${template === t ? ' is-on' : ''}`} onClick={() => pick(t)}>
            <i aria-hidden="true" />
            <b>{JOB_GUIDE_TEMPLATE_LABEL[t]}</b><small>{TEMPLATE_HINT[t]}</small>
          </button>
        ))}
      </div>

      {template && (
        <>
          <p className="jge-auto">
            회사명 · 공고제목 · 연봉 · 근무지 · 근무형태 · 지원마감일은 위에서 입력한 값이 자동으로 들어갑니다. 비워 둔 칸은 공고에 나오지 않습니다.
          </p>

          <fieldset className="jge-group">
            <legend>채용 내용</legend>
            <div className="jge-grid">{BASIC.map(field)}</div>
          </fieldset>

          <fieldset className="jge-group">
            <legend>기업 정보</legend>
            <div className="jge-grid">{COMPANY.map(field)}</div>
          </fieldset>

          <fieldset className="jge-group">
            <legend>제출서류</legend>
            <div className="jge-chips">
              {DOC_PRESETS.map(name => (
                <button key={name} type="button" aria-pressed={hasDoc(name)}
                  className={`jge-chip${hasDoc(name) ? ' is-on' : ''}`} onClick={() => toggleDoc(name)}>{name}</button>
              ))}
              <span className="jge-add">
                <input className="jf-input" maxLength={60} placeholder="직접 추가" value={customDoc}
                  onChange={e => setCustomDoc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomDoc() } }} />
                <button type="button" className="jf-btn jf-btn-outline" onClick={addCustomDoc}>추가</button>
              </span>
            </div>
            {f.documents.length > 0 && (
              <ul className="jge-docs">
                {f.documents.map((d, i) => (
                  <li key={d.name}>
                    <b>{d.name}</b>
                    <input className="jf-input" maxLength={40} placeholder="비고 (예: 자유양식)" value={d.note}
                      onChange={e => put({ documents: f.documents.map((x, j) => j === i ? { ...x, note: e.target.value } : x) })} />
                    <label className="jf-check">
                      <input type="checkbox" checked={d.optional}
                        onChange={e => put({ documents: f.documents.map((x, j) => j === i ? { ...x, optional: e.target.checked } : x) })} />
                      해당자만
                    </label>
                    <button type="button" className="jge-x" aria-label={`${d.name} 빼기`}
                      onClick={() => put({ documents: f.documents.filter((_, j) => j !== i) })}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <fieldset className="jge-group">
            <legend>전형절차 <small>최대 6단계 · 누른 순서대로</small></legend>
            <div className="jge-chips">
              {STEP_PRESETS.map(step => (
                <button key={step} type="button" className="jge-chip" disabled={f.steps.length >= 6}
                  onClick={() => addStep(step)}>+ {step}</button>
              ))}
              <span className="jge-add">
                <input className="jf-input" maxLength={40} placeholder="직접 추가" value={customStep}
                  onChange={e => setCustomStep(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep(customStep); setCustomStep('') } }} />
                <button type="button" className="jf-btn jf-btn-outline"
                  onClick={() => { addStep(customStep); setCustomStep('') }}>추가</button>
              </span>
            </div>
            {f.steps.length > 0 && (
              <ol className="jge-steps">
                {f.steps.map((step, i) => (
                  <li key={`${i}-${step}`}>
                    <span>{i + 1}</span>{step}
                    <button type="button" className="jge-x" aria-label={`${step} 빼기`}
                      onClick={() => put({ steps: f.steps.filter((_, j) => j !== i) })}>×</button>
                  </li>
                ))}
              </ol>
            )}
          </fieldset>

          <fieldset className="jge-group">
            <legend>신청·문의</legend>
            <div className="jge-grid">{APPLY.map(field)}</div>
          </fieldset>

        </>
      )}
    </div>
  )
}

// 미리보기 화면 폭 — PC 는 학생 상세 본문 칸 근처, 모바일은 흔한 폰 폭.
// 템플릿은 컨테이너 폭으로 배치를 바꾸므로(@container 600px) 이 폭으로 그린 뒤 칸에 맞게 줄여 보여 준다.
const VIEW_WIDTH = { pc: 760, mobile: 375 } as const
type PreviewView = keyof typeof VIEW_WIDTH

/** 등록 폼 오른쪽에 붙는 미리보기 — 스크롤을 따라온다(ProgramForm 썸네일 미리보기와 같은 자리). */
export function JobGuidePreview({ template, fields, source }: Omit<Props, 'onChange'>) {
  const [view, setView] = useState<PreviewView>('pc')
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, height: 0 })

  // 줄인 배율과 줄어든 높이를 잰다 — transform 은 자리를 차지하지 않으므로 바깥 높이를 직접 맞춘다.
  useLayoutEffect(() => {
    const stage = stageRef.current
    const frame = frameRef.current
    if (!stage || !frame) return
    const measure = () => {
      const scale = Math.min(1, stage.clientWidth / VIEW_WIDTH[view])
      setFit({ scale, height: frame.offsetHeight * scale })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [view, template])

  return (
    <>
      <section className="jge-preview" aria-label="모집요강 미리보기">
        <h3>모집요강 미리보기 <small>{view === 'pc' ? 'PC' : '모바일'} 학생 화면에 이렇게 보입니다</small></h3>
        {template
          ? (
            <div ref={stageRef} className="jge-stage" style={{ height: fit.height || undefined }}>
              <div ref={frameRef} className={`jge-frame is-${view}`}
                style={{ width: VIEW_WIDTH[view], transform: `scale(${fit.scale})` }}>
                <JobGuide template={template} fields={fields ?? blankGuideFields()} source={source} />
              </div>
            </div>
          )
          : <p className="jge-preview-empty">왼쪽 「모집요강 템플릿」에서 템플릿을 고르면 입력한 값으로 공고가 그려집니다.</p>}
      </section>
      {template && (
        <div className="jge-views" role="group" aria-label="미리보기 화면 크기">
          {(['pc', 'mobile'] as const).map(v => (
            <button key={v} type="button" aria-pressed={view === v}
              className={`jge-view${view === v ? ' is-on' : ''}`} onClick={() => setView(v)}>
              {v === 'pc' ? 'PC 화면' : '모바일 화면'}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
