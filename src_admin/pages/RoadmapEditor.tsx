import { LuFrown, LuInbox, LuPencilRuler, LuUser } from 'react-icons/lu'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { STUDENTS } from '../../src_v2/data/students'
import { getMergedRoadmap } from '../data/roadmapOverrides'
import { useRoadmap } from '../../shared/useRoadmapStore'
import RoadmapEditorPanel from '../components/RoadmapEditorPanel'
import EmptyState from '../components/EmptyState'

// ─────────────────────────────────────────────────────────────────────────
// 로드맵 편집 페이지 — 껍데기만 갖는다. 편집 기능 전체는 RoadmapEditorPanel 에 있고
// 학생 상세의 로드맵 탭이 같은 패널을 쓴다(상담 중에는 상세를 열어 둔 채로 고친다).
// 변경 요청함·이행률 현황이 이 경로로 링크를 걸고 있어 페이지는 그대로 남는다.
// ─────────────────────────────────────────────────────────────────────────
export default function RoadmapEditor() {
  const { studentId } = useParams<{ studentId: string }>()
  const student = STUDENTS.find(s => s.id === studentId)
  const revision = useRoadmap(studentId ?? '')
  const merged = useMemo(() => (studentId ? getMergedRoadmap(studentId) : null), [studentId, revision])

  if (!student || !merged) {
    return (
      <div className="admin-page">
        <header className="admin-page-head">
          <div><h1 className="admin-page-title">로드맵 편집</h1></div>
        </header>
        <section className="admin-card">
          <EmptyState
            icon={LuFrown}
            message="해당 학생의 로드맵을 찾을 수 없습니다."
            action={{ label: '학생 목록으로', onClick: () => { window.location.href = '/admin/students' } }}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">
            <LuPencilRuler /> 로드맵 편집 — {student.name}
          </h1>
          <p className="admin-page-desc">
            {student.major} · {student.grade}학년 · 학번 {student.studentNo}
            {merged.meta && (
              <> · 현재 v{merged.meta.version} {merged.meta.confirmed ? '확정' : ''}</>
            )}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to={`/students/${student.id}`} className="admin-btn admin-btn-ghost">
            <LuUser /> 학생 상세
          </Link>
          <Link to="/roadmap/requests" className="admin-btn admin-btn-ghost">
            <LuInbox /> 변경 요청함
          </Link>
        </div>
      </header>

      <RoadmapEditorPanel studentId={student.id} />
    </div>
  )
}
