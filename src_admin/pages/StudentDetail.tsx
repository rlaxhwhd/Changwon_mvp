import { LuArrowLeft } from 'react-icons/lu'
import { Link, useParams } from 'react-router-dom'
import StudentDetailView from '../components/StudentDetailView'
import { getActiveUser } from '../data/staff'
import { usePageCrumbLeaf } from '../components/PageCrumb'
import { studentLiteOf } from '../data/studentRoster'

// 상담사 학생관리 상세 페이지 — 상세 본문은 공유 컴포넌트(StudentDetailView)를 그대로 쓴다.
// 조교·교수 '보기' 모달과 동일 컴포넌트 → 수정은 StudentDetailView 한 곳에서만.
export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const role = getActiveUser().role
  // 경로 표시 마지막 칸 — '학생 관리' 만 뜨면 어느 학생인지 알 수 없다.
  usePageCrumbLeaf(studentLiteOf(id ?? '')?.name)

  return (
    <div className="admin-page">
      <StudentDetailView
        studentId={id ?? ''}
        role={role}
        headerAction={
          <Link to="/students" className="admin-btn admin-btn-ghost">
            <LuArrowLeft /> 목록
          </Link>
        }
      />
    </div>
  )
}
