import { Link } from 'react-router-dom'
import CounselHistory, { type CounselHistoryRow } from '../../../shared/components/CounselHistory'
import { getActiveStudentId, getStudentCounselRequests } from '../../data/students'
import { getCounselorLabel } from '../../data/counselorsRead'
import { PROFESSOR_GROUPS } from '../../data/professors'
import { counselRecords } from '../../../shared/counselStore'
import { useStore } from '../../../shared/useRoadmapStore'
import { cancelCounselRequest } from '../../data/counselRequestsWrite'
import { usePageHead } from '../../components/PageCrumb'
import { Icon } from '../../components/Icon'

function professorLabel(id?: string): string {
  for (const group of PROFESSOR_GROUPS) {
    for (const professors of Object.values(group.divisions)) {
      const found = professors.find(p => p.id === id)
      if (found) return `${found.name} 교수`
    }
  }
  return '교수 배정 중'
}

export default function CounselStatus() {
  usePageHead('상담 현황', '지금까지의 상담 내역을 한눈에 확인하고, 앞으로의 상담 일정을 관리할 수 있습니다.')
  useStore('dc:counsel-updated')
  const records = new Map(counselRecords().filter(r => r.status === '완료').map(r => [r.requestId, r]))
  const rows: CounselHistoryRow[] = getStudentCounselRequests(getActiveStudentId()).map(r => {
    const record = records.get(r.id)
    return {
      id: r.id, type: r.type, status: r.status,
      counselor: r.type === '교수' ? professorLabel(r.professorId) : getCounselorLabel(r.assignedCounselorId),
      topic: r.topic, method: r.method, place: r.slot?.place ?? '', requestedAt: r.requestedAt,
      comment: r.status === '완료' ? record?.comment || r.counselorComment || '' : '',
      date: (r.status === '완료' ? record?.date : undefined) || r.slot?.date || (r.completedAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(r.completedAt)) : ''),
      time: r.slot?.start ?? '',
    }
  })
  return <CounselHistory rows={rows} onCancel={cancelCounselRequest} sidebarFooter={
    <section className="cs-booking"><Icon name="calendar" /><h2>상담이 필요하신가요?</h2><p>진로와 취업, 대학생활에 대한 고민을<br />전문 상담사와 함께 이야기해 보세요.</p><Link to="/counsel">상담 예약하기 <Icon name="arrow" /></Link></section>
  } />
}
