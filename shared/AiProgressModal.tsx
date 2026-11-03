import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import './AiProgressModal.css'

export default function AiProgressModal({ open, title, progress, description = '작성이 완료되고 저장될 때까지 잠시 기다려 주세요.' }: {
  open: boolean; title: string; progress: string; description?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const element = dialog.current!
    if (open && !element.open) { element.showModal(); element.focus() }
    else if (!open && element.open) element.close()
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault(); event.stopPropagation(); element.focus()
      }
    }
    if (open) document.addEventListener('keydown', keepFocus, true)
    return () => {
      document.removeEventListener('keydown', keepFocus, true)
      if (element.open) element.close()
    }
  }, [open])

  // 네이티브 모달은 학생 상세 팝업 위에도 표시되고 배경 조작을 차단한다.
  // ESC가 부모 팝업까지 전달되어 진행 중인 패널이 사라지지 않도록 막는다.
  return createPortal(<dialog ref={dialog} className="dc-ai-progress" tabIndex={-1}
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-modal="true"
    onCancel={event => event.preventDefault()}
    onMouseDown={event => { event.preventDefault(); event.stopPropagation(); dialog.current?.focus() }}
    onClick={event => event.stopPropagation()}>
    <h2 id={`${id}-title`}>{title}</h2>
    <div className="dc-ai-progress-status" role="status" aria-live="polite">
      <span className="dc-ai-progress-spinner" aria-hidden="true" /><span>{progress || title}</span>
    </div>
    <p id={`${id}-description`}>{description}</p>
  </dialog>, document.body)
}
