import AdminModal from '../components/AdminModal'
import CounselRecordContext from '../components/CounselRecordContext'
import CounselJournalFields from '../components/CounselJournalFields'
import { emptyCounselTemplate } from '../data/schema/counselTemplate'
import { isCare7 } from '../../src_v2/data/counselTrack'
import { downloadCounselHistoryCsv } from '../data/counselExport'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CounselHistoryView, { type CounselHistoryRow } from '../../shared/components/CounselHistory'
import { counselRecords, loadCounselRecords } from '../../shared/counselStore'
import { useStore } from '../../shared/useRoadmapStore'
import { getRequestsByAssignee, refreshCounselRequests } from '../data/counselRequests'
import { getActiveCounselor, getCounselorById } from '../data/counselors'
import './CounselHistory.css'

export default function CounselHistory() {
  const me = getActiveCounselor()
  useStore('dc:counsel-updated')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<CounselHistoryRow | null>(null)
  useEffect(() => {
    let active = true
    void Promise.all([refreshCounselRequests(), loadCounselRecords()])
      .catch(e => { if (active) setError(e instanceof Error ? e.message : '상담기록을 불러오지 못했습니다.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [me.id])
  const records = new Map(counselRecords().filter(r => r.status === '완료').map(r => [r.requestId, r]))
  const detailRequest = detail ? getRequestsByAssignee(me.id).find(r => r.id === detail.id) : undefined
  const rows: CounselHistoryRow[] = getRequestsByAssignee(me.id).map(r => {
    const record = records.get(r.id)
    return {
      id: r.id, studentName: r.studentName, studentNo: r.studentNo, type: r.type, status: r.status,
      counselor: getCounselorById(r.assignedCounselorId)?.name ?? '배정 중', topic: r.topic,
      comment: r.status === '완료' ? record?.comment ?? '' : '',
      date: (r.status === '완료' ? record?.date : undefined) || r.slot?.date || '',
      time: r.slot?.start ?? '', requestedAt: r.requestedAt, method: r.method, place: r.slot?.place ?? '',
    }
  })
  return <div className="admin-page admin-counsel-history">
    <header className="admin-page-head"><div><h1 className="admin-page-title">상담기록</h1><p className="admin-page-desc">내가 담당한 상담 일정과 기록을 한눈에 확인합니다.</p></div></header>
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">상담기록을 불러오는 중입니다.</p>}
    <CounselHistoryView rows={rows} showStudent onExport={downloadCounselHistoryCsv} onOpenDetail={setDetail} sidebarFooter={<section className="cs-booking"><h2>상담일지 관리</h2><p>상담내용과 학생 공개 코멘트는<br />상담일지에서 작성하고 관리할 수 있습니다.</p><Link to="/counsel/journals">상담일지 바로가기</Link></section>} />
    {detail && <AdminModal title={`상담일지 — ${detail.studentName}`} size="lg" onClose={() => setDetail(null)}>
      <dl className="admin-journal-brief">
        <div><dt>학생</dt><dd>{detail.studentName} · {detail.studentNo}</dd></div>
        <div><dt>상담유형 · 상태</dt><dd>{detail.type} · {detail.status}</dd></div>
        <div><dt>상담일시</dt><dd>{detail.date || '일정 미정'} {detail.time}</dd></div>
        <div><dt>상담사</dt><dd>{detail.counselor}</dd></div>
        <div><dt>상담 주제</dt><dd>{detail.topic}</dd></div>
      </dl>
      <CounselRecordContext key={detail.id} requestId={detail.id}>{context => context.record ? <>
        <p className="admin-field-hint">일지 작성상태: {context.record.status}</p>
        <CounselJournalFields record={context.record} career={detail.type === '진로취업'}
          care7={isCare7(detailRequest?.careTrack)}
          template={context.record.template ?? emptyCounselTemplate(detail.method, detail.date, detail.time)}
          summary={context.record.summary} comment={context.record.comment} followUp={context.record.followUp ?? ''}
          diagnosisType={context.diagnosisType} typeLocked={context.typeLocked}
          setTemplate={() => {}} setSummary={() => {}} setComment={() => {}} setFollowUp={() => {}} readOnly />
      </> : <p role="status">작성된 상담일지가 없습니다.</p>}</CounselRecordContext>
      <div className="admin-form-actions"><Link className="admin-btn admin-btn-ghost" to="/counsel/journals">상담일지 작성·관리</Link><button type="button" className="admin-btn admin-btn-ghost" onClick={() => setDetail(null)}>닫기</button></div>
    </AdminModal>}
  </div>
}
