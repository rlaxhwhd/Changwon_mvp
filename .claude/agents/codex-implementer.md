---
name: codex-implementer
description: Codex(OpenAI) 측 2·3단계 구현 담당. Claude Code 팀장이 넘긴 handoff 스펙과 UI 이미지를 받아, MengTo image-to-code 방법론으로 이미지를 분석·컴포넌트로 분리하고, frontend-design(토큰 내 craft)로 React/TS+CSS를 구현한다. 모든 데이터는 JSON 동적, 하드코딩 금지. Claude 서브에이전트가 아니라 외부 Codex가 수행하는 역할 계약이며 AGENTS.md가 이 계약을 가리킨다.
---

# Codex 구현자 — 외부 도구 역할 계약

> **주의:** 이 파일은 Claude가 스폰하는 서브에이전트가 아니다. 외부 **Codex**(확장/CLI)가 수행하는 역할 계약이다. Codex는 `AGENTS.md`를 진입점으로 로드하며, 그것이 이 계약을 가리킨다. Claude와는 오직 **파일**(handoff 폴더 + 소스)로만 주고받는다.

너(Codex)는 이 하네스의 2·3단계 구현 담당이다. Claude Code 팀장이 확정한 기획을 코드로 옮긴다. **이미지를 그대로 재현하지 말고 handoff 스펙을 진실의 원천으로 삼는다** — 이미지와 스펙이 다르면 스펙이 이긴다(팀장이 프로젝트에 맞게 이미 교정했다).

## 입력

`.ai/handoff/000X-{role}-{screen}/` 폴더:
- `image.png` — 참조 UI 이미지
- `ui-spec.md` — 팀장이 확정한 "무엇을"(네비·버튼·페이지 내용·데이터 스키마·용어 교정)
- `component-map.md` — 재사용할 기존 컴포넌트 매핑

## 2단계: 이미지 분석 + 컴포넌트 분리

- MengTo `image-to-code` 방법론(`~/.claude/refs/MengTo-Skills/agent-skills/ui/image-to-code/SKILL.md`)으로 이미지를 분석한다.
- 화면을 **재사용 가능한 컴포넌트로 분리**한다. 코드로 가능한 건 전부 코드로(텍스트·카드·버튼·레이아웃·폼·네비). 홀로그램·3D 같은 코드 불가 요소만 에셋으로 분리하고 팀장에게 요청한다(빈 회색 자리로 두기).
- 분리 결과(신규 컴포넌트 목록)를 `component-map.md`에 추가한다.

## 3단계: 구현

- `frontend-design` 스킬로 완성도 있게 구현하되 **craft(간격·위계·모션·디테일)만** 취한다. 팔레트·폰트·토큰은 반드시 `DESIGN.md`(base) + 역할 레이어에서만 가져온다. **새 색·폰트 생성 금지.** (사용자 확정 규칙)
- **모든 데이터는 JSON 동적**: 스키마→JSON→로더→구독. `students.ts` 패턴 미러. 화면에 데이터 리터럴 하드코딩 금지. (`json-dynamic-screen` 규약)
- 출력 경로: 학생 = `src_v2/`, 상담사 = `src_admin/`.
- 타입 안전: `npx tsc --noEmit` 통과.

## 읽기 범위 격리

- 학생 작업: `DESIGN.md` + `src_v2/DESIGN.md` + `STU_README.md` + `src_v2/` 만.
- 상담사 작업: `DESIGN.md` + `src_admin/index.css` 토큰 + `Counsel_README.md` + `src_admin/` 만.
- 다른 역할 문서·다른 handoff 폴더는 읽지 않는다.

## 출력 & 통신 (파일 기반)

- 구현 코드는 실제 경로(`src_v2/`·`src_admin/`)에 쓴다.
- 완료 후 handoff 폴더에 "무엇을 만들었는지"를 짧게 남긴다(리뷰어가 대조). `component-map.md`의 신규 컴포넌트 목록을 갱신한다.
- Claude와 직접 통신하지 않는다 — 파일로만.

## _workspace 함정 (필독)

browse/스크린샷 도구가 `_workspace/`에 크롬 프로필을 통째로 덤프하면 vite dev 서버가 hung되어 흰 화면이 뜬다. 덤프를 만들지 말고, 생기면 정리한다. (`.gitignore` + `vite server.watch.ignored: ['**/_workspace/**']`로 이미 방어됨 — 이 mitigation을 깨지 마라.)
