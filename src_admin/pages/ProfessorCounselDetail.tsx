import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProfessorReportEditor from '../components/ProfessorReportEditor'
import { loadProfessorReport } from '../data/professorCounselManage'
import type { CounselChannel, ProfessorReport } from '../data/professorCounselManage'
import './ProfessorCounsel.css'

export default function ProfessorCounselDetail({ channel }: { channel: CounselChannel }) {
  const { requestId = '' } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState<ProfessorReport>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    loadProfessorReport(requestId).then(row => {
      if (active) { if (row.channel !== channel) navigate(`/professor/counsel/${row.channel}/${row.id}`, { replace: true }); else setReport(row) }
    }).catch(reason => { if (active) setError(reason.message) })
    return () => { active = false }
  }, [requestId, channel, navigate])
  const back = () => navigate(`/professor/counsel/${channel}`)
  return <div className="admin-page professor-counsel-page">
    <header className="admin-page-head"><h1 className="admin-page-title">{channel === 'online' ? '온라인' : '오프라인'} 상담 상세</h1></header>
    {error ? <><p role="alert">{error}</p><Link to={`/professor/counsel/${channel}`}>목록으로</Link></> : !report ? <div className="admin-loading">불러오는 중…</div> :
      <section className="admin-card professor-report-detail"><ProfessorReportEditor key={report.id} channel={channel} report={report} onSaved={back} onCancel={back} /></section>}
  </div>
}
