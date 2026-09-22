import type { ReactNode } from 'react'

/** 폼/모달 하단: 보조 동작 다음 주 동작, 전체 열 너비의 우측 정렬. */
export default function AdminFormActions({ children }: { children: ReactNode }) {
  return <div className="admin-form-actions">{children}</div>
}
