// ─────────────────────────────────────────────────────────────────────────
// 스킬 사전 (단일소스) — 학생이 「스킬 등록」에서 고르는 후보 목록.
//
// 이력서 스킬 입력이 그렇듯 자유 입력을 막지 않는다. 여기 목록은 '추천 후보'이고,
// 화면은 datalist 로 붙여 준다 — 목록에 없는 스킬도 그대로 적을 수 있다.
// 고른 스킬이 사전에 있으면 분류를 자동으로 채운다(categoryOf).
//
// ⚠ 화면에 스킬명·분류 리터럴을 박지 말 것. 분류 <select> 의 선택지도
//   이 배열에서 파생한다(SKILL_CATEGORIES) — 두 곳이 어긋나면 저장은 됐는데
//   목록에 없는 분류가 생긴다.
//
// 분류는 IT 4종(언어·프레임워크·도구·DB)으로 시작한 기존 값을 그대로 이어받고,
// 다른 직종을 담을 분류를 뒤에 덧붙였다. 이미 저장된 학생 데이터의 분류가
// 사라지면 안 되므로 기존 4종은 이름을 바꾸지 않는다.
// ─────────────────────────────────────────────────────────────────────────

export interface CatalogSkill {
  name: string
  category: string
}

/** 표시 순서 — 분류 <select> 와 datalist 그룹 순서가 이 배열 순서를 따른다. */
export const SKILL_CATALOG: CatalogSkill[] = [
  // ── 프로그래밍 언어 ──
  { name: 'Java', category: '언어' },
  { name: 'Python', category: '언어' },
  { name: 'JavaScript', category: '언어' },
  { name: 'TypeScript', category: '언어' },
  { name: 'C / C++', category: '언어' },
  { name: 'C#', category: '언어' },
  { name: 'Kotlin', category: '언어' },
  { name: 'SQL', category: '언어' },

  // ── 프레임워크 ──
  { name: 'React', category: '프레임워크' },
  { name: 'Vue.js', category: '프레임워크' },
  { name: 'Spring Boot', category: '프레임워크' },
  { name: 'Node.js', category: '프레임워크' },
  { name: 'Django', category: '프레임워크' },
  { name: 'Flutter', category: '프레임워크' },

  // ── 데이터베이스 ──
  { name: 'MySQL', category: 'DB' },
  { name: 'Oracle', category: 'DB' },
  { name: 'MongoDB', category: 'DB' },

  // ── 개발·협업 도구 ──
  { name: 'Git / GitHub', category: '도구' },
  { name: 'Docker', category: '도구' },
  { name: 'AWS', category: '도구' },
  { name: 'Jira', category: '도구' },
  { name: 'Notion', category: '도구' },

  // ── 디자인 ──
  { name: 'Photoshop', category: '디자인' },
  { name: 'Illustrator', category: '디자인' },
  { name: 'Figma', category: '디자인' },
  { name: 'InDesign', category: '디자인' },
  { name: 'Adobe XD', category: '디자인' },
  { name: 'Blender', category: '디자인' },

  // ── 영상·사진 ──
  { name: 'Premiere Pro', category: '영상·사진' },
  { name: 'After Effects', category: '영상·사진' },
  { name: 'Final Cut Pro', category: '영상·사진' },
  { name: 'DaVinci Resolve', category: '영상·사진' },
  { name: '영상 촬영·조명', category: '영상·사진' },
  { name: '유튜브 채널 운영', category: '영상·사진' },

  // ── 문서·사무 ──
  { name: '엑셀 (Excel)', category: '문서·사무' },
  { name: '파워포인트 (PowerPoint)', category: '문서·사무' },
  { name: '워드 (Word)', category: '문서·사무' },
  { name: '한글 (HWP)', category: '문서·사무' },
  { name: 'Google Workspace', category: '문서·사무' },
  { name: 'ERP (더존)', category: '문서·사무' },

  // ── 회계·재무 ──
  { name: '전산회계', category: '회계·재무' },
  { name: '재무제표 분석', category: '회계·재무' },
  { name: '세무회계', category: '회계·재무' },
  { name: '원가관리', category: '회계·재무' },

  // ── 데이터·분석 ──
  { name: 'SPSS', category: '데이터·분석' },
  { name: 'R', category: '데이터·분석' },
  { name: 'Tableau', category: '데이터·분석' },
  { name: 'Power BI', category: '데이터·분석' },
  { name: 'Google Analytics', category: '데이터·분석' },

  // ── 마케팅·기획 ──
  { name: 'SNS 콘텐츠 마케팅', category: '마케팅·기획' },
  { name: '퍼포먼스 마케팅', category: '마케팅·기획' },
  { name: '검색광고 (SA)', category: '마케팅·기획' },
  { name: '카피라이팅', category: '마케팅·기획' },

  // ── 설계·제조 ──
  { name: 'AutoCAD', category: '설계·제조' },
  { name: 'SolidWorks', category: '설계·제조' },
  { name: 'CATIA', category: '설계·제조' },
  { name: 'MATLAB', category: '설계·제조' },
  { name: 'PLC 제어', category: '설계·제조' },

  // ── 어학·커뮤니케이션 ──
  { name: '비즈니스 영어', category: '어학' },
  { name: '영어 회화', category: '어학' },
  { name: '중국어 회화', category: '어학' },
  { name: '일본어 회화', category: '어학' },
]

/** 분류 목록 — 사전에서 파생한다(첫 등장 순서 유지). 화면에 다시 적지 않는다. */
export const SKILL_CATEGORIES: string[] = [...new Set(SKILL_CATALOG.map(s => s.category))]

/** 분류별로 묶은 사전 — 드롭다운의 <optgroup> 구성에 그대로 쓴다. */
export const SKILL_GROUPS: { category: string; names: string[] }[] = SKILL_CATEGORIES.map(
  category => ({
    category,
    names: SKILL_CATALOG.filter(skill => skill.category === category).map(skill => skill.name),
  }),
)

/** 드롭다운의 「직접 입력」 항목 값. 실제 스킬명과 겹치지 않게 사전 밖 문자열을 쓴다. */
export const SKILL_CUSTOM = '__custom__'

const BY_NAME = new Map(SKILL_CATALOG.map(skill => [skill.name.toLowerCase(), skill]))

/**
 * 스킬명 → 분류. 사전에 없으면 undefined —
 * 자유 입력이 허용되므로 '못 찾음'은 오류가 아니라 정상이다.
 */
export function categoryOf(name: string): string | undefined {
  return BY_NAME.get(name.trim().toLowerCase())?.category
}
