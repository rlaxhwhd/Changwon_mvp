# DREAMCATCH · 마이그레이션 가이드

> 국립창원대학교 학생경력개발관리시스템 "DREAMCATCH" 프론트엔드 리디자인 프로젝트.
> 이 문서는 새 프로젝트(판타지 배경 컨셉)에서 처음부터 다시 만들 때 필요한 모든 컨텍스트를 담고 있습니다.

---

## 1. 프로젝트 개요

| 항목 | 값 |
|---|---|
| **프로젝트명** | DREAMCATCH · 학생경력개발관리시스템 |
| **기관** | 국립창원대학교 |
| **유형** | 프론트엔드 프로토타입 (백엔드 없음, 전부 mock 데이터) |
| **뷰포트** | 데스크톱 전용, min-width 1280px |
| **언어** | 한국어 UI  |

## 2. 기술 스택 (권장 이식)

```
React 19 + TypeScript 5.9 + Vite 8
react-router-dom (URL 기반 라우팅)
@react-three/fiber + @react-three/drei + three (3D 씬)
```

- 라우팅은 **반드시 react-router-dom** 사용. 기존 `useState` 기반 스위치 라우팅은 버림.
- Chart.js 미사용으로 전환 (기존 프로젝트는 사용했음). 필요 시 재도입.
- Font Awesome 6 CDN (`<link>` 방식).
- 한글 폰트: Noto Sans KR. 디스플레이/영문: 프로젝트 컨셉에 맞게 변경 (space 버전은 Orbitron, fantasy면 Cinzel/MedievalSharp 등).

## 3. 사이트맵 (전체 라우트)

**랜딩/로그인 (레이아웃 없음)**
- `/` — 랜딩 페이지 (히어로, CTA)
- `/login` — 로그인 (배경 이미지 `public/login.jpg` 사용)

**메인 (TopNav 레이아웃)**
- `/home` — 대시보드

**① 소개**
- `/intro/support` — 학생 진로취업지원체계
- `/intro/center` — 취업전략센터 소개
- `/intro/plus` — 대학일자리플러스센터 소개
- `/intro/location` — 찾아오시는 길
- `/intro/work` — 업무안내

**② 진단센터**
- `/diagnosis/career` — 진로취업진단 (9CORE·CARES 2종)
- `/diagnosis/personality` — 성격심리진단 (인적성·MBTI 2종)

**③ 전문상담신청**
- `/counsel/career` — 진로취업상담신청
- `/counsel/psych` — 심리상담
- `/counsel/prof` — 교수상담

**④ 역량개발센터**
- `/program/apply` — 프로그램 신청 (카드 그리드 + AI추천 필터)
- `/program/manage` — 경력개발 관리
- `/program/review` — 프로그램 후기

**⑤ 경력개발로드맵 (핵심 페이지)**
- `/roadmap` — AI진로로드맵 **(3D 인터랙티브 씬이 들어가는 메인 플래그십 페이지)**
- `/roadmap/prediction` — 취업예측분석
- `/roadmap/jobs` — AI맞춤채용추천
- `/roadmap/resume` — AI자소서/인터뷰

**⑥ AI커리어라운지**
- `/lounge` — 통합 피드/인사이트

**⑦ 취업지원**
- `/jobs/posting` — 채용공고
- `/jobs/worknet` — 워크넷 채용공고
- `/jobs/policy` — 청년고용정책

**⑧ 마이페이지**
- `/my/home` — 마이홈
- `/my/portfolio` — 포트폴리오관리
- `/my/programs` — 역량프로그램현황
- `/my/counsel` — 상담현황
- `/my/mileage` — 마일리지 현황
- `/my/evaluation` — AI종합평가

**총 라우트 수:** 33개 (랜딩/로그인 2 + 레이아웃 내 31)

## 4. TopNav 구조 (8개 카테고리)

드롭다운이 있는 그룹은 `children` 배열 사용, 단일 링크는 `path` 직접 지정:

```
소개 (5) → 진단센터 (2) → 전문상담신청 (3) → 역량개발센터 (3)
→ 경력개발로드맵 (4) → AI커리어라운지 (단일) → 취업지원 (3) → 마이페이지 (6)
```

---

## 5. 로드맵 페이지 컨셉 (핵심)

경력개발을 **"7단계 여정"**으로 시각화. 각 단계는 "스테이지" 또는 "챕터"로 표현.

**7단계 구조 (라벨은 컨셉에 맞게 변경):**

