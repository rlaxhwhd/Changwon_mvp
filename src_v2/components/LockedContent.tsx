import type { ReactNode } from 'react'
import './LockedContent.css'

/** Lounge의 블러 배경과 잠금 안내를 공유한다. 배경은 장식용이며 조작할 수 없다. */
export function LockedContent({ text, children, className = '' }: {
  text: string; children?: ReactNode; className?: string
}) {
  return <div className={`locked-content ${className}`} data-slot="locked-content">
    <div className="locked-content-background" aria-hidden="true" inert>
      {children ?? <div className="locked-content-bars"><i /><i /><i /></div>}
    </div>
    <p className="locked-content-message" role="status"><span aria-hidden="true">🔒</span><span>{text}</span></p>
  </div>
}
