import { useMemo, useState } from 'react'
import CounselReserveModal from '../../components/CounselReserveModal'
import CounselConsentModal from '../../components/CounselConsentModal'
import IapSummaryBanner from '../../components/IapSummaryBanner'
import './CareerCounsel.css'

type CounselorId = 'all' | 'oh' | 'seo' | 'han' | 'moon' | 'yoon' | 'bae' | 'shin' | 'nam'
type SlotStatus = 'available' | 'reserved' | 'selected'

interface Counselor {
  id: CounselorId
  name: string
  title: string
  specialty: string
}

interface Day {
  key: string
  label: string
  date: string
}

interface SelectedSlot {
  day: Day
  time: string
}

const counselors: Counselor[] = [
  { id: 'oh', name: '오유진', title: '상담사', specialty: '스트레스 · 불안 관리' },
  { id: 'seo', name: '서민재', title: '상담사', specialty: '대인관계 · 의사소통' },
  { id: 'han', name: '한소라', title: '상담사', specialty: '자존감 · 자기이해' },
  { id: 'moon', name: '문지훈', title: '상담사', specialty: '학업동기 · 번아웃' },
  { id: 'yoon', name: '윤하늘', title: '상담사', specialty: '정서조절 · 마음챙김' },
  { id: 'bae', name: '배수현', title: '상담사', specialty: '가족관계 · 적응상담' },
  { id: 'shin', name: '신다은', title: '상담사', specialty: '진로불안 · 심리검사' },
  { id: 'nam', name: '남기범', title: '상담사', specialty: '위기상담 · 회복지원' },
]

const days: Day[] = [
  { key: 'mon', label: '05/18 (월)', date: '2026. 05. 18 (월)' },
  { key: 'tue', label: '05/19 (화)', date: '2026. 05. 19 (화)' },
  { key: 'wed', label: '05/20 (수)', date: '2026. 05. 20 (수)' },
  { key: 'thu', label: '05/21 (목)', date: '2026. 05. 21 (목)' },
  { key: 'fri', label: '05/22 (금)', date: '2026. 05. 22 (금)' },
]

const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

const reservedSlots = new Set([
  'oh-mon-10:00',
  'oh-mon-13:00',
  'oh-tue-09:00',
  'oh-tue-15:00',
  'oh-wed-12:00',
  'oh-wed-16:00',
  'oh-thu-11:00',
  'oh-thu-14:00',
  'oh-fri-12:00',
  'oh-fri-17:00',
])

function getCounselorsForSlot(dayIndex: number, timeIndex: number) {
  const start = ((dayIndex * times.length + timeIndex) * 3) % counselors.length
  return Array.from({ length: 3 }, (_, index) => counselors[(start + index) % counselors.length])
}

