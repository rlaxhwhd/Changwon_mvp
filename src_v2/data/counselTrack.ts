// ─────────────────────────────────────────────────────────────────────────
// 진로·취업 상담 트랙 (단일 소스)
//
// 「진로·취업 상담」이라는 한 이름 아래 성격이 다른 두 상담이 있다.
//
//   general — CARE 7+ 파이프라인 **밖**. 진단 없이 누구나 신청한다.
//             유형을 확정하지도, 로드맵을 만들지도 않는다.
//   care7   — 파이프라인 **안**(PROCESS.md §1 ②). 진단 2종을 마쳐야 열린다.
//             상담을 통해 유형을 확정하고 로드맵을 만든다.
//
// 게이팅(PROCESS.md §2)이 무는 것은 care7 하나뿐이다. 상담센터 자체는 언제나
// 열려 있고, 잠기는 것은 진로·취업 상담 화면 안의 「CARE 7+ 연계 상담」 카드다.
//
// 두 트랙은 같은 상담사·같은 달력·같은 1시간 슬롯을 공유한다 — 상담사도 상담실도
// 하나다. 트랙별로 달력을 쪼개면 슬롯 충돌 관리만 두 배가 되고 얻는 것이 없다.
// ─────────────────────────────────────────────────────────────────────────

/** 진로·취업 상담의 트랙. 상담 유형(진로취업·심리·교수)과는 다른 축이다. */
export type CareTrack = 'general' | 'care7'

/**
 * 트랙 표시명. 교직원과 학생이 같은 값을 다른 길이로 부른다 —
 * 접수함 배지에는 짧게, 학생 화면 카드 제목에는 길게.
 * 화면에 트랙 문자열을 하드코딩하지 않는다.
 */
export const CARE_TRACK_LABEL: Record<CareTrack, { staff: string; student: string }> = {
  general: { staff: '일반', student: '일반 진로·취업 상담' },
  care7: { staff: 'CARE 7+ 연계', student: 'CARE 7+ 연계 상담' },
}

/**
 * 이 신청이 CARE 7+ 파이프라인에 속하는가.
 *
 * ★ 값이 없으면 care7 로 본다. careTrack 은 신설 필드라 기존 시드·런타임 레코드에
 *   없는데, 없는 것을 general 로 떨어뜨리면 이미 상담을 마친 학생의 로드맵·역량강화·
 *   취업지원이 한꺼번에 잠긴다. 신설 컬럼은 기존 행의 의미를 바꾸지 않는다.
 *
 * 로드맵 생성 권한도 이 판정을 쓴다 — 일반 상담에서는 로드맵을 만들지 않는다.
 */
export function isCare7(track: CareTrack | undefined): boolean {
  return track !== 'general'
}

// ── 상담 현황 요약 카드의 3갈래 ──────────────────────────────────────────
// 학생 라운지(/v2/lounge)와 교직원 학생 상세가 같은 공용 카드(StudentStatCards)를 쓴다.
// 세는 기준이 두 곳에서 갈리면 같은 학생의 숫자가 달라진다(2026-09-17: 라운지 1건 · 상세 3건).
// 갈래 판정과 라벨은 여기 한 곳에서만 정하고, 취소 건은 두 곳 모두 제외한다.

export type CounselBucket = 'general' | 'care7' | 'etc'

/** 카드 표시 순서가 곧 점 색 순서다(StudentStatCards.css nth-child). */
export const COUNSEL_BUCKET_ORDER: CounselBucket[] = ['general', 'care7', 'etc']
export const COUNSEL_BUCKET_LABEL: Record<CounselBucket, string> = {
  general: '진로취업 - 일반',
  care7: '진로취업 - CARE 7+',
  etc: '기타(심리·지도교수상담)',
}

/** 진로취업만 트랙으로 가르고, 심리·교수 상담은 기타로 묶는다. */
export function counselBucket(r: { type: string; careTrack?: CareTrack }): CounselBucket {
  if (r.type !== '진로취업') return 'etc'
  return isCare7(r.careTrack) ? 'care7' : 'general'
}

/** 요약 카드 channels 행 — 호출자가 취소 건을 뺀 목록을 넘긴다. */
export function counselBucketChannels(rows: { type: string; careTrack?: CareTrack }[]): { label: string; count: string }[] {
  return COUNSEL_BUCKET_ORDER.map(b => ({
    label: COUNSEL_BUCKET_LABEL[b],
    count: `${rows.filter(r => counselBucket(r) === b).length}건`,
  }))
}
