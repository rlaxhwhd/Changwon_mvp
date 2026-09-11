/** 추가 심리상담신청 — 학생 신청 없이 이뤄진 심리상담(내방·전화·후속 회차)을 상담사가 기록한다.
 *  교수의 지도학생 상담기록과 같은 방식: 저장 즉시 신청(완료)+기록이 함께 생겨 접수함·상담일지·통계에 잡힌다. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentPicker from '../components/StudentPicker'
import type { RosterStudent } from '../data/studentRoster'
import { addPsychCounselRecord } from '../data/counselRequests'
import type { CounselMethod } from '../data/schema/counselRequest'
import { getActiveUser } from '../data/staff'
import { useAsyncAction } from '../../shared/useAsyncAction'

const METHODS: CounselMethod[] = ['대면', '비대면']

export default function PsychCounselRecordNew() {
  const user = getActiveUser()
  const navigate = useNavigate()
  const [student, setStudent] = useState<RosterStudent | null>(null)
  const [picking, setPicking] = useState(false)
  const [topic, setTopic] = useState('')
  const [method, setMethod] = useState<CounselMethod>('대면')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState('')
  const [formError, setFormError] = useState('')
  const { run, saving, error } = useAsyncAction()

  const save = () => {
    if (!student || !topic.trim() || !summary.trim()) {
      setFormError('학생·상담 주제·상담 내용을 모두 입력하세요.')
      return
    }
    setFormError('')
    run(async () => {
      await addPsychCounselRecord({ studentId: student.id, topic: topic.trim(), method, date, summary: summary.trim() })
      navigate('/counsel/journals')
    })
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">추가 심리상담신청</h1>
          <p className="admin-page-desc">{user.name} · 학생 신청 없이 진행한 심리상담을 기록합니다. 저장하면 완료된 상담으로 접수함·상담일지·통계에 반영됩니다.</p>
        </div>
      </header>
      <section className="admin-card">
        <div className="admin-card-head"><h2>기록 작성</h2></div>
        <div className="admin-form-grid">
          <div className="admin-field">
            <span>학생</span>
            <button type="button" className="admin-btn" onClick={() => setPicking(true)}>
              {student ? `${student.name} (${student.studentNo})` : '학생 검색'}
            </button>
          </div>
          <label className="admin-field">
            <span>상담 주제</span>
            <input value={topic} onChange={event => setTopic(event.target.value)} placeholder="예: 대인관계 스트레스" maxLength={200} />
          </label>
          <label className="admin-field">
            <span>상담 방식</span>
            <select value={method} onChange={event => setMethod(event.target.value as CounselMethod)}>
              {METHODS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="admin-field">
            <span>상담일</span>
            <input type="date" value={date} onChange={event => setDate(event.target.value)} />
          </label>
          <label className="admin-field admin-field-full">
            <span>상담 내용</span>
            <textarea value={summary} onChange={event => setSummary(event.target.value)} />
          </label>
          {(formError || error) && <p className="admin-field-hint" role="alert">{formError || error}</p>}
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={save}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </section>
      {picking && <StudentPicker title="학생 검색"
        onPick={picked => { setStudent(picked); setPicking(false) }} onClose={() => setPicking(false)} />}
    </div>
  )
}
