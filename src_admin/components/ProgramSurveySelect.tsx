import { lazy, Suspense, useRef, useState } from 'react'
import { codeItems, publishedSurveyForms } from '../../shared/metadataStore'
import type { SurveyArea } from '../../shared/surveyStore'
const SurveyPreview = lazy(() => import('./SurveyPreview'))

export default function ProgramSurveySelect({ kind, value, onChange, selectedAreas, disabled = false }: {
  kind: 'COMPETENCY' | 'SATISFACTION'; value: number | null
  onChange: (id: number | null) => void; selectedAreas?: string[]; disabled?: boolean
}) {
  const [preview, setPreview] = useState(false)
  const previewButton = useRef<HTMLButtonElement>(null)
  const label = kind === 'COMPETENCY' ? '역량향상률 설문' : '프로그램 만족도 설문'
  const forms = publishedSurveyForms.filter(f => f.kind === kind).sort((a, b) => b.version - a.version)
  const chosen = forms.find(f => f.id === value)
  const areas: SurveyArea[] = (chosen?.areas ?? []).filter(a => !selectedAreas || selectedAreas.includes(a.key)).map(area => ({
    key: area.key, label: codeItems.find(i => i.group_code === 'SURVEY_AREA' && i.code === area.key)?.label ?? area.key,
    items: area.items.map(code => {
      const item = codeItems.find(i => i.group_code === 'SURVEY_ITEM' && i.code === code)
      return { code, prompt: item?.label ?? code, kind: item?.payload.kind === 'TEXT' ? 'TEXT' : 'SCALE', value: null }
    }),
  }))
  return <>
    <div className="pf-survey-select-row">
      <select className="pf-select" aria-label={`${label} 버전`} value={value ?? ''} disabled={disabled}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">설문없음</option>
        {forms.map(form => <option key={form.id} value={form.id}>{label} v{form.version} ({form.areas.reduce((n, a) => n + a.items.length, 0)}문항){form.isCurrent ? ' · 최신' : ''}</option>)}
      </select>
      <button ref={previewButton} type="button" className="pf-btn-outline" disabled={!chosen} onClick={() => setPreview(true)}>설문조사 미리보기</button>
    </div>
    {preview && chosen && <Suspense fallback={<p role="status">미리보기를 불러오는 중입니다.</p>}>
      <SurveyPreview title={`${label} v${chosen.version}`} areas={areas} onClose={() => {
        setPreview(false)
        window.requestAnimationFrame(() => previewButton.current?.focus())
      }} />
    </Suspense>}
  </>
}
