import { useMemo, useState } from 'react'
import CounselReserveModal from '../../components/CounselReserveModal'
import CounselConsentModal from '../../components/CounselConsentModal'
import IapSummaryBanner from '../../components/IapSummaryBanner'
import CounselTabs from '../../components/CounselTabs'
import CounselSlotPicker from '../../components/CounselSlotPicker'
import { useSlotPicker } from '../../hooks/useSlotPicker'
import CounselWeekCard from '../../components/CounselWeekCard'
import { submitCounselRequest } from '../../data/counselRequestsWrite'
import { getCounselorCards, type CounselorCard } from '../../data/counselorsRead'
import { getCounselWeek, type Day } from '../../lib/counselCalendar'
import './CareerCounsel.css'
import { usePageHead } from '../../components/PageCrumb'

type CounselorId = string
type SlotStatus = 'available' | 'reserved' | 'selected'

interface SelectedSlot {
  day: Day
  time: string
}

// 상담사 = 단일소스(src_admin) 투영. 화면에 하드코딩하지 않는다.
const counselors: CounselorCard[] = getCounselorCards('psych')

// 이번 주 월~금 (공용 유틸 — 화면에 날짜 하드코딩 금지)
const days: Day[] = getCounselWeek()

const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

// 데모 예약 완료 슬롯 — 기본(첫) 상담사에 대해서만 표시(상담사 id는 단일소스에서 파생).
const defaultCounselorId = counselors[0]?.id ?? ''
const reservedSlots = new Set([
  `${defaultCounselorId}-mon-10:00`,
  `${defaultCounselorId}-mon-13:00`,
  `${defaultCounselorId}-tue-09:00`,
  `${defaultCounselorId}-tue-15:00`,
  `${defaultCounselorId}-wed-12:00`,
  `${defaultCounselorId}-wed-16:00`,
  `${defaultCounselorId}-thu-11:00`,
  `${defaultCounselorId}-thu-14:00`,
  `${defaultCounselorId}-fri-12:00`,
  `${defaultCounselorId}-fri-17:00`,
])

function getCounselorsForSlot(dayIndex: number, timeIndex: number) {
  const start = ((dayIndex * times.length + timeIndex) * 3) % counselors.length
  return Array.from({ length: 3 }, (_, index) => counselors[(start + index) % counselors.length])
}

