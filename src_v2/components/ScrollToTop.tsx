import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// 라우트(페이지) 이동 시 항상 최상단에서 시작하도록 스크롤을 초기화한다.
// - html에 scroll-behavior: smooth가 걸려 있어 behavior:'instant'로 즉시 이동 강제
// - 해시(#섹션) 이동은 각 페이지가 직접 처리하므로 건너뛴다(예: 라운지 서브탭)
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}
