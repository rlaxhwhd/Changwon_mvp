import { slotAvailable } from '../../../shared/counselOperationsStore'
import { useState } from 'react'
import CounselReserveModal from '../../components/CounselReserveModal'
import CounselConsentModal from '../../components/CounselConsentModal'
import IapSummaryBanner from '../../components/IapSummaryBanner'
import CounselTabs from '../../components/CounselTabs'
import { findDefaultSelection, type DepartmentGroup } from '../../data/professors'
import { getCounselableProfessorGroups } from '../../data/professorProfilesRead'
import { submitProfessorCounselRequest } from '../../data/counselRequestsWrite'
import { getActiveStudent } from '../../data/students'
import { getCounselWeek, type Day } from '../../lib/counselCalendar'
import './CareerCounsel.css'
import './ProfessorCounsel.css'
import { usePageHead } from '../../components/PageCrumb'

type CounselMode = 'online' | 'offline'
type SlotStatus = 'available' | 'reserved' | 'selected'

interface SelectedSlot {
  day: Day
  time: string
}

// 학과별 교수 = 단일소스(professors.ts) 투영. 화면에 하드코딩하지 않는다.
// 기본 선택은 활성 학생의 학과(major)로 파생한다(본인 학과가 먼저 열림).

// 이번 주 월~금 (공용 유틸 — 화면에 날짜 하드코딩 금지)
const days: Day[] = getCounselWeek()

const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']



export default function ProfessorCounsel() {
  // 경로 표시 마지막 칸 — 상단바 항목 이름과 화면 이름이 다르다.
  usePageHead('상담 신청', '교수님을 선택하고 온라인 또는 오프라인 상담을 신청하세요.')
  const professorGroups = getCounselableProfessorGroups()
  if (!professorGroups.length) return (
    <div className="cc-wrap cc-professor pc-wrap">
      <CounselTabs />
      <section className="cc-hero"><h1>교수상담 신청</h1><p>현재 상담 가능한 교수가 없습니다.</p></section>
    </div>
  )
  return <ProfessorCounselForm professorGroups={professorGroups} />
}

