import { noticeRows } from '../../shared/communicationsStore'
export type NoticeCategory = 'PROGRAM' | 'CAREER' | 'SYSTEM'

export const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  PROGRAM: '프로그램',
  CAREER: '진로·취업',
  SYSTEM: '시스템',
}

/** 목록 필터 순서 — 화면이 이 순서를 그대로 그린다. */
export const NOTICE_CATEGORIES: NoticeCategory[] = ['PROGRAM', 'CAREER', 'SYSTEM']

export interface Notice {
  id: string
  category: NoticeCategory
  title: string
  summary: string
  /** 게시일 YYYY-MM-DD */
  postedAt: string
  /** 상단 고정 여부 */
  pinned?: boolean
  /** 본문 — 문단 배열 */
  body: string[]
}

const NOTICES = noticeRows

/** 공지 목록 — 고정 글이 먼저, 그 다음 최신순. */
export function getNotices(category?: NoticeCategory): Notice[] {
  return NOTICES
    .filter(notice => !category || notice.category === category)
    .sort((a, b) =>
      Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
      b.postedAt.localeCompare(a.postedAt),
    )
}

export function getNoticeById(id: string): Notice | undefined {
  return NOTICES.find(notice => notice.id === id)
}

/** 분류별 건수 — 필터 탭의 숫자. 화면에서 배열을 세지 않는다. */
export function countNoticesByCategory(): Record<'ALL' | NoticeCategory, number> {
  return {
    ALL: NOTICES.length,
    PROGRAM: NOTICES.filter(n => n.category === 'PROGRAM').length,
    CAREER: NOTICES.filter(n => n.category === 'CAREER').length,
    SYSTEM: NOTICES.filter(n => n.category === 'SYSTEM').length,
  }
}
