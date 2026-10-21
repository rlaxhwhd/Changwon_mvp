import CounselSlotPicker from '../../components/CounselSlotPicker'
import { useSlotPicker } from '../../hooks/useSlotPicker'
import { useCounselWeek } from '../../hooks/useCounselWeek'
import { slotAvailable } from '../../../shared/counselOperationsStore'
import { useState } from 'react'
import CounselReserveModal from '../../components/CounselReserveModal'
import CounselConsentModal from '../../components/CounselConsentModal'
import IapSummaryBanner from '../../components/IapSummaryBanner'
import CounselTabs from '../../components/CounselTabs'
import CounselWeekCard from '../../components/CounselWeekCard'
import { submitCounselRequest } from '../../data/counselRequestsWrite'
import { getCounselorCards, type CounselorCard } from '../../data/counselorsRead'
import { type Day } from '../../lib/counselCalendar'
import { catalogOptions } from '../../data/growthInputCatalog'
import PsychExtraRequestModal from '../../components/PsychExtraRequestModal'
import './CareerCounsel.css'
import { usePageHead } from '../../components/PageCrumb'

type CounselorId = string
type SlotStatus = 'available' | 'reserved' | 'selected'

interface SelectedSlot {
  day: Day
  time: string
}

const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

function getCounselorsForSlot(days: Day[], counselors: CounselorCard[], dayIndex: number, timeIndex: number) {
  return counselors.filter(c => slotAvailable(c.id, days[dayIndex].iso, times[timeIndex]))
}

/** 심리상담 예약 화면. mode='test' 는 같은 일정표로 오프라인 심리검사를 신청한다 —
 *  검사도 심리상담사가 상담센터에서 진행하므로 상담사의 같은 시간대를 쓴다(신청은 심리상담 신청 + 검사 종류 코드). */
