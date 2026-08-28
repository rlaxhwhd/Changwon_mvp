import { useEffect } from 'react'
import { LuArrowLeft, LuPrinter } from 'react-icons/lu'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getEventsByRequest } from '../data/counselEvents'
import { getCounselRecords } from '../data/counselRecords'
import { getCounselStudentProfile, getRequestById } from '../data/counselRequests'
import { getCounselorById } from '../data/counselors'
import type { CounselRecord } from '../data/schema/counselRecord'

/**
 * 상담일지 인쇄 (SPEC C10 · 현행 `CoMs010Print`·`pop_adminConsultingInfoPrint` 대응)
 * 레이아웃(GNB·사이드바) 바깥에 두어 화면 그대로가 인쇄면이 된다.
 * 값은 전부 기록·신청·이력 단일소스에서 읽는다.
 *
 * 두 경로가 같은 화면을 쓴다 — 일지 1장은 서식이 하나이므로 나누지 않는다.
 *   단건 `/counsel/records/:recordId/print`
 *   다건 `/counsel/records/print?ids=a,b,c` (목록에서 여러 명 선택 → 한 번에 인쇄)
 */
export default function CounselRecordPrint() {
  const { recordId } = useParams()
  const [searchParams] = useSearchParams()
  const idsParam = searchParams.get('ids') ?? ''
  const ids = recordId ? [recordId] : idsParam.split(',').filter(Boolean)

  const all = getCounselRecords()
  const records = ids.flatMap(id => {
    const found = all.find(item => item.id === id)
    return found ? [found] : []
  })

  const title =
    records.length === 1
      ? `상담일지_${records[0].studentName}_${records[0].date}`
      : `상담일지_${records.length}건`

  useEffect(() => {
    if (records.length > 0) document.title = title
  }, [title, records.length])

  if (records.length === 0) {
    return (
      <div className="print-page">
        <p className="print-missing">상담 기록을 찾을 수 없습니다.</p>
        <Link to="/counsel/records" className="admin-btn admin-btn-ghost"><LuArrowLeft /> 목록으로</Link>
      </div>
    )
  }

  return (
    <div className="print-page">
      <div className="print-toolbar">
        <Link to="/counsel/records" className="admin-btn admin-btn-ghost"><LuArrowLeft /> 목록으로</Link>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => window.print()}>
          <LuPrinter /> {records.length > 1 ? `${records.length}건 인쇄` : '인쇄'}
        </button>
      </div>

      {records.map(record => <RecordSheet key={record.id} record={record} />)}
    </div>
  )
}

/** 일지 1장 — 인쇄 시 장마다 페이지가 나뉜다(.print-sheet). */
function RecordSheet({ record }: { record: CounselRecord }) {
  const profile = getCounselStudentProfile(record.studentId)
  const request = getRequestById(record.requestId)
  const events = getEventsByRequest(record.requestId)
  const slot = request?.slot

  return (
    <article className="print-sheet">
      <header className="print-head">
        <h1>상 담 일 지</h1>
        <p>국립창원대학교 역량개발관리시스템 드림캐치</p>
      </header>

      <table className="print-table">
        <tbody>
          <tr>
            <th>학번</th><td>{profile?.studentNo ?? '—'}</td>
            <th>성명</th><td>{record.studentName}</td>
          </tr>
          <tr>
            <th>학과</th><td>{record.studentMajor}</td>
            <th>학년 · 학적</th><td>{profile ? `${profile.grade}학년 · ${profile.enrollmentStatus}` : '—'}</td>
          </tr>
          <tr>
            <th>연락처</th><td>{profile?.phone ?? '—'}</td>
            <th>상담 유형</th><td>{record.type} · {record.method}</td>
          </tr>
          <tr>
            <th>상담 일자</th><td>{record.date}</td>
            <th>상담 시간</th><td>{slot ? `${slot.start}–${slot.end}` : '—'}</td>
          </tr>
          <tr>
            <th>장소 · 방식</th><td>{slot?.place ?? '—'}</td>
            <th>담당 상담사</th><td>{record.counselorName}</td>
          </tr>
          <tr>
            <th>상담 주제</th><td colSpan={3}>{record.topic}</td>
          </tr>
        </tbody>
      </table>

      <section className="print-block">
        <h2>상담 소견</h2>
        <p>{record.summary}</p>
      </section>

      <section className="print-block">
        <h2>학생 공개 코멘트</h2>
        <p>{record.comment}</p>
      </section>

      {record.followUp && (
        <section className="print-block">
          <h2>후속 조치</h2>
          <p>{record.followUp}</p>
        </section>
      )}

      {events.length > 0 && (
        <section className="print-block">
          <h2>처리 이력</h2>
          <table className="print-table is-log">
            <thead>
              <tr><th>구분</th><th>내용</th><th>처리자</th><th>일시</th></tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td>{event.kind}</td>
                  <td>
                    {event.kind === '재배정'
                      ? `${getCounselorById(event.fromCounselorId)?.name ?? '미배정'} → ${getCounselorById(event.toCounselorId)?.name ?? '미배정'}`
                      : event.toSlot
                        ? `${event.toSlot.date} ${event.toSlot.start}–${event.toSlot.end}`
                        : '—'}
                    {event.reason && ` · ${event.reason}`}
                  </td>
                  <td>{event.byName}</td>
                  <td>{event.at.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="print-sign">
        <div><span>작성일</span><strong>{record.updatedAt.slice(0, 10)}</strong></div>
        <div><span>상담사</span><strong>{record.counselorName}</strong><em>(인)</em></div>
      </footer>
    </article>
  )
}
