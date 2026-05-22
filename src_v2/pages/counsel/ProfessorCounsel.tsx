import { useMemo, useState } from 'react'
import CounselReserveModal from '../../components/CounselReserveModal'
import './CareerCounsel.css'
import './ProfessorCounsel.css'

type CounselMode = 'online' | 'offline'
type SlotStatus = 'available' | 'reserved' | 'selected'

interface Professor {
  id: string
  name: string
  title: string
  major: string
  room: string
}

interface DepartmentGroup {
  name: string
  divisions: Record<string, Professor[]>
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

const departmentGroups: DepartmentGroup[] = [
  {
    name: '인문대학',
    divisions: {
      국어국문학과: [
        { id: 'kor-1', name: '김도윤', title: '교수', major: '현대문학', room: '인문관 312호' },
        { id: 'kor-2', name: '서예린', title: '교수', major: '한국어교육', room: '인문관 318호' },
        { id: 'kor-3', name: '장우석', title: '교수', major: '고전문학', room: '인문관 321호' },
      ],
      영어영문학과: [
        { id: 'eng-1', name: '박현주', title: '교수', major: '영미문화', room: '인문관 401호' },
        { id: 'eng-2', name: '이정훈', title: '교수', major: '영어학', room: '인문관 407호' },
      ],
      철학과: [
        { id: 'phi-1', name: '최민석', title: '교수', major: '윤리학', room: '인문관 502호' },
        { id: 'phi-2', name: '한지우', title: '교수', major: '서양철학', room: '인문관 505호' },
        { id: 'phi-3', name: '문정아', title: '교수', major: '동양철학', room: '인문관 510호' },
      ],
    },
  },
  {
    name: '사회과학대학',
    divisions: {
      사회학과: [
        { id: 'soc-1', name: '정하늘', title: '교수', major: '사회조사방법론', room: '사회관 204호' },
        { id: 'soc-2', name: '윤태경', title: '교수', major: '지역사회', room: '사회관 210호' },
      ],
      행정학과: [
        { id: 'adm-1', name: '남기범', title: '교수', major: '정책분석', room: '사회관 318호' },
        { id: 'adm-2', name: '오세은', title: '교수', major: '공공관리', room: '사회관 323호' },
      ],
    },
  },
  {
    name: '공과대학',
    divisions: {
      컴퓨터공학과: [
        { id: 'cse-1', name: '박지훈', title: '교수', major: '소프트웨어공학', room: '공학관 706호' },
        { id: 'cse-2', name: '강민재', title: '교수', major: '인공지능', room: '공학관 712호' },
        { id: 'cse-3', name: '신유라', title: '교수', major: '데이터베이스', room: '공학관 718호' },
      ],
      전자공학과: [
        { id: 'ele-1', name: '배성호', title: '교수', major: '반도체시스템', room: '공학관 530호' },
        { id: 'ele-2', name: '송나래', title: '교수', major: '신호처리', room: '공학관 536호' },
      ],
      기계공학부: [
        { id: 'me-1', name: '조현우', title: '교수', major: '로봇공학', room: '공학관 402호' },
        { id: 'me-2', name: '임다인', title: '교수', major: '열유체', room: '공학관 409호' },
      ],
    },
  },
  {
    name: '자연과학대학',
    divisions: {
      수학과: [
        { id: 'math-1', name: '권서준', title: '교수', major: '응용수학', room: '자연관 211호' },
        { id: 'math-2', name: '류하린', title: '교수', major: '통계학', room: '자연관 215호' },
      ],
      생명보건학부: [
        { id: 'bio-1', name: '백지수', title: '교수', major: '분자생물학', room: '자연관 418호' },
        { id: 'bio-2', name: '홍태윤', title: '교수', major: '보건과학', room: '자연관 423호' },
      ],
    },
  },
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
  'phi-1-mon-10:00',
  'phi-1-tue-13:00',
  'phi-1-wed-09:00',
  'phi-1-thu-15:00',
  'phi-1-fri-11:00',
])

