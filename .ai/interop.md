# .ai/interop.md — Claude Code × Codex 협업 규약

드림캐치 프로젝트에서 **Claude Code(Opus/Fable)** 와 **Codex(OpenAI)** 가 역할을 나눠 화면을 만드는 방법을 정의한다.

## 근본 원리 (반드시 이해)

두 도구는 **메모리·컨텍스트·런타임을 공유하지 않는다. 유일한 소통 통로는 디스크의 파일이다.**

- **Claude Code**는 세션 시작 시 `CLAUDE.md`를 자동 로드한다.
- **Codex**는 `AGENTS.md`를 자동 로드한다(Codex 관례 진입점).
- 공유 문서(DESIGN.md 등)는 각자 진입 파일이 "이거 먼저 읽어라"로 가리켜 양쪽이 읽는다.
- 실제 작업 주고받기는 **`.ai/handoff/` 폴더**로만 한다.

## 역할 분담 (5단계)

| 단계 | 담당 | 도구 | 하는 일 | 산출 |
|---|---|---|---|---|
| 1 | team-lead | Claude(Fable) | 메모리·문서 읽고 이미지를 프로젝트에 맞게 교정, 네비·버튼·내용·스키마 확정 | `ui-spec.md`, `component-map.md`(재사용) |
| 2 | codex-implementer | **Codex** | MengTo image-to-code로 이미지 분석·컴포넌트 분리 | `component-map.md`(신규 추가) |
| 3 | codex-implementer | **Codex** | frontend-design(토큰 내 craft)로 구현, JSON 동적 | `src_v2/`·`src_admin/` 코드 |
| 4 | design-reviewer | Claude(Opus) | 코드+디자인토큰/유지보수 감사(drift·하드코딩) | `review.md` §4 |
| 5 | content-reviewer | Claude(Opus) | 기획 대비 내용 정합성(용어 교정 반영) | `review.md` §5 |

전체 워크플로우: `.claude/skills/dreamcatch-orchestrator/SKILL.md`.

## 읽기 범위 격리 (역할별 — 다른 역할 md는 건드리지 않는다)

| 작업 | 읽는 것 | 안 읽는 것 |
|---|---|---|
| **학생** 화면 | `DESIGN.md`(base) + `src_v2/DESIGN.md` + `STU_README.md` + `src_v2/` | 상담사 문서·`src_admin/` |
| **상담사** 포털 | `DESIGN.md`(base) + `src_admin/index.css`(색 토큰) + `Counsel_README.md` + `src_admin/` | 학생 문서·`src_v2/` |

> 디자인은 **레이어 구조**다. `DESIGN.md` = 공통 기반(간격·타이포·모션·기본 컴포넌트). 역할 레이어는 그 위에 팔레트·전용 컴포넌트만 얹는다.
> `design_stu.md`·`design_counsel.md`는 **아직 미생성**이다(3개 디자인 소스 감사 후 분리 예정). 그 전까지 각각 `src_v2/DESIGN.md`·`src_admin/index.css`를 역할 레이어로 취급한다.

## 하드룰

1. **JSON 동적 · 하드코딩 금지.** 모든 데이터는 스키마→JSON→로더→구독. students.ts 패턴 미러. (skill `json-dynamic-screen`)
2. **디자인 토큰 잠금.** `frontend-design`은 craft(간격·위계·모션·디테일)만. 팔레트·폰트·토큰 새로 만들기 금지. drift = 결함.
3. **이미지보다 스펙 우선.** 이미지는 레퍼런스일 뿐. 팀장이 교정한 `ui-spec.md`가 진실의 원천.

## Codex 바톤(핸드오프 실행 방법)

- **수동:** 사용자가 Codex 확장/CLI로 2·3단계 실행(AGENTS.md가 계약을 가리킴) → Claude가 4·5단계 검수.
- **자동(검증됨, 2026-07-14):** Claude가 `codex exec`로 직접 구동. 실제 사용 명령:
  ```bash
  codex exec -s workspace-write --color never -o <last-msg-file> - < <prompt-file>
  ```
  `-s workspace-write` = 워크스페이스 파일 쓰기 허용(승인 프롬프트 없음), `-o` = 최종 메시지만 파일로 캡처(전체 트랜스크립트 읽지 말 것), 프롬프트는 stdin(`-`)으로 전달. 프롬프트는 "AGENTS.md §0 → codex-implementer 계약 → handoff 폴더 읽고 갭만 수술적 구현, JSON 동적·토큰 잠금" 지시. 끝나면 `codex --version` 계열 CLI 확인. (gstack `/codex`는 review/consult 전용이라 구현 바톤엔 부적합.)
- 계약이 파일이라 수동·자동 흐름은 동일하다.

## _workspace 함정 (필독)

Codex/browse/스크린샷 도구가 `_workspace/`에 크롬 프로필을 통째로 덤프하면 vite dev 서버가 hung되어 흰 화면이 된다. `.gitignore` + `vite server.watch.ignored: ['**/_workspace/**']`로 방어돼 있다 — **이 mitigation을 깨지 말고**, 덤프가 쌓이면 정리한다.
