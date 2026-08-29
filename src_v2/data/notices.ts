// ─────────────────────────────────────────────────────────────────────────
// 공지사항 단일 소스
//
// ⚠ 아직 하드코딩이다(요구사항). 메인 홈 공지 카드가 쓰던 시안 값을 여기로 모았다.
//   화면 두 곳(메인 카드 · /mypage/notices)이 같은 목록을 봐야 하므로 소스는 하나여야 한다.
//   DB 전환 시 이 모듈만 로더로 바꾸면 화면은 그대로 나간다.
//
// ★ 분류(category)는 한글 리터럴을 값으로 쓰지 않는다 — 코드+라벨로 나눈다(SPEC §7).
// ─────────────────────────────────────────────────────────────────────────

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

const NOTICES: Notice[] = [
  {
    id: 'ntc-2026-021',
    category: 'PROGRAM',
    title: '2026학년도 하반기 비교과 프로그램 참여 안내',
    summary: '역량별 추천 프로그램과 신청 일정을 확인해 주세요.',
    postedAt: '2026-08-19',
    pinned: true,
    body: [
      '2026학년도 하반기 비교과 프로그램 신청이 시작되었습니다.',
      '진단 결과로 산출된 나의 유형에 맞는 프로그램이 「비교과 프로그램 신청」 화면 상단에 추천으로 표시됩니다. 추천 프로그램은 로드맵의 IAP 실행 축에 자동으로 반영됩니다.',
      '신청 후 무단 불참 시 벌점이 부과되며, 누적 벌점에 따라 다음 학기 신청이 제한될 수 있습니다.',
    ],
  },
  {
    id: 'ntc-2026-020',
    category: 'CAREER',
    title: '취업전략센터 1:1 맞춤 상담 예약 오픈',
    summary: '목표 직무별 전문 컨설턴트와 상담할 수 있습니다.',
    postedAt: '2026-08-18',
    body: [
      '진로취업 상담 예약이 열렸습니다. 「상담센터 › 진로취업상담」에서 상담사와 날짜·시간을 선택해 신청하세요.',
      '상담 신청 전 필수진단(C-CORE) 응시가 필요합니다. 진단을 마치지 않은 경우 신청 화면에서 진단센터로 안내됩니다.',
      '상담에서 6유형이 최종 확정되며, 확정과 동시에 개인 로드맵이 생성됩니다.',
    ],
  },
  {
    id: 'ntc-2026-019',
    category: 'SYSTEM',
    title: 'AI 역량진단 결과 리포트 기능 업데이트',
    summary: '변화 추이와 추천 활동을 한 화면에서 확인하세요.',
    postedAt: '2026-08-14',
    body: [
      '진단 결과 리포트가 개편되었습니다. 회차별 변화 추이와 상담사 코멘트를 같은 화면에서 볼 수 있습니다.',
      '「진단센터 › 진단검사 결과」에서 완료한 검사를 선택하면 새 리포트가 열립니다.',
    ],
  },
  {
    id: 'ntc-2026-018',
    category: 'CAREER',
    title: '지역 우수기업 온라인 채용설명회 개최',
    summary: '기업 담당자에게 직무와 채용 정보를 직접 들어보세요.',
    postedAt: '2026-08-12',
    body: [
      '경남 지역 우수기업이 참여하는 온라인 채용설명회가 열립니다.',
      '참여 기업의 공고는 「취업지원 › 교내 채용공고」에서 확인할 수 있으며, 추천채용으로 등록된 공고는 사이트 안에서 바로 지원할 수 있습니다.',
    ],
  },
  {
    id: 'ntc-2026-017',
    category: 'PROGRAM',
    title: 'CARE+7 성장 포인트 운영 기준 안내',
    summary: '활동별 적립 기준과 활용 방법을 안내드립니다.',
    postedAt: '2026-08-08',
    body: [
      '성장 포인트(XP) 적립 기준이 정리되었습니다. 출석·퀘스트·비교과 수료·상담 완료가 적립 대상입니다.',
      '적립 현황과 레벨은 「내 성장 › 홈대시보드」에서 확인할 수 있습니다.',
    ],
  },
]

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
