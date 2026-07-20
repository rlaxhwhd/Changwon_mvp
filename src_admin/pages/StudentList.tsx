import type { IconType } from 'react-icons'
import { LuFrown, LuRocket, LuRoute, LuSearch, LuTriangleAlert } from 'react-icons/lu'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveCounselor } from '../data/counselors'
import { STUDENTS, getStudentIap } from '../../src_v2/data/students'
import type { StudentData } from '../../src_v2/data/students'
import {
  mergeDetailedIntoRoster,
  rosterTrackClass,
  enrollStatusClass,
} from '../data/studentRoster'
import type { RosterStudent, RosterTrack } from '../data/studentRoster'
import EmptyState from '../components/EmptyState'

/** 3단계 로드맵 phase 의 task 완료율(%) → 진행률 근사 (상세 학생) */
function roadmapProgress(student: StudentData): number {
  const tasks = student.phases.flatMap(p => p.tasks)
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100)
}

/** 상세 학생(src_v2) → 로스터 뷰 모델로 환원 (목록 단일 소스에 병합) */
function detailToRoster(s: StudentData): RosterStudent {
  const iap = getStudentIap(s)
  return {
    id: s.id,
    name: s.name,
    major: s.major,
    grade: s.grade,
    studentType: s.studentType,
    iap: iap.iapType,
    track: iap.track as RosterTrack,
    progress: roadmapProgress(s),
    status: '재학',
  }
}

const ALL = '전체'

const TRACK_ICON: Record<RosterTrack, IconType> = {
  표준: LuRoute,
  집중관리: LuTriangleAlert,
  가속: LuRocket,
}

export default function StudentList() {
  const counselor = getActiveCounselor()
  const navigate = useNavigate()

  // 담당 학생 = 상세 학생 + 더미 로스터 (상담사 담당 학과로 필터, 빈 배열이면 전 학과)
  const managed = useMemo<RosterStudent[]>(() => {
    const merged = mergeDetailedIntoRoster(STUDENTS.map(detailToRoster))
    const depts = counselor.departments
    return depts.length === 0 ? merged : merged.filter(s => depts.includes(s.major))
  }, [counselor.departments])

  // 상세 데이터 보유 id 집합 (행 클릭 시 상세/플레이스홀더 분기 안내용)
  const detailedIds = useMemo(() => new Set(STUDENTS.map(s => s.id)), [])

  const [query, setQuery] = useState('')
  const [major, setMajor] = useState<string>(ALL)
  const [grade, setGrade] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const [track, setTrack] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)

  // 필터 옵션은 담당 학생 집합에서 파생 (하드코딩 금지)
  const majors = useMemo(() => [...new Set(managed.map(s => s.major))].sort(), [managed])
  const grades = useMemo(
    () => [...new Set(managed.map(s => s.grade))].sort((a, b) => a - b),
    [managed],
  )
  const types = useMemo(() => [...new Set(managed.map(s => s.studentType))], [managed])
  const tracks = useMemo(() => [...new Set(managed.map(s => s.track))], [managed])
  const statuses = useMemo(() => [...new Set(managed.map(s => s.status))], [managed])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return managed.filter(s => {
      if (major !== ALL && s.major !== major) return false
      if (grade !== ALL && String(s.grade) !== grade) return false
      if (type !== ALL && s.studentType !== type) return false
      if (track !== ALL && s.track !== track) return false
      if (status !== ALL && s.status !== status) return false
      if (q) {
        const hay = `${s.name} ${s.major} ${s.studentType} ${s.iap}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [managed, query, major, grade, type, track, status])

  const focusCount = useMemo(
    () => managed.filter(s => s.track === '집중관리').length,
    [managed],
  )

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">담당 학생 목록</h1>
          <p className="admin-page-desc">
            {counselor.dept} · {counselor.scope} · 총 {managed.length}명
            {focusCount > 0 && (
              <>
                {' '}
                · <span className="admin-focus-inline"><LuTriangleAlert /> 집중관리 {focusCount}명</span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* 필터/검색 툴바 — 옵션은 담당 학생 집합에서 파생 */}
      <div className="admin-filterbar">
        <div className="admin-search">
          <LuSearch />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="이름·학과·유형 검색"
          />
        </div>
        <label className="admin-select">
          <span>학과</span>
          <select value={major} onChange={e => setMajor(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {majors.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="admin-select">
          <span>학년</span>
          <select value={grade} onChange={e => setGrade(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {grades.map(g => (
              <option key={g} value={String(g)}>{g}학년</option>
            ))}
          </select>
        </label>
        <label className="admin-select">
          <span>유형</span>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="admin-select">
          <span>트랙</span>
          <select value={track} onChange={e => setTrack(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {tracks.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="admin-select">
          <span>학적</span>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value={ALL}>{ALL}</option>
            {statuses.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-toolbar">
        <span className="admin-toolbar-count">검색 결과 {list.length}명</span>
      </div>

      <section className="admin-card">
        {managed.length === 0 ? (
          <EmptyState message="담당 학생이 없습니다." />
        ) : list.length === 0 ? (
          <EmptyState icon={LuFrown} message="조건에 맞는 학생이 없습니다." />
        ) : (
          <div className="admin-roster">
            <div className="admin-roster-head">
              <span>학생</span>
              <span>학과 · 학년</span>
              <span>유형 / IAP</span>
              <span>트랙</span>
              <span>학적</span>
              <span>진행률</span>
            </div>
            {list.map(s => (
              <button
                key={s.id}
                type="button"
                className="admin-roster-row"
                onClick={() => navigate(`/students/${s.id}`)}
              >
                <span className="admin-roster-student">
                  <strong>{s.name}</strong>
                  {detailedIds.has(s.id) && (
                    <span className="admin-tag admin-tag-soft">상세</span>
                  )}
                </span>
                <span className="admin-roster-cell">
                  {s.major}
                  <small>{s.grade}학년</small>
                </span>
                <span className="admin-roster-cell">
                  <span className="admin-tag admin-tag-soft">{s.studentType}</span>
                  <small>{s.iap}</small>
                </span>
                <span className="admin-roster-cell">
                  <span className={`admin-track ${rosterTrackClass(s.track)}`}>
                    {(() => { const Icon = TRACK_ICON[s.track]; return <Icon /> })()} {s.track}
                  </span>
                </span>
                <span className="admin-roster-cell">
                  <span className={enrollStatusClass(s.status)}>{s.status}</span>
                </span>
                <span className="admin-roster-progress">
                  <span className="admin-progress-track">
                    <span className="admin-progress-fill" style={{ width: `${s.progress}%` }} />
                  </span>
                  <em>{s.progress}%</em>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
