import { typeLabel } from '../../src_v2/data/careerProcess'
import { QUALITATIVE_ITEMS, type CounselTemplate } from '../data/schema/counselTemplate'

/** Read-only assessment reused by preview, journal detail and printing. */
export default function CounselTemplateSummary({ template }: { template?: CounselTemplate | null }) {
  if (!template) return null
  return <div className="counsel-template-summary">
    {template.legacySummary && <details><summary>기존 양식의 상담내용</summary><p style={{ whiteSpace: 'pre-wrap' }}>{template.legacySummary}</p></details>}
    <dl>
      <div><dt>상담 방식</dt><dd>{template.channel || '미입력'}</dd></div>
      <div><dt>상담 일시</dt><dd>{template.conductedAt.replace('T', ' ') || '미입력'}</dd></div>
      {template.finalType && <div><dt>상담 확정 유형</dt><dd>{template.finalType} · {typeLabel(template.finalType)}</dd></div>}
      {QUALITATIVE_ITEMS.map(([key, label]) => template.qualitative[key] && <div key={key}><dt>{label}</dt><dd>{template.qualitative[key]}</dd></div>)}
    </dl>
    {template.aiJournal && <section><h3>AI 상담일지 · 학생 비공개</h3><p>{template.aiJournal}</p></section>}
  </div>
}