function ProfessorCounselForm({ professorGroups }: { professorGroups: DepartmentGroup[] }) {
  const defaultSelection = findDefaultSelection(getActiveStudent().major, professorGroups)
  const [selectedGroupName, setSelectedGroupName] = useState(defaultSelection.groupName)
  const selectedGroup = professorGroups.find(group => group.name === selectedGroupName) ?? professorGroups[0]
  const divisionNames = Object.keys(selectedGroup.divisions)
  const [selectedDivision, setSelectedDivision] = useState(defaultSelection.division)
  const professors = selectedGroup.divisions[selectedDivision] ?? selectedGroup.divisions[divisionNames[0]]
  const [selectedProfessorId, setSelectedProfessorId] = useState(professors[0].id)
  const [mode, setMode] = useState<CounselMode>('online')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>({
    day: days[2],
    time: '14:00',
  })
  const [notice, setNotice] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentMode, setConsentMode] = useState<CounselMode>('online')
  const [onlineSubject, setOnlineSubject] = useState('학업 및 진로 상담')
  const activeProfessor = professors.find(professor => professor.id === selectedProfessorId) ?? professors[0]
  const onlineTopic = `${selectedDivision} ${activeProfessor.name} 교수님께 온라인 상담을 신청합니다.`
  const [onlineContent, setOnlineContent] = useState('')

  const updateGroup = (groupName: string) => {
    const nextGroup = professorGroups.find(group => group.name === groupName) ?? professorGroups[0]
    const nextDivision = Object.keys(nextGroup.divisions)[0]
    const nextProfessor = nextGroup.divisions[nextDivision][0]
    setSelectedGroupName(nextGroup.name)
    setSelectedDivision(nextDivision)
    setSelectedProfessorId(nextProfessor.id)
  }

  const updateDivision = (divisionName: string) => {
    const nextProfessor = selectedGroup.divisions[divisionName][0]
    setSelectedDivision(divisionName)
    setSelectedProfessorId(nextProfessor.id)
  }

  const getStatus = (dayKey: string, time: string): SlotStatus => {
    if (selectedSlot?.day.key === dayKey && selectedSlot.time === time) return 'selected'
    if (!slotAvailable(activeProfessor.id, days.find(d => d.key === dayKey)!.iso, time)) return 'reserved'
    return 'available'
  }

  const selectSlot = (day: Day, time: string) => {
    if (getStatus(day.key, time) === 'reserved') return
    if (selectedSlot?.day.key === day.key && selectedSlot.time === time) {
      setSelectedSlot(null)
      return
    }
    setSelectedSlot({ day, time })
  }

  const submitOnline = () => {
    setConsentMode('online')
    setConsentOpen(true)
  }

  const openReserve = () => {
    if (!selectedSlot) {
      setNotice('날짜·시간을 먼저 선택해주세요')
      window.setTimeout(() => setNotice(''), 1800)
      return
    }
    setConsentMode('offline')
    setConsentOpen(true)
  }

  const handleConsentAgree = async () => {
    setConsentOpen(false)
    if (consentMode === 'online') {
      try {
      await submitProfessorCounselRequest({
        professorId: activeProfessor.id,
        topic: `${onlineSubject}: ${onlineContent || onlineTopic}`,
        method: '비대면',
      })
      setNotice(`${activeProfessor.name} 교수님께 온라인 상담 신청이 접수되었습니다`)
      window.setTimeout(() => setNotice(''), 1800)
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '상담 신청을 저장하지 못했습니다.')
      }
    } else {
      setReserveOpen(true)
    }
  }

  return (
    <div className="cc-wrap cc-professor pc-wrap">
      {notice && (
        <div className="cc-toast" role="status">
          <i className="fa-solid fa-circle-check" />
          {notice}
        </div>
      )}

      <CounselTabs />

      <section className="cc-hero">
        <div className="cc-breadcrumb">
          <span>상담센터</span>
          <i className="fa-solid fa-chevron-right" />
          <span>교수상담</span>
          <i className="fa-solid fa-chevron-right" />
          <strong>상담 신청</strong>
        </div>
        <h1>교수상담 신청</h1>
        <p>대학/부서와 학부를 선택한 뒤, 원하는 교수님께 온라인 또는 오프라인 상담을 신청하세요.</p>
        <IapSummaryBanner note="상담 시 참고할 내 진단 요약 (자동 공유)" />
      </section>

      <div className="pc-layout">
        <div className="pc-select-bar">
          <label className="pc-select">
            <span className="pc-select-label">대학/부서</span>
            <select value={selectedGroupName} onChange={e => updateGroup(e.target.value)}>
              {professorGroups.map(group => (
                <option key={group.name} value={group.name}>{group.name}</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down pc-select-caret" aria-hidden="true" />
          </label>
          <label className="pc-select">
            <span className="pc-select-label">학부/학과</span>
            <select value={selectedDivision} onChange={e => updateDivision(e.target.value)}>
              {divisionNames.map(division => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down pc-select-caret" aria-hidden="true" />
          </label>
          <label className="pc-select">
            <span className="pc-select-label">교수</span>
            <select value={selectedProfessorId} onChange={e => setSelectedProfessorId(e.target.value)}>
              {professors.map(professor => (
                <option key={professor.id} value={professor.id}>
                  {professor.name} {professor.title}
                </option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down pc-select-caret" aria-hidden="true" />
          </label>
        </div>

        <section className="pc-professor-panel">
          <div className="pc-professor-detail">
            <span className="pc-avatar pc-avatar-lg">{activeProfessor.name.slice(0, 1)}</span>
            <div className="pc-professor-detail-info">
              <strong>{activeProfessor.name} {activeProfessor.title}</strong>
              <div className="pc-professor-detail-meta">
                <span><i className="fa-solid fa-building-columns" />{selectedGroupName} · {selectedDivision}</span>
                <span><i className="fa-solid fa-book" />{activeProfessor.major}</span>
                <span><i className="fa-solid fa-location-dot" />{activeProfessor.room}</span>
              </div>
            </div>
          </div>

          <div className="pc-mode-card">
            <div className="pc-mode-tabs">
              <button className={mode === 'online' ? 'active' : ''} onClick={() => setMode('online')}>
                <i className="fa-solid fa-laptop" />
                온라인 상담신청
              </button>
              <button className={mode === 'offline' ? 'active' : ''} onClick={() => setMode('offline')}>
                <i className="fa-regular fa-calendar-days" />
                오프라인 상담신청
              </button>
            </div>

            {mode === 'online' ? (
              <div className="pc-online-form">
                <label>
                  상담 주제
                  <input value={onlineSubject} onChange={event => setOnlineSubject(event.target.value)} />
                </label>
                <label>
                  상담 내용
                  <textarea
                    value={onlineContent}
                    placeholder={onlineTopic}
                    onChange={event => setOnlineContent(event.target.value)}
                  />
                </label>
                <button className="cc-reserve-btn" onClick={submitOnline}>온라인 상담 신청하기</button>
              </div>
            ) : (
              <div className="pc-offline-calendar">
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
                  </div>
                </div>

                <div className="cc-legend">
                  <span><i className="available" />예약 가능</span>
                  <span><i className="reserved" />예약 완료</span>
                  <span><i className="selected" />선택됨</span>
                </div>

                <div className="cc-calendar-grid pc-calendar-grid">
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

                <div className="cc-selected-bar pc-selected-bar">
                  <div className="cc-selected-title">
                    <i className="fa-regular fa-clock" />
                    <strong>선택한 일정</strong>
                  </div>
                  <div className="cc-selected-info">
                    <span><i className="fa-solid fa-user-tie" />{activeProfessor.name} 교수</span>
                    <span><i className="fa-regular fa-calendar-days" />{selectedSlot ? selectedSlot.day.date : '날짜 미선택'}</span>
                    <span><i className="fa-regular fa-clock" />{selectedSlot ? selectedSlot.time : '시간 미선택'}</span>
                  </div>
                  <button className="cc-reserve-btn" onClick={openReserve}>오프라인 상담 예약하기</button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <CounselConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAgree={handleConsentAgree}
      />

      <CounselReserveModal
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        roleLabel="교수"
        counselorName={`${activeProfessor.name} 교수`}
        date={selectedSlot?.day.date ?? ''}
        time={selectedSlot?.time ?? ''}
        room={activeProfessor.room}
        phone="055-213-3500"
        onSubmit={async purpose => {
          if (selectedSlot) {
            await submitProfessorCounselRequest({
              professorId: activeProfessor.id,
              topic: purpose,
              method: '대면',
              slotDate: selectedSlot.day.iso,
              time: selectedSlot.time,
              place: activeProfessor.room,
            })
          }
          setReserveOpen(false)
          setNotice('오프라인 상담 예약이 신청되었습니다')
          window.setTimeout(() => setNotice(''), 1800)
        }}
      />
    </div>
  )
}
