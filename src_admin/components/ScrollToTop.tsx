import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { markNavigation } from '../../shared/studentCache'

// 라우트(페이지) 이동 시 항상 최상단에서 시작하도록 스크롤을 초기화한다.
// 상담사 포털은 window(document) 스크롤을 쓰므로 window.scrollTo로 리셋한다.
// (예: /counsel/requests 에서 스크롤 후 /counsel/session/:id 로 이동해도 맨 위부터 시작)
// 해시(#섹션) 이동은 각 페이지가 처리하므로 건너뛴다.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  // 화면 이동은 학생 상세 캐시의 재검증 시점이다 — 다른 사용자의 변경을 여기서 따라잡는다.
  useEffect(() => { markNavigation() }, [pathname])

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}
