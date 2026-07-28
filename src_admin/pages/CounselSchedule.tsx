import { LuCalendar, LuCalendarCheck, LuChevronRight, LuClock, LuInbox } from 'react-icons/lu'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getActiveCounselorId } from '../data/counselors'
import { getRequestsByAssignee } from '../data/counselRequests'
import type { CounselRequest } from '../data/counselRequests'
import { getAvailability } from '../data/availability'
import { WEEKDAY_LABEL, WEEKDAY_ORDER } from '../data/schema/availability'
import EmptyState from '../components/EmptyState'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** YYYY-MM-DD → '7월 10일 (금)' */
function fmtDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`
}

export default function CounselSchedule() {
  const counselorId = getActiveCounselorId()

  const availability = useMemo(() => getAvailability(counselorId), [counselorId])

  // 예약신청(대기)·확정 상담을 날짜별 그룹 (슬롯 있는 건만).
  // 학생이 예약하면 status='대기' + slot 으로 여기에 '예약신청'으로 바로 뜬다.
  const scheduled = useMemo(
    () =>
      getRequestsByAssignee(counselorId)
        .filter(r => r.slot && (r.status === '확정' || r.status === '대기'))
        .sort((a, b) => {
          const ad = `${a.slot!.date} ${a.slot!.start}`
          const bd = `${b.slot!.date} ${b.slot!.start}`
          return ad.localeCompare(bd)
        }),
    [counselorId],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, CounselRequest[]>()
    for (const r of scheduled) {
      const key = r.slot!.date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return [...map.entries()]
  }, [scheduled])

  const today = todayISO()

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">일정·예약</h1>
          <p className="admin-page-desc">예약신청·확정된 상담 일정을 날짜별로 관리합니다.</p>
        </div>
        <Link to="/counsel/requests" className="admin-btn admin-btn-primary">
          <LuInbox /> 신청 접수함
        </Link>
      </header>

      <div className="admin-col-2 admin-col-2-wide">
        {/* 확정 일정 리스트 */}
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <LuCalendarCheck /> 예약·확정 일정
            </h2>
            <span className="admin-tag admin-tag-soft">{scheduled.length}건</span>
          </div>

          {grouped.length === 0 ? (
            <EmptyState icon={LuCalendar} message="예약·확정된 상담 일정이 없습니다." />
          ) : (
            <div className="admin-schedule-days">
              {grouped.map(([date, items]) => (
                <div key={date} className="admin-schedule-day">
                  <div className={`admin-schedule-date${date === today ? ' is-today' : ''}`}>
                    <span className="admin-schedule-date-label">{fmtDateLabel(date)}</span>
                    {date === today && <span className="admin-chip admin-chip-ok">오늘</span>}
                  </div>
                  <ul className="admin-list">
                    {items.map(r => (
                      <li key={r.id} className="admin-list-row">
                        <span className="admin-list-time">
                          {r.slot!.start}–{r.slot!.end}
                        </span>
                        <div className="admin-list-main">
                          <strong>{r.studentName}</strong>
                          <small>
                            {r.studentMajor} · {r.method}
                          </small>
                          <p>{r.topic}</p>
                        </div>
                        <div className="admin-schedule-actions">
                          {r.status === '대기'
                            ? <span className="admin-chip admin-chip-wait">예약신청</span>
                            : <span className="admin-tag">{r.slot!.place ?? '장소 미정'}</span>}
                          <Link
                            to={r.status === '대기' ? '/counsel/requests' : `/counsel/session/${r.studentId}`}
                            className="admin-btn admin-btn-ghost sm"
                          >
                            {r.status === '대기' ? '확정하기' : '상담 진행'}
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 가능 시간대 (설정 연동, 읽기 전용 요약) */}
        <section className="admin-card">
          <div className="admin-card-head">
            <h2>
              <LuClock /> 내 가능 시간대
            </h2>
            <Link to="/settings/availability" className="admin-card-more">
              설정 <LuChevronRight />
            </Link>
          </div>

          {availability.length === 0 ? (
            <EmptyState
              icon={LuClock}
              message="설정된 가능 시간대가 없습니다."
              action={{
                label: '가능 시간대 설정',
                onClick: () => {
                  window.location.href = '/admin/settings/availability'
                },
              }}
            />
          ) : (
            <ul className="admin-avail-summary">
              {WEEKDAY_ORDER.map(wd => {
                const slots = availability.filter(s => s.weekday === wd)
                if (slots.length === 0) return null
                return (
                  <li key={wd} className="admin-avail-row">
                    <span className="admin-avail-day">{WEEKDAY_LABEL[wd]}</span>
                    <div className="admin-avail-slots">
                      {slots.map(s => (
                        <span key={s.id} className="admin-tag admin-tag-soft">
                          {s.start}–{s.end}
                        </span>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