| # | Space 버전 이름 | Fantasy 예시 | 단계 의미 | 기본 상태 |
|---|---|---|---|---|
| 1 | GENESIS | AWAKENING (각성의 숲) | 진로 인식 | ✅ cleared |
| 2 | ORION GATE | CRYSTAL GATE (수정의 문) | 자기 탐색 | ✅ cleared |
| 3 | NEBULA OF SELF | MIRROR LAKE (거울호수) | 자기 이해 · 진단 | ⚡ active |
| 4 | ASTEROID OF ACTION | DRAGON VALLEY (용의 계곡) | 경험 축적 | 🔒 locked |
| 5 | TITAN SKILLS | IRON FORGE (강철 대장간) | 역량 강화 | 🔒 locked |
| 6 | NOVA LAUNCH | KNIGHT'S OATH (기사의 맹세) | 취업 준비 | 🔒 locked |
| 7 | STARFALL | CROWN CITADEL (왕관성) | 성공적 정착 | 🔒 locked |

**상호작용:**
- 3D 씬에서 각 스테이지를 클릭하면 하단 패널이 해당 스테이지 상세로 변경
- 활성 스테이지 주변에 캐릭터/마커가 공전 또는 부유 (우주선 → 마법사/용/봉화 등으로 교체)
- 미션 체크리스트 (4개): 진단검사 완료, 워크샵 참여, AI 진로 상담, 포트폴리오 작성
- 하단에 7개 카드 리스트로 전체 스테이지 요약

## 6. 디자인 시스템 — 판타지 컨셉 가이드

### 6.1 컬러 팔레트 제안 (판타지 버전)

| 용도 | Space 버전 | Fantasy 제안 |
|---|---|---|
| 배경 (void) | `#03040d` (우주 검정) | `#0c0a1f` (마법의 밤) 또는 `#1a0f0a` (고대 양피지) |
| 패널 배경 | `rgba(14, 18, 42, 0.65)` | `rgba(30, 20, 15, 0.78)` (어두운 가죽) |
| 텍스트 주 | `#e8ecff` | `#f4ecd8` (양피지) |
| 텍스트 보조 | `#a6afd6` | `#c9a876` (빛바랜 금) |
| 강조 1 | `#55e6ff` (cyan) | `#ffd166` (황금) |
| 강조 2 | `#9b6bff` (violet) | `#b83b3b` (드래곤 레드) |
| 강조 3 | `#ff5fd2` (magenta) | `#5d8b5a` (마법 에메랄드) |
| 성공 | `#5dffb2` | `#7fbf7f` (숲 녹색) |

### 6.2 그라디언트 제안

- **메인 그라디언트** (Space의 aurora 대체):
  `linear-gradient(135deg, #ffd166 0%, #b83b3b 50%, #8b4513 100%)` (황금 → 불꽃 → 가죽)
- **카드 그라디언트**:
  `linear-gradient(145deg, rgba(50, 30, 20, 0.7), rgba(20, 10, 5, 0.85))` (어두운 나무)

### 6.3 폰트 제안

- 디스플레이/헤더: **Cinzel** (로마네스크 세리프) 또는 **MedievalSharp**
- 본문/UI: **Crimson Text** (세리프) 또는 그대로 Noto Sans KR
- 한글: Noto Sans KR 유지

### 6.4 3D 배경 요소

기존 Space 버전은 `<Stars>`로 별 6000개 드리프팅. Fantasy에서는:
- **떠다니는 룬 파티클** (Points + 마법진 텍스처)
- **느리게 움직이는 구름/안개** (Fog + 플레인)
- **반짝이는 마법 가루** (Points + additive blending)
- **포인트라이트**: 황금/불꽃/에메랄드 3색

### 6.5 UI 요소 판타지화

- 버튼 → "양피지 스크롤 버튼" 또는 "금속 룬 버튼"
- 카드 → "마법서 페이지" 스타일 (테두리, 장식)
- 진행 바 → "마나 게이지" 스타일
- 태그 → "길드 엠블럼" 스타일
- 아이콘 → Font Awesome 계속 사용하되 판타지 친화 아이콘 선별 (wand-sparkles, dragon, hat-wizard, chess-rook, crown, scroll, shield, gem)

## 7. 페이지별 컴포넌트 패턴

### 7.1 공통 페이지 래퍼

```tsx
<div className="page-wrap">
  <PageHeader kicker="..." title="..." sub="..." />
  {/* 콘텐츠 */}
</div>
```