export default function ProfessorCounsel() {
  const [selectedGroupName, setSelectedGroupName] = useState(departmentGroups[0].name)
  const selectedGroup = departmentGroups.find(group => group.name === selectedGroupName) ?? departmentGroups[0]
  const divisionNames = Object.keys(selectedGroup.divisions)
  const [selectedDivision, setSelectedDivision] = useState(divisionNames[0])
  const professors = selectedGroup.divisions[selectedDivision] ?? selectedGroup.divisions[divisionNames[0]]
  const [selectedProfessorId, setSelectedProfessorId] = useState(professors[0].id)
  const [mode, setMode] = useState<CounselMode>('online')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>({
    day: days[2],
    time: '14:00',
  })
  const [notice, setNotice] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)

  const activeProfessor = professors.find(professor => professor.id === selectedProfessorId) ?? professors[0]
  const onlineTopic = useMemo(() => `${selectedDivision} ${activeProfessor.name} 교수님께 온라인 상담을 신청합니다.`, [activeProfessor.name, selectedDivision])

  const updateGroup = (groupName: string) => {
    const nextGroup = departmentGroups.find(group => group.name === groupName) ?? departmentGroups[0]
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
    if (reservedSlots.has(`${activeProfessor.id}-${dayKey}-${time}`)) return 'reserved'
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
    setNotice(`${activeProfessor.name} 교수님께 온라인 상담 신청이 접수되었습니다`)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const openReserve = () => {
    if (!selectedSlot) {
      setNotice('날짜·시간을 먼저 선택해주세요')
      window.setTimeout(() => setNotice(''), 1800)
      return
    }
    setReserveOpen(true)
  }

  return (
    <div className="cc-wrap pc-wrap">
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
          <span>교수상담</span>
          <i className="fa-solid fa-chevron-right" />
          <strong>상담 신청</strong>
        </div>
        <h1>교수상담 신청</h1>
        <p>대학/부서와 학부를 선택한 뒤, 원하는 교수님께 온라인 또는 오프라인 상담을 신청하세요.</p>
      </section>

      <div className="pc-layout">
        <aside className="pc-select-panel">
          <div className="cc-panel-title">
            <i className="fa-solid fa-building-columns" />
            <h2>대학/부서 선택</h2>
          </div>
          <div className="pc-option-list">
            {departmentGroups.map(group => (
              <button
                key={group.name}
                className={selectedGroupName === group.name ? 'active' : ''}
                onClick={() => updateGroup(group.name)}
              >
                {group.name}
              </button>
            ))}
          </div>
        </aside>

        <aside className="pc-select-panel">
          <div className="cc-panel-title">
            <i className="fa-solid fa-layer-group" />
            <h2>학부/학과 선택</h2>
          </div>
          <div className="pc-option-list">
            {divisionNames.map(division => (
              <button
                key={division}
                className={selectedDivision === division ? 'active' : ''}
                onClick={() => updateDivision(division)}
              >
                {division}
              </button>
            ))}
          </div>
        </aside>

        <section className="pc-professor-panel">
          <div className="pc-professor-head">
            <div className="cc-panel-title">
              <i className="fa-solid fa-user-tie" />
              <h2>교수 선택</h2>
            </div>
            <span>{selectedGroupName} · {selectedDivision}</span>
          </div>

          <div className="pc-professor-grid">
            {professors.map(professor => (
              <button
                key={professor.id}
                className={`pc-professor-card ${selectedProfessorId === professor.id ? 'active' : ''}`}
                onClick={() => setSelectedProfessorId(professor.id)}
              >
                <span className="pc-avatar">{professor.name.slice(0, 1)}</span>
                <span>
                  <strong>{professor.name} {professor.title}</strong>
                  <small>{professor.major}</small>
                  <em>{professor.room}</em>
                </span>
              </button>
            ))}
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
                  <input defaultValue="학업 및 진로 상담" />
                </label>
                <label>
                  상담 내용
                  <textarea defaultValue={onlineTopic} />
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
                    <strong>2026. 05. 18 (월)</strong>
                    <span>~</span>
                    <strong>2026. 05. 22 (금)</strong>
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

      <CounselReserveModal
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        roleLabel="교수"
        counselorName={`${activeProfessor.name} 교수`}
        date={selectedSlot?.day.date ?? ''}
        time={selectedSlot?.time ?? ''}
        room={activeProfessor.room}
        phone="055-213-3500"
        onSubmit={() => {
          setReserveOpen(false)
          setNotice('오프라인 상담 예약이 신청되었습니다')
          window.setTimeout(() => setNotice(''), 1800)
        }}
      />
    </div>
  )
}
