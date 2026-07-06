import { useEffect, useRef } from 'react'
import './CustomCursor.css'

/**
 * 커스텀 커서 — 이미지가 마우스 좌표를 정확히 따라감.
 * 터치 디바이스에서는 자동으로 감춰짐.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    if (!dot) return

    const handleMove = (e: MouseEvent) => {
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    }

    const handleLeave = () => { dot.style.opacity = '0' }
    const handleEnter = () => { dot.style.opacity = '1' }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseleave', handleLeave)
    document.addEventListener('mouseenter', handleEnter)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseleave', handleLeave)
      document.removeEventListener('mouseenter', handleEnter)
    }
  }, [])

  return (
    <img
      ref={dotRef}
      className="cc-dot"
      src="/cursor.png"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