### 7.2 대시보드 패턴 (Home, MyHome, Lounge)

- 상단: 4개 **stat-card** 그리드 (아이콘 + label + value + trend)
- 하단: `.panel` 2개 또는 3개 그리드 (활성 미션, 진행도, 추천 등)

### 7.3 리스트 페이지 패턴 (프로그램, 채용, 상담내역)

- `.panel` 하나에 `.mission-item` 반복
- 각 아이템: 아이콘 + 타이틀/메타 + 상태 배지

### 7.4 카드 그리드 패턴 (프로그램 신청, 채용공고)

- `.grid-3` 또는 `.grid-2`
- 각 카드: 상태 인디케이터 + 제목 + 설명 + 메타 + CTA 버튼
- 태그는 우측 상단, AI추천 태그는 강조 스타일

### 7.5 폼 페이지 패턴 (상담 신청, 로그인)

- 중앙 정렬 카드 (max-width 720px 또는 440px)
- 2열 input 그리드
- 제출 버튼은 메인 그라디언트 + 풀폭

## 8. 주요 Mock 데이터

### 8.1 사용자

```ts
{
  name: '김드림',
  major: '경영학과',
  year: '3학년',
  currentStage: 3,
  totalStages: 7,
  mileage: 2840,
  programsCompleted: 14,
  counselingCount: 6,
  portfolios: 3,
  careerReadiness: 72,
}
```

### 8.2 홈 대시보드 4개 stat

- CURRENT STAGE: 3 / 7 (▲ 1 stage this month)
- MILEAGE POINTS: 2,840 (▲ +420 this week)
- MISSIONS CLEARED: 14 (▲ 3 active)
- CAREER READINESS: 72% (▲ +8% this semester)

### 8.3 프로그램 6개 (프로그램 신청 페이지)

1. 실전 모의면접 부트캠프 — [면접준비, 취업역량] · AI추천
2. AI 자기소개서 마스터클래스 — [자소서, AI활용] · AI추천
3. 데이터 분석 실무 프로젝트 — [IT역량, 실무]
4. 포트폴리오 제작 워크샵 — [포트폴리오] · 마감임박
5. 현직자 멘토링 Day — [네트워킹, 멘토링] · AI추천
6. PPT 디자인 강의 — [취업역량, 디자인]

### 8.4 진단검사 4종

- **9CORE** — 9코어 진로취업진단 · 120문항 · 30분
- **CARES** — 취업준비도 진단 · 90문항 · 25분
- **인적성** — 언어/수리/공간/문제해결 · 150문항 · 40분
- **MBTI** — 성격유형검사 · 60문항 · 15분
- 하단에 **AI 종합평가** CTA (4가지 통합 분석)

### 8.5 AI종합평가 결과

- 유형: "전략적 분석가 · THE STRATEGIC EXPLORER"
- TOP STRENGTH: 분석력 (9CORE 상위 5%)
- GROWTH AREA: 커뮤니케이션
- MATCH INDUSTRY: IT · 컨설팅 (적합도 92%)

### 8.6 채용공고 (샘플 5개)

NAVER(IT/대기업), 삼성전자(대기업), 현대모비스(지역/대기업), LG전자(인턴/대기업), 카카오(IT/대기업)

### 8.7 마일리지 히스토리

- 프로그램 수료 +300 (가장 많음)
- 진단 완료 +200
- 상담 참여 +100

---

## 9. 파일 구조 템플릿 (새 프로젝트 기준)

```
src/
├── main.tsx                # BrowserRouter 엔트리
├── App.tsx                 # 33개 라우트 정의
├── styles/
│   └── theme.css           # 판타지 테마 전체 CSS
├── scenes/
│   ├── FantasyBackground.tsx  # 전 페이지 공통 3D 배경
│   └── QuestScene.tsx         # 로드맵 7단계 3D 씬 (=기존 PlanetScene)
├── components/
│   ├── Layout.tsx          # TopNav + 배경 + 푸터
│   ├── TopNav.tsx          # 8개 카테고리 드롭다운
│   └── PageHeader.tsx      # 공통 페이지 헤더
└── pages/
    ├── Landing.tsx
    ├── Login.tsx
    ├── Home.tsx            # 대시보드
    ├── Roadmap.tsx         # 7단계 퀘스트 맵 (플래그십)
    ├── DiagnosisCenter.tsx # career/personality 2타입 처리
    ├── ProgramApply.tsx
    ├── GenericPage.tsx     # 단순 페이지 공용 컴포넌트
    └── subpages.tsx        # 나머지 20+개 페이지 통합
```

