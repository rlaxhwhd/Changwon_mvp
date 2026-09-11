import { slotAvailable } from '../../../shared/counselOperationsStore'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CounselReserveModal from '../../components/CounselReserveModal'
import CounselConsentModal from '../../components/CounselConsentModal'
import IapSummaryBanner from '../../components/IapSummaryBanner'
import CounselTabs from '../../components/CounselTabs'
import CounselWeekCard from '../../components/CounselWeekCard'
import { submitCounselRequest } from '../../data/counselRequestsWrite'
import { CAREER_INTAKE_QUESTIONS } from '../../data/counselIntake'
import { CARE_TRACK_LABEL, type CareTrack } from '../../data/counselTrack'
import { getNextAction, isDiagnosisDone, getTopicsForType } from '../../data/careerProcess'
import { useMetadata } from '../../../shared/useMetadata'
import { getPipelineState } from '../../data/pipeline'
import { getActiveStudent, getStudentType } from '../../data/students'
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
const counselors: CounselorCard[] = getCounselorCards('career')

// 이번 주 월~금 (공용 유틸 — 화면에 날짜 하드코딩 금지)
const days: Day[] = getCounselWeek()

const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

function getCounselorsForSlot(dayIndex: number, timeIndex: number) {
  return counselors.filter(c => slotAvailable(c.id, days[dayIndex].iso, times[timeIndex]))
}

