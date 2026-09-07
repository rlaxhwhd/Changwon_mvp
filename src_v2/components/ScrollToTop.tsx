import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// 라우팅에 따른 스크롤 위치를 한 곳에서 정한다.
// - 해시가 없으면: 페이지 이동이므로 항상 최상단에서 시작한다.
//   html 에 scroll-behavior: smooth 가 걸려 있어 behavior:'instant' 로 즉시 이동을 강제한다.
// - 해시가 있으면: 같은 페이지 안의 섹션(#id)으로 부드럽게 내려간다.
//   상단바가 sticky 라 그냥 맞추면 제목이 가려진다 → 여백은 CSS scroll-margin-top 이 준다
//   (index.css 의 `.v2-main [id]`). 여기서 픽셀을 계산하지 않는 이유는 상단바 높이가
//   화면 폭에 따라 달라지기 때문이다.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      return
    }

    // 라우트 전환 직후엔 대상 섹션이 아직 그려지기 전일 수 있어 한 프레임 미룬다.
    const frame = requestAnimationFrame(() => {
      const id = decodeURIComponent(hash.slice(1))
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])

  return null
}
