import { LuWrench } from 'react-icons/lu'
import EmptyState from '../components/EmptyState'

/** 이번 슬라이스에서 미구현인 nav 항목용 플레이스홀더. */
export default function NotReady({ title }: { title: string }) {
  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1 className="admin-page-title">{title}</h1>
          <p className="admin-page-desc">준비 중인 화면입니다.</p>
        </div>
      </header>
      <section className="admin-card">
        <EmptyState
          icon={LuWrench}
          title="준비 중"
          message="이 화면은 다음 업데이트에서 제공됩니다."
        />
      </section>
    </div>
  )
}
