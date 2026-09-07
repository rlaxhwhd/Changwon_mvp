# 드림캐치(DREAMCATCH) — 학생 포털 프로토타입 (v2)

> 국립창원대학교 역량개발관리시스템 **"드림캐치"** 의 **학생 화면** UI 프로토타입.
> AI가 길잡이 역할로 진단·피드백·로드맵을 생성하고, 레벨·퀘스트·랭킹 같은 **게임화 요소**로 학생의 지속 사용을 유도한다.
> 프론트엔드 전용 · 백엔드 없음 · 모든 데이터는 가능하면 json으로 동적이게 mock · 데스크톱 전용(min-width 1280px).
>
> _최종 갱신: 2026-07-09 · 실제 소스 기준 `src_v2/`_
> 학생화면을 디자인 할 때는 STU_DESIGN.md를 꼭 읽고 적용할것 

---

## 🎯 프로젝트 개요

| 항목 | 값 |
|---|---|
| 프로젝트명 | DREAMCATCH · 학생경력개발관리시스템 |
| 기관 | 국립창원대학교 |
| 유형 | 프론트엔드 프로토타입 (백엔드 없음, 전부 mock) |
| 활성 버전 | **v2** (`src_v2/`) — 진입 시 `/v2`로 리다이렉트 |
| 뷰포트 | 데스크톱 전용 (min-width 1280px) |
| 언어 | 한국어 UI |

> **v1은 폐기 예정(legacy).** `src_v1/`, `src/`, `v1.html`은 참고용으로만 남아 있으며 실제 서비스 화면이 아니다. 아래 문서는 전부 v2 기준이다.

---

## 🛠️ 기술 스택

- **React 19 + TypeScript 5.9 + Vite 8**
- **react-router-dom v7** — `createBrowserRouter`, `basename: '/v2'` (v1의 `useState` 스위치 라우팅은 폐기)
- **Chart.js + react-chartjs-2** — 레이더/바/라인 차트
- **three + @react-three/fiber + @react-three/drei** — 3D 씬(로드맵/스킬트리 비주얼)
- **framer-motion** — 페이지·요소 애니메이션
- **Tailwind CSS v4**(`@tailwindcss/vite`) + **컴포넌트별 `*.css`** + `src_v2/index.css`
- **liquid-glass-react** — 글래스 이펙트
- **Font Awesome 7** 아이콘, **Noto Sans KR** 폰트

---

## 🚪 진입 구조 (멀티 SPA)

```
index.html  ──(meta refresh)──▶  /v2
                                   │
   vite.config.ts multi-spa-fallback: '/v2*' → v2.html
                                   │
                            src_v2/main.tsx  ──▶  App.tsx (RouterProvider)
```

- `v2.html` → `src_v2` (실제 학생 화면)
- `v1.html` → `src_v1` (구버전, 폐기 예정)
- 빌드 시 3개 엔트리(`main`, `v1`, `v2`)를 rollup input으로 함께 번들
- Vercel 배포 시 SPA 리라이트 필요 (`vercel.json`)

---

## 🧭 상단 네비게이션 (7개 카테고리)

`src_v2/components/navConfig.ts`가 네비게이션 단일 소스. GNB(상단) + SectionSidebar(좌측)가 이 설정을 공유한다.

**순서:** AI 커리어 라운지 → 진단센터 → 상담센터 → 진로취업 로드맵 → 내 성장 → 취업지원 → 마이페이지

---

## 🗺️ 사이트맵 (실제 라우트 · `src_v2/App.tsx`)

### `/` — Landing (레이아웃 없음)
랜딩/로그인 진입. 이후 모든 페이지는 `Layout`(GNB + SectionSidebar) 안에서 렌더.
`/main` — Main (메인 대시보드).

### ① AI 커리어 라운지 — `/lounge`
진단·역량·학점·자격증·상담내역을 AI가 종합 평가한 통합 대시보드. **해시 기반 6개 서브탭:**
`#report` 종합 분석 리포트 · `#competency` 역량 비교 분석 · `#tests` 진단검사 결과 · `#counsel` 상담 내역 · `#toeic` TOEIC 학습 분석 · `#roadmap` AI 액션 로드맵

### ② 진단센터 — `/diagnosis`
| 라우트 | 페이지 | 내용 |
|---|---|---|
| `/diagnosis/employment` | DiagnosisResult | 진단검사 결과 (7모듈 M1~M7 진행/결과) |
| `/diagnosis/employment/:testId` | DiagnosisResultDetail | 모듈별 상세 결과지 |

