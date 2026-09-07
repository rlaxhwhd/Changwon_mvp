import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { getMainPopups, dismissPopupToday } from '../data/popups'
import './CareerPopup.css'

// ─────────────────────────────────────────────────────────────────────────
// 메인 POPUP — 시안 창원디자인시안작업/main.html 의 #careerPopup 이식.
//
// 시안 동작을 그대로 옮긴다:
//   · 「팝업 보기」를 눌러야 열린다 (자동으로 뜨지 않는다)
//   · 3장 노출 캐러셀(is-prev · is-active · is-next) · 4.8초 자동 전환
//   · 일시정지 토글 · 캐러셀에 마우스/포커스가 있으면 자동 전환 멈춤
//   · Esc 닫기 · ← → 이동
//   · 닫기 / 오늘 하루 열지 않기(localStorage)
//   · 열려 있는 동안 body 스크롤 잠금
//
// 슬라이드 목록은 data/popups.ts 가 준다 — 이 컴포넌트는 그리기만 한다.
// ─────────────────────────────────────────────────────────────────────────
const AUTO_MS = 4800

export default function CareerPopup() {
  const navigate = useNavigate()
  const slides = getMainPopups()
  const count = slides.length

  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  // 캐러셀 위에 마우스가 있거나 포커스가 들어와 있는 동안은 넘기지 않는다.
  const [hovering, setHovering] = useState(false)

  const openBtnRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const move = useCallback((direction: number) => {
    if (count === 0) return
    setIndex(current => (current + direction + count) % count)
  }, [count])

  // 자동 전환 — 열려 있고, 멈추지 않았고, 2장 이상일 때만 돈다.
  useEffect(() => {
    if (!open || paused || hovering || count < 2) return
    const timer = window.setInterval(() => move(1), AUTO_MS)
    return () => window.clearInterval(timer)
  }, [open, paused, hovering, count, move])

  // 열려 있는 동안 뒤 화면이 스크롤되지 않게 한다(시안 body.popup-open).
  useEffect(() => {
    if (!open) return
    document.body.classList.add('popup-open')
    return () => document.body.classList.remove('popup-open')
  }, [open])

  const close = useCallback((dismissToday: boolean) => {
    if (dismissToday) dismissPopupToday()
    setOpen(false)
    // 닫으면 포커스를 연 버튼으로 돌려준다 — 키보드 사용자가 자리를 잃지 않는다.
    window.setTimeout(() => openBtnRef.current?.focus({ preventScroll: true }), 260)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close, move])

  const handleOpen = () => {
    setIndex(0)
    setPaused(false)
    setOpen(true)
    // 열리자마자 닫기 버튼에 포커스 — 모달 안으로 초점을 들여놓는다.
    requestAnimationFrame(() => closeBtnRef.current?.focus())
  }

  /** 3장만 자리를 갖는다. 나머지는 투명하게 비켜 서 있다. */
  const slideClass = (i: number) => {
    if (i === index) return 'career-popup-slide is-active'
    if (count > 1 && i === (index - 1 + count) % count) return 'career-popup-slide is-prev'
    if (count > 1 && i === (index + 1) % count) return 'career-popup-slide is-next'
    return 'career-popup-slide'
  }

  if (count === 0) return null

  return (
    <>
      <section
        className="career-popup"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="careerPopupTitle"
      >
        <h2 className="career-popup-title" id="careerPopupTitle">POPUP</h2>

        <div className="career-popup-stage">
          <button
            className="career-popup-arrow career-popup-prev"
            type="button"
            aria-label="이전 팝업"
            onClick={() => move(-1)}
          >
            <Icon name="chevron-left" />
          </button>

          <div
            className="career-popup-carousel"
            aria-live="polite"
            aria-label={`전체 ${count}개 중 ${index + 1}번째 팝업`}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={() => setHovering(false)}
          >
            {slides.map((slide, i) => (
              <a
                key={slide.id}
                className={slideClass(i)}
                href={slide.href}
                onClick={event => {
                  event.preventDefault()
                  close(false)
                  navigate(slide.href)
                }}
              >
                <img src={slide.image} alt={slide.alt} />
              </a>
            ))}
          </div>

          <button
            className="career-popup-arrow career-popup-next"
            type="button"
            aria-label="다음 팝업"
            onClick={() => move(1)}
          >
            <Icon name="chevron-right" />
          </button>
        </div>

        <div className="career-popup-controls">
          <button
            className="career-popup-control icon-only"
            type="button"
            aria-label={paused ? '팝업 자동 전환 재생' : '팝업 자동 전환 일시정지'}
            aria-pressed={paused}
            onClick={() => setPaused(value => !value)}
          >
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
          <span className="career-popup-control count">팝업 {count}건</span>
          <button className="career-popup-control" type="button" ref={closeBtnRef} onClick={() => close(false)}>
            닫기 <Icon name="x" />
          </button>
          <button className="career-popup-control" type="button" onClick={() => close(true)}>
            오늘 하루 열지 않기 <Icon name="x" />
          </button>
        </div>
      </section>

      <div className="floating-control-stack">
        <button className="button popup-float-button" type="button" ref={openBtnRef} onClick={handleOpen}>
          <Icon name="layout" />팝업 보기
        </button>
      </div>
    </>
  )
}
