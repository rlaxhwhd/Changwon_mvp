# .ai/handoff/_schema.md — 핸드오프 폴더 계약

Claude와 Codex가 작업을 주고받는 **단위는 폴더 하나**다. 이 스키마가 그 폴더의 계약이다.

## 폴더명 규약

```
.ai/handoff/000X-{role}-{screen}/
```
- `000X` — 4자리 일련번호(0001, 0002 …). 순서·이력 추적용.
- `{role}` — `stu`(학생) · `counsel`(상담사) · `prof`(교수) · `admin`(관리자). **폴더명이 곧 디자인 레이어를 지정**한다(`counsel-*` → `src_admin/index.css` 레이어).
- `{screen}` — 화면 슬러그(`home`, `dashboard`, `roadmap-edit` …).

예: `0001-stu-home/`, `0002-counsel-dashboard/`

## 필수 파일 & 작성 주체

| 파일 | 작성 | 의미 |
|---|---|---|
| `image.png` | 사용자 → team-lead | 참조 UI 이미지 |
| `ui-spec.md` | **team-lead**(1단계) | "무엇을" — 프로젝트 맞춤 확정 기획 |
| `component-map.md` | **team-lead**(재사용) → **Codex**(신규 추가) | 컴포넌트 매핑 |
| `review.md` | **design-reviewer**(§4) + **content-reviewer**(§5) | 검수 판정 |

## `ui-spec.md` 스키마

```markdown
# {screen} — UI 스펙 (역할: {role})

## 라우트 / 진입
- PageId · 네비 위치(navConfig 기준 카테고리→항목)

## 내용 교정 (이미지 → 프로젝트)
- 이미지 원문 → 프로젝트 정정 (예: "회원가입" → "학생 등록", "admin" → "상담사")
- 이유

## 네비게이션
- 노출 항목 · 활성 상태 · 이동 경로

## 페이지 내용
- 섹션별 텍스트·버튼 라벨·카피 (프로젝트 확정본)

## 데이터 스키마 (JSON 동적 — 하드코딩 금지)
- interface 정의 + JSON 예시 + 로더/구독 방식(students.ts 패턴)

## 디자인 레이어
- base: DESIGN.md · 역할 레이어: {src_v2/DESIGN.md | src_admin/index.css}
- 쓸 토큰(색·타이포·카드) — frontend-design은 craft만
```

## `component-map.md` 스키마

```markdown
# {screen} — 컴포넌트 맵

## 재사용 (team-lead 작성)
| 화면 영역 | 기존 컴포넌트 | 경로 |
|---|---|---|
| 상단바 | TopHeader | src_v2/... |

## 신규 (Codex 추가)
| 컴포넌트 | 책임 | props(스키마) |
|---|---|---|
```

## `review.md` 스키마

```markdown
# {screen} — 리뷰

## 4단계: 디자인·유지보수 (design-reviewer)
- [PASS/REJECT] 디자인 토큰 drift — 근거(파일:라인)
- [PASS/REJECT] JSON 동적·하드코딩 — 근거
- [PASS/REJECT] 단일 소스 — 근거
- [PASS/REJECT] 컴포넌트 재사용 — 근거
- [PASS/REJECT] 코드 품질(tsc) — 근거
- 수정 지시:

## 5단계: 내용 정합성 (content-reviewer)
- [PASS/REJECT] 네비게이션 — 근거
- [PASS/REJECT] 버튼·텍스트 — 근거
- [PASS/REJECT] 용어 교정 반영 — 근거
- [PASS/REJECT] JSON 값 매핑 — 근거
- 수정 지시:
```

## 규칙

- 최종 코드만 실제 경로(`src_v2/`·`src_admin/`)에. 핸드오프 폴더는 **감사 추적**용으로 보존한다.
- 폴더는 지우지 않는다(부분 재실행·회귀 확인에 쓰인다).
