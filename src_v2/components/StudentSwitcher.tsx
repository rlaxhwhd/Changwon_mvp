import { DEVELOPMENT_STUDENTS, getActiveStudentId, setActiveStudent } from '../data/students'
import './StudentSwitcher.css'

/**
 * 데모용 전역 학생 전환 위젯. 우하단 고정.
 * 전환 시 localStorage 저장 후 리로드 → 모든 화면(로드맵·라운지·공고 등)에 반영.
 */
export default function StudentSwitcher() {
  const activeId = getActiveStudentId()

  return (
    <div className="ss-switcher" role="group" aria-label="학생 전환 (데모)">
      <span className="ss-title"><i className="fa-solid fa-user-group" /> 데모 학생 전환</span>
      <div className="ss-options">
        {DEVELOPMENT_STUDENTS.map(s => (
          <button
            key={s.id}
            className={`ss-btn${s.id === activeId ? ' active' : ''}`}
            onClick={() => s.id !== activeId && setActiveStudent(s.id)}
          >
            <strong>{s.name}</strong>
            <small>{s.grade}학년 · {s.major}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
