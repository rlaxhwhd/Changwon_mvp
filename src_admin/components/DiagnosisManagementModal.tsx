import { useEffect, useState } from 'react'
import { LuCircleCheck, LuClipboardList, LuClock, LuInfo, LuRotateCcw, LuTriangleAlert } from 'react-icons/lu'
import AdminModal from './AdminModal'
import { api } from '../../shared/api'
import { loadStudentDiagnoses, type RetakeState } from '../../shared/diagnosisStore'
import { getModuleByTestId } from '../../src_v2/data/careerProcess'
import DiagnosisResultReport from '../../src_v2/components/DiagnosisResultReport'
import type { RosterStudent } from '../data/studentRoster'
import './DiagnosisManagementModal.css'

const day = (iso: string) => iso.slice(0, 10)

export default function DiagnosisManagementModal({ student, onClose }: { student: RosterStudent; onClose: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadStudentDiagnoses>>>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<string>()
  useEffect(() => {
    let live = true
    loadStudentDiagnoses(student.id).then(value => { if (live) setData(value) }).catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [student.id])
  async function approve(testId: string) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const retake = await api<RetakeState>(`/diagnosis/students/${encodeURIComponent(student.id)}/retakes/${testId}`, { method: 'POST' })
      setData(previous => previous ? { ...previous, retake } : previous)
      setNotice('재응시를 허용했습니다. 학생에게 알림이 전달됩니다.')
    } catch (e) { setError(e instanceof Error ? e.message : '승인하지 못했습니다.') }
    finally { setBusy(false) }
  }
  const result = data?.results.find(r => `${r.testId}:${r.attemptNo}` === selected)
  const tests = [...new Set(data?.attempts.map(a => a.testId) ?? [])]
  return <AdminModal title={`${student.name} · 진단 관리`} size="xl" onClose={onClose}>
    <div className="dmm">
      <p className="dmm-banner"><LuInfo aria-hidden />기존 진단 결과는 보존됩니다. 재응시 허용은 다음 진단 1회에 적용됩니다.</p>
      {error && <p className="dmm-banner is-error" role="alert"><LuTriangleAlert aria-hidden />{error}</p>}
      {notice && <p className="dmm-banner is-ok" role="status"><LuCircleCheck aria-hidden />{notice}</p>}
      {!data ? <p className="dmm-empty">진단 이력을 불러오는 중입니다.</p> : <>
        <section className="dmm-section">
          <h3 className="dmm-section-title"><LuRotateCcw aria-hidden />재응시 허용</h3>
          {tests.length === 0 ? <p className="dmm-empty">응시한 진단이 없습니다.</p> : <div className="dmm-cards">
            {tests.map(test => {
              const request = data.retake.requests.find(q => q.testId === test && q.status !== 'COMPLETED')
              const attempts = data.attempts.filter(a => a.testId === test)
              const latest = attempts.reduce((n, a) => Math.max(n, a.attemptNo), 0)
              const last = attempts.map(a => a.completedAt || a.startedAt || '').sort().pop()
              const approved = request?.status === 'APPROVED'
              const pending = request?.status === 'PENDING'
              return <button type="button" key={test} className={`dmm-card${approved ? ' is-approved' : pending ? ' is-pending' : ''}`}
                disabled={busy || approved} onClick={() => void approve(test)}>
                <span className="dmm-card-head">
                  <strong>{getModuleByTestId(test)?.name ?? test}</strong>
                  <span className="dmm-chip">{approved ? '허용됨' : pending ? '요청 대기' : '응시 완료'}</span>
                </span>
                <span className="dmm-card-meta">{latest}회 응시{last ? ` · 최근 ${day(last)}` : ''}</span>
                {pending && <span className="dmm-card-meta"><LuClock aria-hidden />학생 요청 {new Date(request.requestedAt).toLocaleString('ko-KR')} · 모든 상담사 처리 가능</span>}
                <span className="dmm-card-cta">{approved ? <><LuCircleCheck aria-hidden />재응시 허용됨</> : pending ? '요청 승인하기' : '재응시 허용하기'}</span>
              </button>
            })}
          </div>}
        </section>

        <section className="dmm-section">
          <h3 className="dmm-section-title"><LuClipboardList aria-hidden />응시 이력</h3>
          <div className="dmm-table-wrap">
            <table className="dmm-table">
              <thead><tr><th>진단</th><th>회차</th><th>응시일</th><th>상태</th><th className="dmm-col-action">결과</th></tr></thead>
              <tbody>{data.attempts.map(a => {
                const key = `${a.testId}:${a.attemptNo}`
                return <tr key={a.id} className={key === selected ? 'is-selected' : undefined}>
                  <td className="dmm-strong">{getModuleByTestId(a.testId)?.name ?? a.testId}</td><td>{a.attemptNo}회</td>
                  <td>{day(a.completedAt || a.startedAt || '') || '—'}</td><td><span className="admin-tag">{a.status}</span></td>
                  <td className="dmm-col-action"><button className="admin-btn sm admin-btn-ghost" type="button" disabled={!data.results.some(r => r.testId === a.testId && r.attemptNo === a.attemptNo)} onClick={() => setSelected(key)}>
                    {key === selected ? '보는 중' : '결과 보기'}
                  </button></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        </section>
        {result && <section className="dmm-section dmm-result"><DiagnosisResultReport result={result} showChart /></section>}
      </>}
    </div>
  </AdminModal>
}
