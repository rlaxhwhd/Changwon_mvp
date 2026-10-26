import { Link, useRevalidator } from 'react-router-dom'

/** 화면 전용 자료를 못 받았을 때 — 빈 스토어로 그리지 않고 다시 시도하게 한다(src_v2 PageDataError 와 같은 규칙). */
export default function PageDataError() {
  const revalidator = useRevalidator()
  return (
    <div className="admin-page" role="alert">
      <p>화면에 필요한 정보를 불러오지 못했습니다.</p>
      <button type="button" className="admin-btn admin-btn-ghost" disabled={revalidator.state === 'loading'} onClick={() => void revalidator.revalidate()}>
        {revalidator.state === 'loading' ? '다시 불러오는 중…' : '다시 시도'}
      </button>
      {' '}<Link className="admin-btn admin-btn-ghost" to="/">홈으로</Link>
    </div>
  )
}
