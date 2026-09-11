// ─────────────────────────────────────────────────────────────────────────
// 메인 팝업(POPUP 캐러셀) — 정본은 서버 dc.main_popup(GET /popups). 부팅 때 적재하고
// 화면은 getMainPopups() 동기 셀렉터만 구독한다. 이미지는 public/ 절대 경로다.
// 팝업 CRUD 화면은 아직 없다 — 생기면 /system 아래에 서버 쓰기 API 로 붙인다.
// ─────────────────────────────────────────────────────────────────────────
import { api } from '../../shared/api'

export interface MainPopup {
  id: string
  /** public/ 기준 절대 경로 */
  image: string
  /** 이미지 대체 텍스트 — 팝업 내용을 그대로 읽어 준다 */
  alt: string
  /** 슬라이드를 눌렀을 때 갈 곳 (v2 라우터 경로) */
  href: string
}

let popups: MainPopup[] = []

/** 부팅 적재 — 서버가 노출 기간·활성 여부를 걸러 순서대로 준다. */
export async function loadMainPopups(): Promise<void> {
  popups = (await api<{ items: MainPopup[] }>('/popups')).items
}

/** 노출할 팝업 목록. 순서가 곧 캐러셀 순서다. */
export function getMainPopups(): MainPopup[] {
  return popups
}

// ── '오늘 하루 열지 않기' ──────────────────────────────────────────────
// 시안과 같은 키·같은 값(YYYY-MM-DD)을 쓴다.
//
// ⚠ 지금은 쓰기만 한다 — 읽는 쪽이 없다.
//   시안도 마찬가지다: 팝업은 「팝업 보기」로만 열리고, 여는 순간
//   openCareerPopup() 이 popup-dismissed-today 클래스를 걷어내므로
//   저장된 날짜가 실제로 무언가를 막은 적이 없다.
//   자동 노출(방문 시 자동으로 뜸)을 넣게 되면 그때 이 키를 읽는 판정을 여기 추가한다.
const DISMISS_KEY = 'dreamcatch-popup-dismissed-date'

/** 오늘 하루 열지 않기 — 날짜를 남긴다. */
export function dismissPopupToday(): void {
  const now = new Date()
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  try {
    localStorage.setItem(DISMISS_KEY, today)
  } catch {
    /* 사생활 보호 모드 등 localStorage 가 막힌 환경 — 이번 세션만 닫힌다 */
  }
}
