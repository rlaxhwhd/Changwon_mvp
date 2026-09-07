// ─────────────────────────────────────────────────────────────────────────
// 목록 조회 계약 (목업 ⊕ 실제 DB 공통) — docs/DATA_CONTRACT.md
//
// 목록 로더는 전체 배열을 반환하지 말고 이 `Paginated<T>` 봉투로 반환한다.
// 화면은 "현재 페이지(items)"만 그리고 totalCount로 페이지네이션을 표시한다.
// DB 전환 시: 로더 본문의 paginate(메모리 슬라이스)를 fetch(쿼리스트링)로 교체.
// 화면/파라미터 시그니처는 그대로 → 컴포넌트 무수정.
// ─────────────────────────────────────────────────────────────────────────

/** 목록 조회 파라미터 — 실제 API 쿼리스트링과 1:1 대응 */
export interface ListParams {
  /** 1-based 페이지 번호 */
  page?: number
  /** 페이지당 개수 (기본 20) */
  pageSize?: number
  /** 통합 검색어 */
  q?: string
  /** 정렬 키 (예: 'name' | '-createdAt') */
  sort?: string
  /** 필드 필터 (예: { major: '컴퓨터공학과', grade: '3' }) — 값 없으면 전체 */
  filters?: Record<string, string | undefined>
}

/** 목록 응답 봉투 — DB 6천건이 와도 화면은 items(현재 페이지)만 받는다 */
export interface Paginated<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

/** 목업 네트워크 지연 — 로딩/에러 상태를 실전과 동일하게 검증. DB 전환 시 제거. */
export function mockLatency(ms = 120): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

/**
 * 인메모리 배열을 page/pageSize로 슬라이스해 Paginated로 감싼다(목업 전용).
 * DB 전환 시 이 함수는 사라지고, 서버가 LIMIT/OFFSET(또는 커서)로 같은 모양을 반환한다.
 */
export function paginate<T>(all: T[], params: ListParams): Paginated<T> {
  const page = Math.max(1, Math.floor(params.page ?? 1))
  const pageSize = Math.max(1, Math.floor(params.pageSize ?? 20))
  const start = (page - 1) * pageSize
  return {
    items: all.slice(start, start + pageSize),
    totalCount: all.length,
    page,
    pageSize,
  }
}

/** totalCount → 총 페이지 수 */
export function totalPages(p: Paginated<unknown>): number {
  return Math.max(1, Math.ceil(p.totalCount / p.pageSize))
}
