# Graft: Codex / Claude Code 공통 코드 그래프

## 구성

- Graft `@nanonets/graft@0.18.0`, Docker 이미지 `dreamcatch-graft:0.18.0`.
- Windows 네이티브 npm 설치는 `tree-sitter-kotlin`의 C++ 빌드 도구 부재로 실패했다. 해당 설치는 제거하고 Node 22 Linux 컨테이너로 구성했다.
- Codex와 Claude Code의 MCP 이름은 `graft-changwon`. 동일한 체크아웃을 `/workspace`에 연결한다.
- Codex는 사용자 설정에 프로젝트 이름으로 등록한다. Claude는 해당 프로젝트의 local scope로 등록한다. 기존 Chrome 및 다른 MCP는 보존한다.
- 코드 구조 분석만 사용한다. 실행 컨테이너는 `--network none`, `DO_NOT_TRACK=1`로 동작한다. 외부 LLM이나 Trail Brain 연결은 구성하지 않는다.
- `graft/`, `.graft/`는 Git 제외 대상인 로컬 캐시다. 설정 스크립트·지침만 공유하고, 새 PC에서는 다시 설치·빌드한다.
- 분석 범위: `src_landing`, `src_v2`, `src_admin`, `shared`, `backend/app`, `backend/tests`. 범위는 빌드 지문에 저장되어 조회 시 갱신에도 적용된다.

## 설치 / 복구

Docker Desktop을 실행하고 프로젝트 루트에서:

```powershell
powershell -NoProfile -File tools/graft/setup.ps1
```

이미 이미지가 있으면 `-SkipImageBuild`를 붙인다. 프로젝트를 다른 경로로 옮겼을 때도 새 위치에서 실행해 MCP의 절대 경로를 갱신한다.
설치 스크립트는 이미지 빌드 → 그래프 생성 → 두 에이전트 MCP 등록 순으로 실행한다. 기존 다른 MCP와 앱/DB 컨테이너를 변경하지 않는다.

새 도구가 현재 대화에 보이지 않으면 Codex/Claude Code 세션을 새로 연다. 설정 등록과 현재 세션의 도구 노출은 별개다.

```powershell
codex mcp get graft-changwon
claude mcp get graft-changwon
```

## 사용

두 에이전트 모두 `AGENTS.md`와 `.claude/skills/graft/SKILL.md`의 탐색·재사용 지침을 따른다.
MCP는 관련 코드 검색, 파일 API, 호출 관계, 전체 검색, 저장소 지도, 최신성 확인 도구를 제공한다.
조회 시 구조 그래프를 갱신하므로 별도의 Windows 네이티브 CLI 및 자동 실행 훅을 설치하지 않는다.

현재 세션에 MCP 도구가 없으면 같은 이미지/그래프를 사용하는 CLI로 실행한다:

```powershell
powershell -NoProfile -File tools/graft/graft.ps1 check
powershell -NoProfile -File tools/graft/graft.ps1 ask "mission question selection"
powershell -NoProfile -File tools/graft/graft.ps1 skeleton shared/missions.ts
powershell -NoProfile -File tools/graft/graft.ps1 callers missionError
```

결과의 상대 경로는 프로젝트 루트 기준이다. `/workspace`로 표시된 경로는 이 PC의 프로젝트 경로로 바꿔 읽는다.
CLI의 `--help`로 추가 옵션을 확인할 수 있다.

## 적용 범위와 한계

Graft는 기존 함수와 사용처를 찾아 공통 모듈 재사용 및 수정 영향 분석을 돕는다. 자동 중복 제거 도구는 아니다.
프런트엔드 HTTP 요청과 Python API 사이의 관계, 동적 호출, SQL/DB 구조는 소스 및 계약을 직접 대조한다.
스킬·MD 규약은 기존 문서에서 읽으며, 코드 그래프가 문서의 우선순위나 업무 결정을 대체하지 않는다.
DB 리뷰·마이그레이션 스킬, Chrome MCP 검증과 작업 인계 기록도 계속 적용한다.

Windows에서 upstream `graft init`을 직접 실행하면 이 구성과 다른 네이티브 CLI용 훅/MCP 설정이 추가될 수 있다. 이 프로젝트는 `tools/graft/setup.ps1`로 관리한다.

## 설치 검증 기록 (2026-09-16)

- 버전: CLI 및 MCP `0.18.0` 확인.
- 349개 소스 파일을 파싱해 2,886개 노드와 7,402개 관계 생성. Python / TypeScript / TSX 분석 성공.
- Codex 등록 활성화 확인, Claude `mcp get graft-changwon`에서 `Connected` 확인.
- 표준 stdio MCP로 initialize, tools/list(6개 도구), 최신성 검사, 코드 검색, 파일 API, 호출자 조회를 실제 실행했다.
- `random_questions` 검색이 `backend/app/missions.py` 구현을 반환했다.
- `shared/missions.ts`의 API와 `missionError` 사용처 조회 성공. 관리자 `MissionManagement`, 학생 `TodayGrowthMission`, `GrowthMissionLog`의 사용처를 반환했다.
- 한 MCP 연결에서 코드 검색 약 2.5초, 파일 API 약 1.7초, 호출자 조회 약 1.7초였다. 초기 최신성 검사는 약 10초였다. 이 PC의 단일 측정이며 앱/API 성능 수치가 아니다.
- 구조 전용 구성에서 `check`는 의미 그래프에 대해 `NO GRAPH` / `meaning tier 0%`를 표시하면서 구조 그래프는 `graph check: OK`로 표시한다. 구조 그래프가 정상이라면 오류나 설치 실패가 아니며, 이 메시지만으로 `--deep`을 실행하지 않는다.
- 현재 Codex 대화에 새 MCP가 동적으로 노출되지는 않았다. 직접 MCP 호출로 검증했으며, 내장 도구 목록 갱신에는 새 세션이 필요할 수 있다.

## 제거

프로젝트 루트에서 `codex mcp remove graft-changwon`과 `claude mcp remove --scope local graft-changwon`을 실행하면 연결이 제거된다.
다른 MCP는 삭제하지 않는다. 이미지가 더 이상 필요 없으면 `docker image rm dreamcatch-graft:0.18.0`으로 제거한다.

공식 자료: [Graft](https://github.com/trailhq/Graft).
