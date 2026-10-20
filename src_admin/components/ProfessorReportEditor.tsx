import { useState } from 'react'
import { api, downloadApiFile, queryString } from '../../shared/api'
import { studentDisplayName } from '../../shared/studentDisplayName'
import StudentPicker from './StudentPicker'
import StudentDetailModal from './StudentDetailModal'
import type { RosterStudent } from '../data/studentRoster'
import { PROF_COUNSEL_CATEGORIES } from '../data/schema/profCounselRecord'
import type { ProfCounselCategoryCode } from '../data/schema/profCounselRecord'
import { saveProfessorReport } from '../data/professorCounselManage'
import type { CounselAttachment, CounselChannel, ProfessorReport } from '../data/professorCounselManage'
import '../pages/ProfessorCounsel.css'

export default function ProfessorReportEditor({ channel, report, onSaved, onCancel }: {
  channel: CounselChannel; report?: ProfessorReport; onSaved: () => void; onCancel: () => void
}) {
  const [student, setStudent] = useState<RosterStudent | null>(null)
  const [basic, setBasic] = useState({ phone: report?.phone ?? '', email: report?.email ?? '', sex: report?.sex ?? '' })
  const [picking, setPicking] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [categoryCode, setCategoryCode] = useState<ProfCounselCategoryCode>(report?.categoryCode ?? 'MAJOR_STUDY')
  const [date, setDate] = useState(report?.date ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()))
  const [start, setStart] = useState(report?.start ?? '')
  const [end, setEnd] = useState(report?.end ?? '')
  const [title, setTitle] = useState(report?.title ?? '상담보고서')
  const [place, setPlace] = useState(report?.place ?? '')
  const [summary, setSummary] = useState(report?.summary ?? '')
  const [attachments, setAttachments] = useState<CounselAttachment[]>(report?.attachments ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const studentId = report?.studentId ?? student?.id ?? ''
  const studentName = report?.name ?? student?.name ?? ''
  const studentNo = report?.studentNo ?? student?.studentNo ?? ''
  const major = report?.major ?? student?.major ?? ''
  const grade = report?.grade ?? student?.grade
  const status = report?.enrollmentStatus ?? student?.status ?? ''
  const save = async () => {
    if (!studentId || !summary.trim() || !title.trim() || !date) { setError('학생·상담일·제목·상담내용을 입력하세요.'); return }
    if ((!start !== !end) || (start && start >= end)) { setError('상담 시작·종료 시각을 확인하세요.'); return }
    setSaving(true); setError('')
    try {
      await saveProfessorReport({ studentId, categoryCode, method: channel === 'online' ? '비대면' : '대면', date,
        start: start || null, end: end || null, title: title.trim(), place: place.trim(), summary: summary.trim(),
        publicComment: channel === 'online' ? summary.trim() : '', fileIds: attachments.map(f => f.id) }, report)
      onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : '저장하지 못했습니다.') }
    finally { setSaving(false) }
  }
  return <div className="professor-report-editor">
    <h2>인적사항</h2>
    <dl className="professor-personal-grid">
      <dt>신청자</dt><dd>{studentId ? <>{studentDisplayName(studentName, studentId)} <button className="admin-btn admin-btn-primary sm" type="button" onClick={() => setViewing(true)}>학생정보 보기</button></> : '학생을 선택하세요.'}
        {!report && <button type="button" className="admin-btn admin-btn-ghost sm" disabled={saving || uploading} onClick={() => setPicking(true)}>학생 검색</button>}</dd>
      <dt>성별</dt><dd>{basic.sex || '—'}</dd>
      <dt>소속</dt><dd>{major || '—'}</dd><dt>학적상태</dt><dd>{status || '—'}</dd>
      <dt>학번</dt><dd>{studentNo || '—'}</dd><dt>학년</dt><dd>{grade ? `${grade}학년` : '—'}</dd>
      <dt>연락처</dt><dd>{basic.phone || '—'}</dd><dt>이메일</dt><dd>{basic.email || '—'}</dd>
      <dt>상담목적</dt><dd className="professor-personal-wide">{report?.purpose || '미예약 상담'}</dd>
    </dl>
    <h2>상담내용 입력</h2>
    <fieldset disabled={saving || uploading} className="professor-report-fields">
      <div className="admin-form-grid">
        <label className="admin-field"><span>상담구분</span><select value={categoryCode} onChange={e => setCategoryCode(e.target.value as ProfCounselCategoryCode)}>
          {PROF_COUNSEL_CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select></label>
        <div className="professor-report-datetime">
          <label className="admin-field"><span>상담일</span><input required type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="admin-field"><span>시작</span><input type="time" value={start} onChange={e => setStart(e.target.value)} /></label>
          <label className="admin-field"><span>종료</span><input type="time" value={end} onChange={e => setEnd(e.target.value)} /></label>
        </div>
        <label className="admin-field admin-field-full"><span>제목</span><input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="admin-field admin-field-full"><span>장소</span><input maxLength={200} value={place} onChange={e => setPlace(e.target.value)} /></label>
        <label className="admin-field admin-field-full"><span>상담내용</span><textarea required rows={7} maxLength={20000} value={summary} onChange={e => setSummary(e.target.value)} /></label>
        {channel === 'online' && <p className="admin-field-hint">상담내용은 학생에게 답변으로 공개됩니다.</p>}
        <label className="admin-field admin-field-full"><span>첨부파일</span><input type="file" multiple accept=".pdf,.doc,.docx,.hwp,.hwpx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg" onChange={async event => {
          const selected = [...(event.target.files ?? [])]; event.target.value = ''
          if (attachments.length + selected.length > 10) { setError('첨부파일은 최대 10개입니다.'); return }
          setUploading(true); setError('')
          try {
            for (const file of selected) {
              const saved = await api<CounselAttachment>(`/professor-counsel-files?${queryString({ name: file.name })}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file })
              setAttachments(old => [...old, saved])
            }
          } catch (reason) { setError(reason instanceof Error ? reason.message : '첨부파일을 올리지 못했습니다.') }
          finally { setUploading(false) }
        }} /><small className="admin-field-hint">파일당 최대 10MB · 최대 10개</small></label>
      </div>
      <ul className="professor-report-files">{attachments.map(file => <li key={file.id}>
        <button type="button" className="professor-report-link" onClick={async () => {
          try { await downloadApiFile(file.downloadUrl.replace('/api/v1', ''), file.name) }
          catch (reason) { setError(reason instanceof Error ? reason.message : '다운로드하지 못했습니다.') }
        }}>{file.name}</button>
        <button type="button" className="admin-btn admin-btn-ghost sm" aria-label={`${file.name} 첨부 해제`} onClick={() => setAttachments(old => old.filter(f => f.id !== file.id))}>해제</button>
      </li>)}</ul>
    </fieldset>
    {error && <p role="alert" className="admin-form-hint-warn">{error}</p>}
    <div className="admin-form-actions">
      <button type="button" className="admin-btn admin-btn-ghost" disabled={saving || uploading} onClick={onCancel}>{report ? '목록' : '닫기'}</button>
      <button type="button" className="admin-btn admin-btn-primary" disabled={saving || uploading || !studentId} onClick={save}>{uploading ? '파일 업로드 중…' : saving ? '저장 중…' : '저장'}</button>
    </div>
    {picking && <StudentPicker onClose={() => setPicking(false)} onPick={async picked => {
      setStudent(picked); setPicking(false); setBasic({ phone: picked.phone ?? '', email: '', sex: picked.sex ?? '' })
      try { setBasic(await api(`/professor-counsel/students/${encodeURIComponent(picked.id)}`)) }
      catch (reason) { setError(reason instanceof Error ? reason.message : '인적사항을 조회하지 못했습니다.') }
    }} />}
    {viewing && <StudentDetailModal studentId={studentId} role="professor" onClose={() => setViewing(false)} />}
  </div>
}