export default function PsychCounsel() {
  // 경로 표시 마지막 칸 — 상단바 항목 이름과 화면 이름이 다르다.
  usePageHead('상담 신청', '상담사를 선택하고 원하는 날짜와 시간을 선택해 주세요.')
  // 640px 이하: 표 대신 「요일 칩 → 시간 칩」(components/CounselSlotPicker). 복구는 그 파일의 스위치.
  const mobileSlots = useSlotPicker()
  // 진로취업 화면과 같은 순서로 고른다 — 시간 먼저, 그 시간에 가능한 상담사가 뒤따른다.
  const [selectedCounselor, setSelectedCounselor] = useState<CounselorId>('')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)
  const [notice, setNotice] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const activeCounselor = counselors.find(counselor => counselor.id === selectedCounselor) ?? counselors[0]
  const slotCounselors = useMemo(
    () => days.map((_, dayIndex) => times.map((__, timeIndex) => getCounselorsForSlot(dayIndex, timeIndex))),
    [],
  )
  // 고른 시간에 자리가 남은 상담사만 추린다 — 예약 완료된 상담사는 후보에서 뺀다.
  const filteredCounselors = useMemo(() => {
    if (!selectedSlot) return []
    const dayIndex = days.findIndex(day => day.key === selectedSlot.day.key)
    const timeIndex = times.indexOf(selectedSlot.time)
    return (slotCounselors[dayIndex]?.[timeIndex] ?? []).filter(counselor =>
      !reservedSlots.has(`${counselor.id}-${selectedSlot.day.key}-${selectedSlot.time}`),
    )
  }, [selectedSlot, slotCounselors])

  const canReserve = !!selectedSlot && !!selectedCounselor

  const openReserve = () => {
    if (!canReserve) {
      showNotice('상담사와 날짜·시간을 먼저 선택해주세요')
      return
    }
    setConsentOpen(true)
  }

  const handleConsentAgree = () => {
    setConsentOpen(false)
    setReserveOpen(true)
  }

  const getStatus = (dayKey: string, time: string): SlotStatus => {
    if (selectedSlot?.day.key === dayKey && selectedSlot.time === time) return 'selected'
    if (reservedSlots.has(`${selectedCounselor}-${dayKey}-${time}`)) return 'reserved'
    return 'available'
  }

  const selectSlot = (day: Day, time: string) => {
    if (getStatus(day.key, time) === 'reserved') return
    if (selectedSlot?.day.key === day.key && selectedSlot.time === time) {
      setSelectedSlot(null)
      setSelectedCounselor('')
      return
    }
    setSelectedSlot({ day, time })
    setSelectedCounselor('')
  }

  if (counselors.length === 0) {
    return (
      <div className="cc-wrap cc-psych">
        <p style={{ padding: '48px 0', textAlign: 'center', color: '#6b7280' }}>등록된 심리 상담사가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="cc-wrap cc-psych">
      {notice && (
        <div className="cc-toast" role="status">
          <i className="fa-solid fa-circle-check" />
          {notice}
        </div>
      )}

      <IapSummaryBanner note="상담 시 참고할 내 진단 요약 (자동 공유)" />

      <CounselTabs />

      <CounselWeekCard />

      <div className="cc-layout">
        <aside className="cc-counselor-panel">
          <div className="cc-panel-title">
            <i className="fa-regular fa-heart" />
            <h2>상담사 선택</h2>
          </div>

          <p className="cc-slot-context">
            {selectedSlot
              ? `${selectedSlot.day.date} ${selectedSlot.time} · 예약 가능한 상담사`
              : '먼저 일정표에서 상담 시간을 선택하세요'}
          </p>

          <div className="cc-counselor-list">
            {filteredCounselors.map(counselor => (
              <button
                key={counselor.id}
                className={`cc-counselor-row ${selectedCounselor === counselor.id ? 'active' : ''}`}
                onClick={() => setSelectedCounselor(counselor.id)}
              >
                <span>
                  <strong>{counselor.name} {counselor.title}</strong>
                  <small>{counselor.specialty}</small>
                </span>
                <i className="fa-solid fa-chevron-right" />
              </button>
            ))}
          </div>

          {canReserve && (
            <section className="cc-reservation-summary" aria-label="예약 정보 요약">
              <strong>예약 정보 요약</strong>
              <dl>
                <div><dt>상담사</dt><dd>{activeCounselor.name} {activeCounselor.title}</dd></div>
                <div><dt>일정</dt><dd>{selectedSlot.day.date} {selectedSlot.time}</dd></div>
                <div><dt>상담 방식</dt><dd>대면 또는 화상 선택</dd></div>
              </dl>
            </section>
          )}

          <button className="cc-reserve-btn cc-reserve-panel" onClick={openReserve} disabled={!canReserve}>
            상담 예약하기
          </button>
        </aside>

        <main className="cc-calendar-card">
          <div className="cc-calendar-head">
            <button aria-label="이전 주">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div className="cc-week-title">
              <i className="fa-regular fa-calendar-days" />
              <strong>{days[0].date}</strong>
              <span>~</span>
              <strong>{days[4].date}</strong>
            </div>
            <div className="cc-head-actions">
              <button aria-label="다음 주">
                <i className="fa-solid fa-chevron-right" />
              </button>
              <button className="cc-this-week">이번 주</button>
              <button aria-label="달력 열기">
                <i className="fa-regular fa-calendar-days" />
              </button>
            </div>
          </div>

          <div className="cc-legend">
            <span><i className="available" />예약 가능</span>
            <span><i className="reserved" />예약 완료</span>
            <span><i className="selected" />선택됨</span>
          </div>

          {mobileSlots ? (
            <CounselSlotPicker days={days} times={times} getStatus={getStatus} onSelect={selectSlot} selected={selectedSlot} />
          ) : (
          <div className="cc-calendar-grid">
            <div className="cc-grid-head empty" />
            {days.map(day => (
              <div key={day.key} className="cc-grid-head">{day.label}</div>
            ))}

            {times.map(time => (
              <div className="cc-time-row" key={time}>
                <div className="cc-time-cell">{time}</div>
                {days.map(day => {
                  const status = getStatus(day.key, time)
                  return (
                    <button
                      key={`${day.key}-${time}`}
                      className={`cc-slot cc-slot-${status}`}
                      onClick={() => selectSlot(day, time)}
                    >
                      {status === 'selected' && <i className="fa-solid fa-check" />}
                      {status === 'selected' ? '선택됨' : status === 'reserved' ? '예약 완료' : '예약 가능'}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          )}

          <div className="cc-selected-bar">
            <div className="cc-selected-title">
              <strong>선택한 일정</strong>
            </div>
            <div className="cc-selected-info">
              <span><i className="fa-regular fa-user" />{selectedCounselor ? `${activeCounselor.name} ${activeCounselor.title}` : '상담사 미선택'}</span>
              <span><i className="fa-regular fa-calendar-days" />{selectedSlot ? selectedSlot.day.date : '날짜 미선택'}</span>
              <span><i className="fa-regular fa-clock" />{selectedSlot ? selectedSlot.time : '시간 미선택'}</span>
            </div>
          </div>
        </main>
      </div>

      <CounselConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAgree={handleConsentAgree}
      />

      <CounselReserveModal
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        roleLabel="상담사"
        counselorName={`${activeCounselor.name} ${activeCounselor.title}`}
        date={selectedSlot?.day.date ?? ''}
        time={selectedSlot?.time ?? ''}
        room="학생생활관 1층 심리상담센터"
        phone="055-213-2025"
        onSubmit={purpose => {
          submitCounselRequest({
            type: '심리',
            purpose,
            counselorId: activeCounselor.id,
            slotDate: selectedSlot?.day.iso ?? '',
            time: selectedSlot?.time ?? '',
            place: '학생생활관 1층 심리상담센터',
          })
          setReserveOpen(false)
          showNotice('상담 예약이 신청되었습니다')
        }}
      />
    </div>
  )
}