### ③ 상담센터 — `/counsel`
| 라우트 | 페이지 | 내용 |
|---|---|---|
| `/counsel/career` | CareerCounsel | 진로취업상담 신청 |
| `/counsel/psych` | PsychCounsel | 심리상담 신청 |
| `/counsel/professor` | ProfessorCounsel | 지도교수상담 신청 (본인 학과 교수) |
| `/counsel/record` | CounselStatus | 상담 현황 (기록·코멘트) |

### ④ 진로취업 로드맵 — `/roadmap`
| 라우트 | 페이지 | 내용 |
|---|---|---|
| `/roadmap/ai` | AiRoadmap | AI 진로로드맵 (단·중·장기, 우선순위, 역량 GAP) |
| `/roadmap/skill-tree` | SkillTree | AI 직무 로드맵 / 스킬트리 (수강과목 기반 직무 적합도) |
| `/roadmap/final` | FinalRoadmap | 최종 로드맵 (시나리오·분기별 마일스톤) |

### ⑤ 내 성장 — `/growth` (게임화 영역)
| 라우트 | 페이지 | 내용 |
|---|---|---|
| `/growth` | GrowthHome | 홈대시보드 (레벨·퀘스트 진행) |
| `/growth/roadmap-status` | RoadmapStatus | 로드맵 진행 현황 |
| `/growth/program` · `/growth/program/:id` | ProgramApply · ProgramDetail | 비교과프로그램 신청 (AI 추천) |
| `/growth/quest` | QuestBoard | 퀘스트보드 (일·주·학기 퀘스트, 학과/학과내 랭킹) |
| `/growth/mission` | TodayGrowthMission | 오늘의 성장퀘스트 |
| `/growth/mission-log` | GrowthMissionLog | 일일퀘스트 기록노트 |
| `/growth/journal` · `/journal/new` · `/journal/:entryId/edit` | GrowthJournal · GrowthJournalForm | 성장경험일지 (자소서 소재 축적) |

### ⑥ 취업지원 — `/jobs`
| 라우트 | 페이지 | 내용 |
|---|---|---|
| `/jobs` | JobSupport | 채용공고 목록 |
| `/jobs/:id` | JobDetail | 채용공고 상세 |
| `/jobs/joblist` | AiJobs | AI 맞춤채용 (스펙 기반 기업 추천) |
| `/jobs/home` | JobsHome | AI 자소서/면접 허브 |
| `/jobs/home/resume` | AiResume | AI 자소서 생성 |
| `/jobs/home/consulting` | AiConsulting | AI 컨설팅(첨삭) |

### ⑦ 마이페이지 — `/mypage`
| 라우트 | 페이지 | 내용 |
|---|---|---|
| `/mypage/portfolio` | Portfolio | 포트폴리오 (스킬·자격증·어학·자소서·이력서·프로젝트) |
| `/mypage/programs` | MyPrograms | 비교과프로그램 신청 현황 |
| `/mypage/attendance` | Attendance | 출석 기록 (일일미션 TOEIC 10단어 정·오답) |

### 🔁 하위 호환 리다이렉트
URL·즐겨찾기 유지를 위해 구 경로는 신 경로로 매핑:
`/roadmap/jobs → /jobs/joblist` · `/roadmap/resume → /jobs/home` · `/growth/skill-tree → /roadmap/skill-tree` · `/mypage/counsel → /counsel/record` · `/mypage/mission → /growth/mission-log` · `/diagnosis/result → /diagnosis/employment`

---

## 🧩 공통 컴포넌트 (`src_v2/components/`)

| 컴포넌트 | 역할 |
|---|---|
| `Layout` | GNB(상단) + SectionSidebar(좌측) + 콘텐츠 셸 |
| `GNB` | 상단 글로벌 네비게이션 바 |
| `SectionSidebar` / `GrowthSidebar` | 좌측 섹션별 서브 메뉴 |
| `navConfig.ts` | 네비게이션 트리 단일 소스 + 경로 매칭 헬퍼 |
| `StudentSwitcher` | 데모용 학생 전환 (localStorage 저장 후 리로드) |
| `Modal` | 공통 모달 |
| `Toast` + `hooks/useToast` | 토스트 알림 |
| `CustomCursor` / `NeonTrail` | 커스텀 마우스 커서 + 네온 트레일 효과 |
| `ScrollToTop` | 라우트 이동 시 스크롤 상단 복귀 |
| `IapSummaryBanner` | IAP 유형 요약 배너 |
| `CRAReport` | CRA 진로준비도 결과표 |
| `CounselConsentModal` / `CounselReserveModal` / `ProgramApplyModal` | 상담 동의·예약, 프로그램 신청 모달 |

---

## 👤 학생 Mock 데이터

