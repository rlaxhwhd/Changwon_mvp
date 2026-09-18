# Chrome DevTools MCP 연결 기록

2026-09-16, 현재 Windows 사용자 `njob` 환경에서 확인했다. 저장소 파일만 다른 PC로 복사하면 사용자 전역 MCP 설정까지 설치되지는 않는다.

## Codex

전역 `~/.codex/config.toml`에 아래 명령으로 등록했다. 기존 다른 설정은 유지했다.

```powershell
codex mcp add chrome-devtools -- cmd /c npx -y chrome-devtools-mcp@latest --headless --isolated --no-usage-statistics --no-performance-crux
codex mcp get chrome-devtools
```

네트워크·콘솔·성능 도구를 모두 제공하는 기본 도구 구성을 사용한다. Chrome은 창 없이 실행하며 세션별 임시 프로필을 사용한다. 사용 통계와 CrUX 외부 조회는 비활성화했다.

## Claude Code

`claude mcp list`에서 `plugin:ecc:chrome-devtools` 연결이 정상임을 확인했다. 기존 ECC 플러그인의 MCP를 사용하며 동일 서버를 중복 등록하지 않았다. 설정 JSON의 최상위 `mcpServers`만 검사하면 이 플러그인을 놓칠 수 있다.

## 연결 검증

- Node v24.15.0, 연결 당시 Chrome DevTools MCP v1.9.0.
- stdio JSON-RPC `initialize`, `notifications/initialized`, `tools/list` 성공.
- `list_pages`로 실제 Chrome 실행 확인.
- `list_network_requests`, `list_console_messages` 호출 성공. 해당 버전은 `pageId` 인자가 필수다.
- `http://127.0.0.1:5173` 탐색 결과 `net::ERR_CONNECTION_REFUSED`가 네트워크 도구에 정상적으로 표시됐다. 이 시점의 앱 서버는 응답하지 않았으므로 앱 기능·네트워크 정상 여부를 검증 완료한 것은 아니다.

MCP 설치와 현재 에이전트 세션에 도구가 노출되는 것은 별개다. 설정 변경 후에도 도구가 보이지 않으면 클라이언트 재연결 또는 새 세션에서 다시 확인한다. 현재 세션에서도 서버를 직접 실행하고 표준 MCP 클라이언트로 연결하는 방법으로 검증할 수 있다.

참고: [Chrome DevTools 공식 MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp), [Codex MCP 설정](https://developers.openai.com/codex/mcp/).