## 10. 빌드/개발 설정 체크리스트

- [ ] `package.json` scripts: `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`
- [ ] `tsconfig.app.json`: `"include": ["src"]`, `"strict": true`, `"noUnusedLocals": true`
- [ ] `vite.config.ts`: `@vitejs/plugin-react` 플러그인
- [ ] `public/login.jpg` 배치 (로그인 배경용, 이미 존재)
- [ ] `index.html`: 폰트 preconnect + Font Awesome CDN + title 설정
- [ ] Vercel 배포 시 SPA 리라이트 필요 (`vercel.json`):
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/" }]
  }
  ```

## 11. Space 버전에서 반드시 변경해야 할 것

| 항목 | Space | Fantasy |
|---|---|---|
| 랜딩 타이틀 | "DREAMCATCH · CAREER MISSION CONTROL" | "DREAMCATCH · 전설의 커리어 여정" (예시) |
| 랜딩 CTA | "MISSION START" | "여정 시작 / QUEST BEGIN" |
| 히어로 서브 | "우주여행" 비유 | "판타지 대륙/모험" 비유 |
| TopNav 로고 마크 | 🚀 rocket | 🏰 chess-rook 또는 ⚔️ dragon |
| 로드맵 제목 | "우주여행 커리어맵" | "퀘스트 여정도" |
| 로드맵 단계 이름 | GENESIS~STARFALL | AWAKENING~CROWN CITADEL |
| 3D 오브젝트 | 행성 (sphere) | 지형/성/마법진/용/대륙 조각 |
| 3D 이동체 | 우주선 (cone + Trail) | 마법사 캐릭터 / 드래곤 / 봉화 |
| 미션 상태 라벨 | CLEARED / IN MISSION / LOCKED | COMPLETE / IN QUEST / SEALED |
| 배지 텍스트 | MISSION, STAGE | QUEST, CHAPTER |
| 로그인 CTA | "LAUNCH MISSION" | "BEGIN QUEST" |
| 로그아웃 | "LOGOUT" | 그대로 유지 or "RETURN TO REALM" |

## 12. 유지해야 할 것 (컨셉 무관)

- 8개 카테고리 메뉴 구조 **변경 금지**
- 33개 라우트 경로 **변경 금지** (URL 구조 고정)
- 데스크톱 min-width 1280px 고정
- 한국어 본문 + 영문 kicker 혼합 스타일
- 4종 진단검사 (9CORE, CARES, 인적성, MBTI) + AI 종합평가 플로우
- 7단계 로드맵 구조
- 마일리지 시스템
- AI 추천 태그 (AI추천 태그가 달린 프로그램/채용 카드)

## 13. 마이그레이션 절차 (권장 순서)

1. 새 Vite + React + TS 프로젝트 생성 (`npm create vite@latest`)
2. 의존성 설치:
   ```bash
   npm install react-router-dom three @react-three/fiber @react-three/drei
   npm install -D @types/three
   ```
3. `public/login.jpg` 복사 (기존 파일 재사용)
4. `src/styles/theme.css` 작성 (판타지 팔레트 기준) — 본 문서 6절 참고
5. `main.tsx` + `App.tsx` 라우터 스켈레톤 작성 — 본 문서 3절 라우트 참고
6. `FantasyBackground.tsx` 작성 (전역 3D 배경)
7. `Layout.tsx` + `TopNav.tsx` + `PageHeader.tsx` 작성
8. `Landing.tsx` → `Login.tsx` → `Home.tsx` 순서로 메인 3개 구현
9. **`Roadmap.tsx` + `QuestScene.tsx` 집중 제작** (가장 공들일 페이지, 전체 데모의 핵심)
10. `DiagnosisCenter.tsx`, `ProgramApply.tsx` 작성
11. `GenericPage.tsx` + `subpages.tsx`로 나머지 20+개 페이지 일괄 처리
12. `tsc -b && vite build` 통과 확인
13. `npm run dev`로 전체 플로우 테스트

## 14. 참고 파일 (현재 프로젝트)

- 기존 v1 페이지 (참조용): `src_v1/pages/`
- Space 버전 완성본 (직전 버전): `src/`
- 이 마이그레이션 문서: `MIGRATION.md`

---

**핵심 원칙:** 사이트맵·라우트·데이터 구조는 고정, 비주얼 언어만 판타지로 전환.