export default function PsychCounsel({ mode = 'counsel' }: { mode?: 'counsel' | 'test' }) {
  const testMode = mode === 'test'
  // Route data is loaded after module import; read the shared store at render.
  const counselors = getCounselorCards('psych')
  const testKinds = catalogOptions('PSYCH_TEST_KIND')
  const [testCode, setTestCode] = useState('')
  const [extraOpen, setExtraOpen] = useState(false)
  const mobileSlots = useSlotPicker()
  // 보고 있는 주(월~금) — 주를 넘기면 그 주의 슬롯을 다시 읽는다.
  const week = useCounselWeek()
  const days = week.days
  // 경로 표시 마지막 칸 — 상단바 항목 이름과 화면 이름이 다르다.
  usePageHead(testMode ? '심리검사 신청' : '상담 신청',
    testMode ? '받고 싶은 검사를 고르고, 상담사와 날짜·시간을 선택해 주세요. 검사는 심리상담센터에서 오프라인으로 진행합니다.'
      : '상담사를 선택하고 원하는 날짜와 시간을 선택해 주세요.')
  // 진로취업 화면과 같은 순서로 고른다 — 시간 먼저, 그 시간에 가능한 상담사가 뒤따른다.
  const [selectedCounselor, setSelectedCounselor] = useState<CounselorId>('')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)
  const [notice, setNotice] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  // 고른 칸은 요일 키(mon~fri)로 맞춘다 — 주를 넘기면 다른 주의 같은 요일이 선택돼 보이지 않게 비운다.
  const moveWeek = (go: () => void) => { setSelectedSlot(null); setSelectedCounselor(''); go() }

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const activeCounselor = counselors.find(counselor => counselor.id === selectedCounselor) ?? counselors[0]
  const slotCounselors = days.map((_, dayIndex) => times.map((__, timeIndex) => getCounselorsForSlot(days, counselors, dayIndex, timeIndex)))
  // 고른 시간에 자리가 남은 상담사만 추린다 — 예약 완료된 상담사는 후보에서 뺀다.
  const filteredCounselors = (() => {
    if (!selectedSlot) return []
    const dayIndex = days.findIndex(day => day.key === selectedSlot.day.key)
    const timeIndex = times.indexOf(selectedSlot.time)
    return (slotCounselors[dayIndex]?.[timeIndex] ?? []).filter(counselor =>
      slotAvailable(counselor.id, selectedSlot.day.iso, selectedSlot.time),
    )
  })()

  const canReserve = !!selectedSlot && !!selectedCounselor && (!testMode || !!testCode)
  const testLabel = testKinds.find(kind => kind.code === testCode)?.label ?? ''

  const openReserve = () => {
    if (!canReserve) {
      showNotice(testMode ? '검사와 상담사, 날짜·시간을 먼저 선택해주세요' : '상담사와 날짜·시간을 먼저 선택해주세요')
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
    const day = days.find(d => d.key === dayKey)!
    if (!counselors.some(c => slotAvailable(c.id, day.iso, time))) return 'reserved'
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

          {testMode && (
            <fieldset className="cc-test-kinds">
              <legend>검사 선택</legend>
              {testKinds.map(kind => (
                <label key={kind.code} className={testCode === kind.code ? 'active' : ''}>
                  <input type="radio" name="psych-test-kind" value={kind.code} checked={testCode === kind.code} onChange={() => setTestCode(kind.code)} />
                  {kind.label}
                </label>
              ))}
            </fieldset>
          )}

          {canReserve && (
            <section className="cc-reservation-summary" aria-label="예약 정보 요약">
              <strong>예약 정보 요약</strong>
              <dl>
                {testMode && <div><dt>검사</dt><dd>{testLabel}</dd></div>}
                <div><dt>상담사</dt><dd>{activeCounselor.name} {activeCounselor.title}</dd></div>
                <div><dt>일정</dt><dd>{selectedSlot.day.date} {selectedSlot.time}</dd></div>
                <div><dt>{testMode ? '검사 방식' : '상담 방식'}</dt><dd>{testMode ? '오프라인 (심리상담센터)' : '대면 또는 화상 선택'}</dd></div>
              </dl>
            </section>
          )}

          <button className="cc-reserve-btn cc-reserve-panel" onClick={openReserve} disabled={!canReserve}>
            {testMode ? '심리검사 신청하기' : '상담 예약하기'}
          </button>
          {/* 자리가 모두 마감됐을 때 희망 일정을 남기는 길 — 심리상담사 게시판으로 간다. */}
          {!testMode && (
            <button type="button" className="cc-extra-request" onClick={() => setExtraOpen(true)}>
              추가 심리상담신청
            </button>
          )}
        </aside>

        <main className="cc-calendar-card">
          <div className="cc-calendar-head">
            <button aria-label="이전 주" onClick={() => moveWeek(week.prevWeek)} disabled={week.isThisWeek}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div className="cc-week-title">
              <i className="fa-regular fa-calendar-days" />
              <strong>{days[0].date}</strong>
              <span>~</span>
              <strong>{days[4].date}</strong>
            </div>
            <div className="cc-head-actions">
              <button aria-label="다음 주" onClick={() => moveWeek(week.nextWeek)}>
                <i className="fa-solid fa-chevron-right" />
              </button>
              <button className="cc-this-week" onClick={() => moveWeek(week.thisWeek)} disabled={week.isThisWeek}>이번 주</button>
              <button aria-label="달력 열기">
                <i className="fa-regular fa-calendar-days" />
              </button>
            </div>
          </div>

          {week.error && <p className="cc-week-error" role="alert">{week.error}</p>}
          <div className="cc-legend" aria-busy={week.loading}>
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
              <i className="fa-regular fa-clock" />
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
        onSubmit={async purpose => {
          await submitCounselRequest({
            type: '심리',
            purpose,
            topicCode: testMode ? testCode : undefined,
            counselorId: activeCounselor.id,
            slotDate: selectedSlot?.day.iso ?? '',
            time: selectedSlot?.time ?? '',
            place: '학생생활관 1층 심리상담센터',
          })
          setReserveOpen(false)
          showNotice(testMode ? '심리검사가 신청되었습니다' : '상담 예약이 신청되었습니다')
        }}
      />

      <PsychExtraRequestModal open={extraOpen} onClose={() => setExtraOpen(false)}
        onSaved={() => { setExtraOpen(false); showNotice('추가 심리상담신청이 접수되었습니다') }} />
    </div>
  )
}