프로토타입은 백엔드 대신 **학생별 JSON**을 단일 소스로 사용한다 (`src_v2/data/students.ts` + `data/students/*.json`).
`StudentSwitcher`로 학생을 바꾸면 `localStorage`(`dc_active_student`)에 저장 후 **페이지를 리로드**해 모든 화면에 반영된다. 현재 2명 등록:

| | 김채원 (기본) | 김창원 |
|---|---|---|
| 학과 | 컴퓨터공학과 | 경영학과 |
| 학년 | 3학년 | 4학년 |
| GPA | 4.3 | 3.7 |
| 어학 | TOEIC 550 | — |
| 학생 유형 | 역량성장형 (R3 성장형) | 취업준비형 (R4 취업실전형) |
| 목표 | 넥슨코리아 · IT PM | 아모레퍼시픽 · 브랜드 마케터 |

- `lib/scoring.ts` — 9개 raw 입력(`scoreInputs`)으로 점수를 계산.
- 각 학생 JSON은 로드맵 단계(phases), 역량 GAP, AI 추천, 취업예측, 최종 로드맵 데이터를 모두 포함.

---

## 🔬 진단·로드맵 프로세스 (`src_v2/data/careerProcess.ts` — 단일 소스)

국립창원대 핵심 프로세스(CARE+7 / SMART)를 보존하며 AI·데이터·게임화를 확장한 흐름.
**원리: 검사가 1차 자동 산출 → 상담사·AI가 확정·보정.** 검사는 단계별 분할 실시.

### 진단 7모듈 (M1~M7)
| 모듈 | 도구 | 단계 | 결정 항목 |
|---|---|---|---|
| M1 | 유형분류 검사 (39문항) | 1 유형진단 | 학생 6유형 분류 |
| M2 | 자기이해 검사 | 1 자기이해 | 흥미·가치·강점·성향 |
| M3 | CARES 진로인식검사 (153문항) | 3 로드맵 | IAP 유형·직무역량 모듈 |
| M4 | KVCT 직무역량 + E-DISC (329+24) | 4 역량강화 | 직무군 매칭·기업연계 우선순위 |
| M5 | SPRINT Ⅰ (94문항) | 4 역량강화 | 역량강화 프로그램 추천 |
| M6 | SPRINT Ⅱ (98문항) | 5 취업지원 | 취업지원 프로그램·단계 |
| M7 | NEO 성격검사 (211문항) | 6 사후관리 | 집중관리·상담개입 강도 |

### 학생 6유형 → IAP 유형 매핑
| 학생 6유형 | IAP | 주 학년 | 트랙 |
|---|---|---|---|
| 진로미탐색형 | R1 탐색형 | 1·2학년 | 표준 |
| 진로설정형 | R2 설계형 | 2·3학년 | 표준 |
| 역량성장형 | R3 성장형 | 3학년 | 표준 |
| 취업준비형 | R4 취업실전형 | 4학년 | 표준 |
| 취약관리형 | R5 회복형 | 전학년 | **집중관리** |
| 우수인재형 | R6 취업완성형 | 3·4학년 | **가속** |

> 상세 프로세스·근거는 `src_v2/CLAUDE.md`(기획 원문)와 `setup.xlsx`, `2. 모듈별 진단도구 모듈.xlsx` 참고.

---

## ⚙️ 개발 명령어

```bash
npm run dev        # Vite 개발 서버 (0.0.0.0) → http://localhost:5173/v2
npm run build      # tsc -b && vite build (타입체크 + 프로덕션 빌드)
npx tsc --noEmit   # 타입 체크만
npm run lint       # ESLint
```

---

## 📁 디렉터리 구조 (요약)

```
src_v2/
├── main.tsx              # 엔트리 (v2.html 로드)
├── App.tsx               # createBrowserRouter (basename '/v2') 전체 라우트
├── index.css             # 전역 스타일
├── components/           # Layout, GNB, Sidebar, Modal, Toast, navConfig …
├── pages/
│   ├── Landing.tsx / Main.tsx / AiLounge.tsx
│   ├── diagnosis/  counsel/  roadmap/  growth/  jobs/  mypage/
├── data/
│   ├── careerProcess.ts  # 진단 7모듈·6유형·IAP 단일 소스
│   ├── students.ts       # 학생 로더 + 활성 학생 스토어
│   └── students/*.json   # 학생별 mock 데이터
├── lib/scoring.ts        # 점수 계산식
├── hooks/                # useToast 등
└── types/index.ts
```

---

**핵심 원칙:** 네비게이션은 `navConfig.ts`, 진단 체계는 `careerProcess.ts`, 학생 데이터는 `students.ts`가 각각 **단일 소스**다. 새 데이터/메뉴는 이 세 곳을 기준으로 추가한다.
