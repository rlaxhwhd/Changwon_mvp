import { createPortal } from 'react-dom'
import type { StaffRole } from '../data/schema/staff'
import AdminModal from './AdminModal'
import StudentDetailView from './StudentDetailView'

// ─────────────────────────────────────────────────────────────────────────
// 학생 상세 모달 (공용) — 어느 화면에서든 학생 1명의 상세를 같은 모양으로 띄운다.
// 본문은 상담사 학생관리 상세 페이지와 같은 StudentDetailView →
// 상세 화면 수정은 StudentDetailView 한 곳에서만 한다.
//
// document.body 로 포털한다: 홈(.tadmin)처럼 자기 CSS를 스코핑한 화면 안에서 열려도
// 그 스코프 규칙(.tadmin .badge / .card / .btn / ul …)이 상세 화면에 새지 않게 하기 위해서다.
// ─────────────────────────────────────────────────────────────────────────

interface StudentDetailModalProps {
  studentId: string
  /** 열람자 역할 — 탭 노출 범위와 편집 권한을 정한다 */
  role: StaffRole
  onClose: () => void
}

export default function StudentDetailModal({ studentId, role, onClose }: StudentDetailModalProps) {
  return createPortal(
    <AdminModal title="학생 상세 정보" size="xl" onClose={onClose}>
      <StudentDetailView studentId={studentId} role={role} />
    </AdminModal>,
    document.body,
  )
}
