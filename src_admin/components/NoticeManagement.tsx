import { useState } from 'react'
import { api } from '../../shared/api'
import { loadNotices } from '../../shared/communicationsStore'
import { NOTICE_CATEGORIES, NOTICE_CATEGORY_LABEL, type Notice } from '../../src_v2/data/notices'

type Row = Notice & { version: number }
export default function NoticeManagement({ rows, saved }: { rows: Row[]; saved: () => void }) {
  const [editing, setEditing] = useState<Row | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const edit = (row: Row) => { setEditing(row); setText(row.body.join('\n\n')); setError('') }
  const run = async (action: () => Promise<unknown>) => {
    if (saving) return
    setSaving(true); setError('')
    try { await action(); await loadNotices(); setEditing(null); saved() }
    catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }
  return <>
    {error && <p role="alert">{error}</p>}
    <button className="btn btn-primary" onClick={() => edit({ id: crypto.randomUUID(), category: 'SYSTEM', title: '', summary: '', postedAt: new Date().toLocaleDateString('en-CA'), pinned: false, body: [], version: 0 })}>공지 작성</button>
    <table className="data-table"><thead><tr><th>게시일</th><th>분류</th><th>제목</th><th>관리</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}><td>{row.postedAt}</td><td>{NOTICE_CATEGORY_LABEL[row.category]}</td><td>{row.title}</td><td>
        <button className="btn btn-secondary" disabled={saving} onClick={() => edit(row)}>수정</button>{' '}
        <button className="btn btn-secondary" disabled={saving} onClick={() => { void run(() => api(`/notices/${encodeURIComponent(row.id)}?expectedVersion=${row.version}`, { method: 'DELETE' })) }}>게시 중단</button>
      </td></tr>)}
    </tbody></table>
    {editing && <form onSubmit={event => {
      event.preventDefault()
      const { id, version, ...body } = editing
      void run(() => api(`/notices/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ ...body, body: text.split(/\n\s*\n/).filter(p => p.trim()), expectedVersion: version }) }))
    }}><fieldset disabled={saving}><legend>{editing.version ? '공지 수정' : '새 공지'}</legend>
      <label>분류 <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as Notice['category'] })}>{NOTICE_CATEGORIES.map(c => <option key={c} value={c}>{NOTICE_CATEGORY_LABEL[c]}</option>)}</select></label>
      <label>제목 <input required maxLength={200} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></label>
      <label>요약 <textarea value={editing.summary} onChange={e => setEditing({ ...editing, summary: e.target.value })} /></label>
      <label>본문 <textarea required rows={8} value={text} onChange={e => setText(e.target.value)} /></label>
      <label>게시일 <input required type="date" value={editing.postedAt} onChange={e => setEditing({ ...editing, postedAt: e.target.value })} /></label>
      <label><input type="checkbox" checked={!!editing.pinned} onChange={e => setEditing({ ...editing, pinned: e.target.checked })} /> 상단 고정</label>
      <button className="btn btn-primary" type="submit">저장</button>{' '}<button className="btn btn-secondary" type="button" onClick={() => setEditing(null)}>닫기</button>
    </fieldset></form>}
  </>
}
