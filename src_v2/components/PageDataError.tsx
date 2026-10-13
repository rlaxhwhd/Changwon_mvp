import { Link, useRevalidator } from 'react-router-dom'

/** Route data failures stay retryable instead of rendering an empty store. */
export default function PageDataError() {
  const revalidator = useRevalidator()
  return (
    <div role="alert">
      <p>화면에 필요한 정보를 불러오지 못했습니다.</p>
      <button type="button" disabled={revalidator.state === 'loading'} onClick={() => void revalidator.revalidate()}>
        {revalidator.state === 'loading' ? '다시 불러오는 중…' : '다시 시도'}
      </button>
      {' '}<Link to="/main">홈으로</Link>
    </div>
  )
}
