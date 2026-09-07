// /v2 진입은 학생 포털 홈으로 리다이렉트한다.
// (로그인 유형 선택 화면은 루트 localhost:5173 으로 이관됨. 백업: _backup/v2-landing/)
import { Navigate } from 'react-router-dom'

export default function Landing() {
  return <Navigate to="/main" replace />
}
