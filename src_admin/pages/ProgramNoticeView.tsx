import { Link, useParams } from 'react-router-dom'
import ProgramNotice from '../../src_v2/pages/growth/ProgramNotice'

export default function ProgramNoticeView() {
  const { id } = useParams<{ id: string }>()
  const programId = id ?? ''

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">학생 공개 공고 미리보기</h1>
          <p className="admin-page-desc">학생에게 노출되는 프로그램 공고 화면입니다.</p>
        </div>
        <div className="admin-head-actions">
          <Link to={`/programs/${programId}`} className="admin-btn admin-btn-ghost">관리 상세로 이동</Link>
        </div>
      </header>
      <ProgramNotice programId={programId} backTo="/programs" />
    </div>
  )
}
