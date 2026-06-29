import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Mouse-following neon trail rendered to a fullscreen canvas.
 * - Native cursor stays visible
 * - pointer-events: none, fixed overlay (z-index 9999)
 * - Mounted via Portal to <body> to bypass any transformed ancestor
 *   (transform 부모가 있으면 fixed의 컨테이닝 블록이 그 부모가 되어 잘림)
 */

const ACCENT_HUES = [220, 188, 280] // royal blue → cyan → violet (v2 디자인 톤)

interface Point {
  x: number
  y: number
  life: number       // 0 → 1, decays each frame
  hue: number
  intensity: number  // 1 = normal, 1.6 = over interactive
}

export default function NeonTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      // resize 시점마다 최신 dpr 재계산 (다른 모니터로 옮기는 경우 대응)
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      // canvas.width 할당으로 모든 컨텍스트 상태가 초기화됨 → 즉시 전체 클리어
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const points: Point[] = []
    let hueIndex = 0
    let lastSwitch = 0
    let rafId = 0

    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - lastSwitch > 1500) {
        hueIndex = (hueIndex + 1) % ACCENT_HUES.length
        lastSwitch = now
      }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const overInteractive = !!el?.closest('button, a, [role="button"]')
      points.push({
        x: e.clientX,
        y: e.clientY,
        life: 1,
        hue: ACCENT_HUES[hueIndex],
        intensity: overInteractive ? 1.6 : 1,
      })
      if (points.length > 220) points.splice(0, points.length - 220)
    }
    window.addEventListener('mousemove', onMove)

    // 커서가 윈도우 밖으로 나가면 더 이상 새 점을 만들지 않음.
    // 기존 점들은 평소대로 life 감쇠로 자연스럽게 사라짐.
    const onLeave = () => {
      // 가장자리에 점이 쌓이는 케이스 방지를 위해 강제 감쇠 가속
      for (const p of points) p.life = Math.min(p.life, 0.3)
    }
    document.addEventListener('mouseleave', onLeave)

    const draw = () => {
      // device-space identity로 reset 후 전체 backing buffer를 명시적으로 클리어
      // (transform이 적용된 user-space 클리어로 인한 1px 잔존 가능성 차단)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 그리기는 dpr 스케일 user-space에서 진행
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i]
        p.life -= 0.025
        if (p.life <= 0) {
          points.splice(i, 1)
          continue
        }
        const radius = 14 * p.life * p.intensity
        const alpha = 0.42 * p.life * p.intensity
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 65%, ${alpha})`)
        grad.addColorStop(0.5, `hsla(${p.hue}, 100%, 55%, ${alpha * 0.5})`)
        grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafId)
    }
  }, [mounted])

  if (!mounted) return null

  // body에 portal로 마운트 — transform 부모로 인한 fixed 클리핑 회피
  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'screen',
      }}
    />,
    document.body,
  )
}
