import { useEffect, useRef } from 'react'

/**
 * Mouse-following neon trail rendered to a fullscreen canvas.
 * - Native cursor stays visible
 * - pointer-events: none, fixed overlay (z-index 9999)
 * - Color cycles through accent hues
 * - Hover on interactive elements boosts intensity (~60%)
 *
 * 전역 마운트 — App.tsx에서 한 번만 렌더링.
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
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
      // v2 범용: 버튼/링크/role=button → 인터랙티브로 간주
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

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'lighter' // additive blend → 네온 발광

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
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'screen',
      }}
    />
  )
}
