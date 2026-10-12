import { useEffect, useState } from 'react'
import AdminModal from './AdminModal'
import { api } from '../../shared/api'
import { loadStudentDiagnoses, type RetakeState } from '../../shared/diagnosisStore'
import { getModuleByTestId } from '../../src_v2/data/careerProcess'
import DiagnosisResultReport from '../../src_v2/components/DiagnosisResultReport'
import type { RosterStudent } from '../data/studentRoster'

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
    <p>기존 진단 결과는 보존됩니다. 재응시 허용은 다음 진단 1회에 적용됩니다.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!data ? <p>진단 이력을 불러오는 중입니다.</p> : <>
      <div className="diagnosis-management-actions">
        {tests.map(test => {
          const request = data.retake.requests.find(q => q.testId === test && q.status !== 'COMPLETED')
          return <button className="admin-btn" type="button" key={test} disabled={busy || request?.status === 'APPROVED'} onClick={() => void approve(test)}>
            {getModuleByTestId(test)?.name ?? test} · {request?.status === 'APPROVED' ? '재응시 허용됨' : request?.status === 'PENDING' ? '요청 승인' : '재응시 허용'}
          </button>
        })}
      </div>
      {data.retake.requests.filter(q => q.status === 'PENDING').map(q => <p key={q.id}>재검사 요청 접수: {new Date(q.requestedAt).toLocaleString('ko-KR')} · 모든 상담사 처리 가능</p>)}
      <table className="diagnosis-management-history">
        <thead><tr><th>진단</th><th>회차</th><th>응시일</th><th>상태</th><th>결과</th></tr></thead>
        <tbody>{data.attempts.map(a => <tr key={a.id}>
          <td>{getModuleByTestId(a.testId)?.name ?? a.testId}</td><td>{a.attemptNo}회</td>
          <td>{(a.completedAt || a.startedAt || '').slice(0, 10) || '—'}</td><td>{a.status}</td>
          <td><button className="admin-btn sm" type="button" disabled={!data.results.some(r => r.testId === a.testId && r.attemptNo === a.attemptNo)} onClick={() => setSelected(`${a.testId}:${a.attemptNo}`)}>결과 보기</button></td>
        </tr>)}</tbody>
      </table>
      {result && <DiagnosisResultReport result={result} showChart />}
    </>}
  </AdminModal>
}