export default function CareerCounsel() {
  useMetadata()
  const currentType = getStudentType(getActiveStudent())
  // 진로·취업 상담은 성격이 다른 두 가지다(counselTrack). 무엇을 신청하는지 고르기
  // 전에는 예약 화면을 그리지 않는다 — 문진표 유무도 로드맵 생성 여부도 갈린다.
  const [track, setTrack] = useState<CareTrack | null>(null)
  const pipeline = getPipelineState(getActiveStudent())
  // 진단 2종을 요구하는 것은 CARE 7+ 연계 상담뿐이다. 일반 상담은 게이트 밖이라
  // 신입생도 바로 신청한다(PROCESS.md §2).
  const care7Open = isDiagnosisDone(pipeline)

  // 경로 표시 마지막 칸 — 상단바 항목 이름과 화면 이름이 다르다.
  usePageHead(
    track ? CARE_TRACK_LABEL[track].student : '상담 신청',
    track
      ? '상담사를 선택하고 원하는 날짜와 시간을 선택해 주세요.'
      : '어떤 상담이 필요한지 먼저 골라 주세요.',
  )
  const [selectedCounselor, setSelectedCounselor] = useState<CounselorId>('')
  const [search, setSearch] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)
  const [notice, setNotice] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  // 이번에 연 예약 모달에서 실제로 신청까지 갔는지 — 취소로 닫은 경우와 구분한다.
  const [submitted, setSubmitted] = useState(false)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

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

  // 예약 모달을 닫는다. 신청까지 끝낸 경우에만 고른 값을 비우고 맨 위로 되돌린다.
  // 새로고침을 하지 않는 이유 — 위의 「이번 주 상담내역」이 렌더할 때마다 신청 스토어를
  // 다시 읽으므로, 이 리렌더만으로 방금 낸 신청이 거기 나타난다. 그래서 맨 위가 목적지다.
  // 취소로 닫았을 때는 고르던 슬롯을 그대로 둔다(다시 고르게 하면 안 된다).
  const closeReserve = () => {
    setReserveOpen(false)
    if (!submitted) return
    setSubmitted(false)
    setSelectedSlot(null)
    setSelectedCounselor('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeCounselor = counselors.find(counselor => counselor.id === selectedCounselor) ?? counselors[0]
  const canReserve = !!selectedSlot && !!selectedCounselor
  const isAllMode = false
  const slotCounselors = useMemo(
    () => days.map((_, dayIndex) => times.map((__, timeIndex) => getCounselorsForSlot(dayIndex, timeIndex))),
    [],
  )
  const filteredCounselors = useMemo(() => {
    if (!selectedSlot) return []
    const dayIndex = days.findIndex(day => day.key === selectedSlot.day.key)
    const timeIndex = times.indexOf(selectedSlot.time)
    return (slotCounselors[dayIndex]?.[timeIndex] ?? []).filter(counselor =>
      slotAvailable(counselor.id, selectedSlot.day.iso, selectedSlot.time),
    )
  }, [selectedSlot, slotCounselors])

  const getStatus = (dayKey: string, time: string): SlotStatus => {
    if (selectedSlot?.day.key === dayKey && selectedSlot.time === time && !isAllMode) return 'selected'
    const day = days.find(d => d.key === dayKey)!
    if (!counselors.some(c => slotAvailable(c.id, day.iso, time))) return 'reserved'
    return 'available'
  }

  const selectSlot = (day: Day, time: string) => {
    if (isAllMode) return
    if (getStatus(day.key, time) === 'reserved') return
    if (selectedSlot?.day.key === day.key && selectedSlot.time === time) {
      setSelectedSlot(null)
      setSelectedCounselor('')
      return
    }
    setSelectedSlot({ day, time })
    setSelectedCounselor('')
  }

  const selectCounselorFromCalendar = (counselor: CounselorCard, day: Day, time: string) => {
    setSelectedCounselor(counselor.id)
    setSelectedSlot({ day, time })
    setNotice(`${counselor.name} 상담사 선택됨`)
    window.setTimeout(() => setNotice(''), 1800)
  }

  if (counselors.length === 0) {
    return (
      <div className="cc-wrap cc-career">
        <p style={{ padding: '48px 0', textAlign: 'center', color: '#6b7280' }}>등록된 진로취업 상담사가 없습니다.</p>
      </div>
    )
  }

  // ── 상담 종류 선택 ──────────────────────────────────────────────────────
  // 잠긴 카드를 감추지 않는다 — 무엇이 왜 잠겼고 다음에 뭘 해야 하는지 함께 준다
  // (PROCESS.md §2 구현규칙 1). 다음 행동 경로는 getNextAction 단일소스에서 받는다.
  if (!track) {
    const next = getNextAction(pipeline)
    return (
      <div className="cc-wrap cc-career">
        <CounselTabs />

        <section className="cc-track-choice" aria-label="상담 종류 선택">
          <article className="cc-track-card">
            <h2>{CARE_TRACK_LABEL.general.student}</h2>
            <p>진로·취업 관련 어떤 고민이든 상담받을 수 있습니다.</p>
            <small>진단 없이 바로 신청 · 사전문진표 없음</small>
            <button type="button" className="cc-track-cta" onClick={() => setTrack('general')}>
              신청하기
            </button>
          </article>

          <article className={`cc-track-card${care7Open ? '' : ' is-locked'}`}>
            <h2>
              {CARE_TRACK_LABEL.care7.student}
              {!care7Open && <i className="fa-solid fa-lock" aria-hidden="true" />}
            </h2>
            <p>진단 결과를 바탕으로 나의 유형을 확정하고, 그 자리에서 경력개발 로드맵을 만듭니다.</p>
            <small>
              {care7Open
                ? '진단 2종 완료 · 사전문진표를 작성합니다'
                : 'C-CORE 핵심진단과 후속진단을 마쳐야 신청할 수 있습니다'}
            </small>
            {care7Open ? (
              <button type="button" className="cc-track-cta" onClick={() => setTrack('care7')}>
                신청하기
              </button>
            ) : (
              <Link className="cc-track-cta" to={next?.ctaPath ?? '/diagnosis/employment'}>
                {next?.ctaLabel ?? '진단센터로 가기'}
              </Link>
            )}
          </article>
        </section>
      </div>
    )
  }

  return (
    <div className="cc-wrap cc-career">
      {notice && (
        <div className="cc-toast" role="status">
          <i className="fa-solid fa-circle-check" />
          {notice}
        </div>
      )}

      {/* 진단 요약은 CARE 7+ 연계 상담에만 붙는다 — 일반 상담은 진단 전에도 신청한다. */}
      {track === 'care7' && <IapSummaryBanner note="상담 시 참고할 내 진단 요약 (자동 공유)" />}

      <CounselTabs />

      {/* 지금 무엇을 신청하는 중인지 계속 보여 준다 — 두 상담은 문진표도 결과도 다르다. */}
      <div className="cc-track-bar">
        <span className={`cc-track-tag${track === 'care7' ? ' is-care7' : ''}`}>
          {CARE_TRACK_LABEL[track].student}
        </span>
        <button type="button" className="cc-track-back" onClick={() => setTrack(null)}>
          <i className="fa-solid fa-arrow-left" /> 상담 종류 다시 고르기
        </button>
      </div>

      <CounselWeekCard />

      <div className="cc-layout">
        <aside className="cc-counselor-panel">
          <div className="cc-panel-title">
            <i className="fa-regular fa-user" />
            <h2>상담사 선택</h2>
          </div>

          <p className="cc-slot-context">
            {selectedSlot
              ? `${selectedSlot.day.date} ${selectedSlot.time} · 예약 가능한 상담사`
              : '먼저 일정표에서 상담 시간을 선택하세요'}
          </p>

          <label className="cc-search" hidden>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="상담사 이름을 검색하세요"
            />
            <i className="fa-solid fa-magnifying-glass" />
          </label>

          <div className="cc-counselor-list">
            <button
              hidden
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
                </span>
                <i className="fa-solid fa-chevron-right" />
              </button>
            ))}
          </div>

          {selectedSlot && selectedCounselor && (
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
        onClose={closeReserve}
        roleLabel="상담사"
        counselorName={`${activeCounselor.name} ${activeCounselor.title}`}
        date={selectedSlot?.day.date ?? ''}
        time={selectedSlot?.time ?? ''}
        room="학생회관 2층 진로취업상담실"
        phone="055-213-3214"
        // 사전문진표는 CARE 7+ 연계 상담에만 있다. 일반 상담은 목적 한 칸으로 끝난다.
        questions={track === 'care7' ? CAREER_INTAKE_QUESTIONS : undefined}
        topicOptions={track === 'care7' ? currentType ? getTopicsForType(currentType) : [] : undefined}
        completion={{
          title: '상담 신청이 완료되었습니다',
          desc: track === 'care7'
            ? '상담사가 문진표를 확인한 뒤 일정을 확정합니다. 확정 결과는 마이페이지 상담현황에서 볼 수 있습니다.'
            : '상담사가 신청 내용을 확인한 뒤 일정을 확정합니다. 확정 결과는 마이페이지 상담현황에서 볼 수 있습니다.',
        }}
        onSubmit={async (purpose, answers, topicCode) => {
          await submitCounselRequest({
            topicCode,
            type: '진로취업',
            careTrack: track,
            purpose,
            counselorId: activeCounselor.id,
            slotDate: selectedSlot?.day.iso ?? '',
            time: selectedSlot?.time ?? '',
            place: '학생회관 2층 진로취업상담실',
            intake: track === 'care7'
              ? CAREER_INTAKE_QUESTIONS.map((question, i) => ({ question, answer: answers[i] ?? '' }))
              : undefined,
          })
          setSubmitted(true)
          // 완료 화면을 모달이 직접 띄운다 — 여기서 닫으면 안내가 안 보인다.
          // 선택 초기화는 완료 화면을 닫을 때(closeReserve) 한다 — 지금 비우면
          // 모달에 뜬 상담사·일시가 눈앞에서 지워진다.
        }}
      />
    </div>
  )
}