export default function PsychCounsel() {
  const [selectedCounselor, setSelectedCounselor] = useState<CounselorId>('oh')
  const [search, setSearch] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>({
    day: days[2],
    time: '14:00',
  })
  const [notice, setNotice] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const activeCounselor = counselors.find(counselor => counselor.id === selectedCounselor) ?? counselors[0]
  const isAllMode = selectedCounselor === 'all'
  const filteredCounselors = counselors.filter(counselor =>
    `${counselor.name} ${counselor.title} ${counselor.specialty}`.includes(search.trim()),
  )
  const slotCounselors = useMemo(
    () => days.map((_, dayIndex) => times.map((__, timeIndex) => getCounselorsForSlot(dayIndex, timeIndex))),
    [],
  )

  const openReserve = () => {
    if (isAllMode || !selectedSlot) {
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
    if (selectedSlot?.day.key === dayKey && selectedSlot.time === time && !isAllMode) return 'selected'
    if (reservedSlots.has(`${selectedCounselor}-${dayKey}-${time}`)) return 'reserved'
    return 'available'
  }

  const selectSlot = (day: Day, time: string) => {
    if (isAllMode) return
    if (getStatus(day.key, time) === 'reserved') return
    if (selectedSlot?.day.key === day.key && selectedSlot.time === time) {
      setSelectedSlot(null)
      return
    }
    setSelectedSlot({ day, time })
  }

  const selectCounselorFromCalendar = (counselor: Counselor, day: Day, time: string) => {
    setSelectedCounselor(counselor.id)
    setSelectedSlot({ day, time })
    setNotice(`${counselor.name} 상담사 선택됨`)
    window.setTimeout(() => setNotice(''), 1800)
  }

  return (
    <div className="cc-wrap">
      {notice && (
        <div className="cc-toast" role="status">
          <i className="fa-solid fa-circle-check" />
          {notice}
        </div>
      )}

      <section className="cc-hero">
        <div className="cc-breadcrumb">
          <span>상담센터</span>
          <i className="fa-solid fa-chevron-right" />
          <span>심리상담</span>
          <i className="fa-solid fa-chevron-right" />
          <strong>상담 신청</strong>
        </div>
        <h1>심리상담 신청</h1>
        <p>상담사를 선택하고 원하는 날짜와 시간을 선택해 주세요.</p>
        <IapSummaryBanner note="상담 시 참고할 내 진단 요약 (자동 공유)" />
      </section>

      <div className="cc-layout">
        <aside className="cc-counselor-panel">
          <div className="cc-panel-title">
            <i className="fa-regular fa-heart" />
            <h2>상담사 선택</h2>
          </div>

          <label className="cc-search">
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="상담사 이름을 검색하세요"
            />
            <i className="fa-solid fa-magnifying-glass" />
          </label>

          <div className="cc-counselor-list">
            <button
              className={`cc-counselor-row ${isAllMode ? 'active' : ''}`}
              onClick={() => setSelectedCounselor('all')}
            >
              <span>
                <strong>전체보기</strong>
                <small>모든 시간대 예약 가능 상담사 전체 표시</small>
              </span>
              <i className="fa-solid fa-chevron-right" />
            </button>

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
        </aside>

        <main className="cc-calendar-card">
          <div className="cc-calendar-head">
            <button aria-label="이전 주">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div className="cc-week-title">
              <i className="fa-regular fa-calendar-days" />
              <strong>2026. 05. 18 (월)</strong>
              <span>~</span>
              <strong>2026. 05. 22 (금)</strong>
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

          <div className="cc-calendar-grid">
            <div className="cc-grid-head empty" />
            {days.map(day => (
              <div key={day.key} className="cc-grid-head">{day.label}</div>
            ))}

            {times.map(time => (
              <div className="cc-time-row" key={time}>
                <div className="cc-time-cell">{time}</div>
                {days.map((day, dayIndex) => {
                  if (isAllMode) {
                    const timeIndex = times.indexOf(time)
                    const group = slotCounselors[dayIndex]?.[timeIndex] ?? []
                    return (
                      <div key={`${day.key}-${time}`} className="cc-slot cc-slot-counselors">
                        {group.length > 0 ? group.map(counselor => (
                          <button
                            key={counselor.id}
                            onClick={() => selectCounselorFromCalendar(counselor, day, time)}
                          >
                            {counselor.name}
                          </button>
                        )) : <span>예약 가능</span>}
                      </div>
                    )
                  }

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

          <div className="cc-selected-bar">
            <div className="cc-selected-title">
              <i className="fa-regular fa-clock" />
              <strong>선택한 일정</strong>
            </div>
            <div className="cc-selected-info">
              <span><i className="fa-regular fa-user" />{isAllMode ? '전체 상담사 보기' : `${activeCounselor.name} ${activeCounselor.title}`}</span>
              <span><i className="fa-regular fa-calendar-days" />{selectedSlot ? selectedSlot.day.date : '날짜 미선택'}</span>
              <span><i className="fa-regular fa-clock" />{selectedSlot ? selectedSlot.time : '시간 미선택'}</span>
            </div>
            <button className="cc-reserve-btn" onClick={openReserve}>상담 예약하기</button>
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
        onSubmit={() => {
          setReserveOpen(false)
          showNotice('상담 예약이 신청되었습니다')
        }}
      />
    </div>
  )
}
