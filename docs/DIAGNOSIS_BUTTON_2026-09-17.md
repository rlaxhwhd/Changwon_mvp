# 핵심진단 CTA 디자인 — 최종 변경

## 현재 적용: 블루 GradientButton

- 최종 제공된 `button-1.tsx` 프롬프트에 맞춰 `src_v2/components/ui/button-1.tsx`와 CSS를 사용한다. 둥근 외곽, 밝은 내부, 블루 회전 그라데이션 테두리를 공용 핵심진단 CTA에 적용했다.
- 프롬프트에 정의가 없던 rotatingGradient는 CSS conic-gradient와 각도 애니메이션으로 구현했다. 기존 배너 크기에 맞췄으며 링크와 button의 기본 접근성을 사용한다.
- 아래의 자동 채움 구현은 제거되었다. 셰이더 의존성은 없고 추가 패키지는 설치하지 않았다.
- Docker 빌드·healthy 확인 완료. Chrome MCP 8080 Lounge에서 회전 각도 변화, canvas 0개, 가로 넘침·실패 요청·콘솔 오류 없음 확인. 진단 페이지에도 같은 공용 버튼이 표시된다.

## 이전 자동 채움 구현 (대체됨)

- 사용자 최종 요청에 따라 아래의 Liquid Metal 구현 및 `@paper-design/shaders` 의존성을 제거했다.
- 현재 `src_v2/components/ui/fill-button.tsx`는 흰색 배경의 공용 링크 버튼이다. 페이지 진입 시 민트·블루 배경이 아래에서 위로 0.9초 동안 한 번 채워지고 가득 찬 상태를 유지한다. hover·포커스로 애니메이션을 시작하거나 되돌리지 않는다.
- CSS transform 전환만 사용한다. canvas, WebGL, 애니메이션용 React 상태나 지속 실행 루프가 없다. 실제 메모리 사용량의 전후 비교는 측정하지 않았다.
- 모션 축소 설정에서는 전환 없이 색상을 표시한다. 포커스 테두리와 기존 링크 동작을 유지한다.
- 메인·Lounge·진단 목록에 공통 적용한다. AI 별 버튼은 없다.
- Docker 웹 빌드·배포 및 healthy 확인 완료. Chrome MCP로 8080 Lounge의 흰 배경, 아래 기준 scaleY(0→1) 채움, canvas 0개와 ccore 이동을 확인했다. 콘솔 오류 없음, API 29건 모두 200(30~395ms). 기존 큰 공통 목록 응답은 남아 있으며 추가 API 호출은 없다.

## 이전 구현 기록 (대체됨)

- 사용자 제공 21st.dev Liquid Metal 프롬프트를 `src_v2/components/ui/liquid-metal-button.tsx`에 통합했다. 민트·블루 배색이며 아이콘 전용 AI 별 버튼은 만들지 않았다.
- 기존 TypeScript·Tailwind 환경과 React Router를 사용한다. 별도 shadcn 초기화 없이 프로젝트 컴포넌트 경로 아래 `ui`에 둔다. 실제 필요한 의존성 `@paper-design/shaders`만 추가했다.
- 메인·Lounge·진단 목록의 공용 NextStepBanner에서 핵심진단 CTA에 동일하게 적용한다. 기존 ccore 이동 경로와 새 탭 열기 등 링크 동작을 유지한다.
- 셰이더는 필요할 때 불러오고 화면 해제 시 dispose한다. 모션 축소 설정 시 정지하며, WebGL 사용 불가 시 CSS 배경과 링크가 유지된다.
- Chrome MCP: 5178 미리보기에서 모바일·데스크톱 표시, 단일 버튼·단일 canvas, 포커스와 클릭 후 ccore 이동 확인. 모바일 가로 넘침 없음, 콘솔 오류 없음. 초기 API 29건 HTTP 200, 약 30~311ms. 신규 API 호출 없음.
- 기존 초기 로딩 프로그램 약 693KB·채용 약 733KB 응답은 남아 있다. 이번 변경에서 서버/DB 성능을 수정하지 않았다.
- `npm run build`, 변경 파일 `git diff --check` 통과. Docker 웹 서버 배포는 수행하지 않았다.
