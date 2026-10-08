# 로컬 개발과 CentOS 배포

코드를 로컬에서 수정하고 로컬 검증을 통과한 뒤 CentOS7에 배포한다.
로컬 환경 구성 명령은 CentOS에 접속하거나 배포하지 않는다.

## 구성

| 구성 요소 | 로컬 검증 환경 |
|---|---|
| 웹·FastAPI·PostgreSQL | 로컬 Docker, 웹 `http://127.0.0.1:8080` |
| 생성 LLM | 기존 GPU 서버 `192.168.0.230:11435` |
| RAG·Qdrant·SearXNG | 로컬 Docker 전용 서비스·볼륨·인증키 |

생성 요청은 GPU 서버의 연산 자원을 공유하므로 운영 생성 요청과 겹치면 느려질 수 있다.
생성 결과는 요청한 환경의 PostgreSQL에 저장한다. 로컬 학생·결과가 CentOS DB에 저장되지 않는다.
RAG에는 저장소의 검토된 `deploy/rag/corpus.json`을 색인하며 학생 개인정보를 색인하지 않는다.
RAG·Qdrant·검색 서비스에는 호스트 공개 포트를 만들지 않는다.

## 기동·업데이트

첫 PC에서는 `npm run docker:bootstrap`으로 DB·기본 인증 파일을 준비한다.
`.env.docker.local`에 다음을 지정하면 AI 서비스를 함께 사용한다. 파일은 Git 제외 대상이다.

```ini
DC_LOCAL_AI_ENABLED=true
DC_LOCAL_LLM_API_URL=http://192.168.0.230:11435/v1/chat/completions
DC_LOCAL_LLM_MODEL=qwen3-32b-chat
```

```powershell
npm run docker:up
npm run docker:ps
npm run docker:logs
```

`docker:up`은 빌드 → DB 기동 → `_workspace/db-backups` 백업 → 마이그레이션 → 서비스 기동을 수행한다.
마이그레이션이 실패하면 새 API 기동 단계로 넘어가지 않는다. 시드는 다시 실행하지 않는다.
DB만 갱신하려면 `npm run docker:migrate`를 사용한다. `docker:down`은 볼륨을 삭제하지 않는다.
로컬 전용 인증키는 `deploy/secrets/*_local`에 자동 생성되며 Git에 넣지 않는다.

GPU 서버가 꺼져 있거나 사내망에 접속할 수 없으면 실제 생성은 실패할 수 있다.
이미 저장된 AI 코멘트는 로컬 DB에서 계속 조회할 수 있다.
외부 진단 API의 허용 IP 조건은 별개다. 로컬에 API 키를 복사하는 것만으로 호출이 허용되지 않으며,
현재 로컬 AI 설정은 HRTest 운영 인증키를 복사하거나 외부 검사 결과를 임의 생성하지 않는다.

## 변경 검증과 배포

1. 로컬 코드·새 마이그레이션을 작성한다. 이미 적용된 마이그레이션은 수정하지 않는다.
2. 격리 테스트 DB에서 관련 회귀 테스트를 실행한다. 예: backend 폴더에서
   `.venv/Scripts/python.exe scripts/run_regression.py -k 'ai_comment or chatbot or hrtest or roadmap_generator or empty_student_profile'`.
3. `npm run docker:up`으로 로컬 실행 환경을 갱신하고 Chrome에서 해당 학생·역할의 화면과 실제 API를 확인한다.
4. 실제 AI 변경은 생성·DB 저장·새로고침 복원·권한·실패 동작을 확인한다. 네트워크 시간과 모델 처리 시간을 구분한다.
5. 검증된 변경으로 배포 이미지를 준비한다. CentOS DB 백업과 적용 이력·스키마 호환성을 확인한 뒤 필요한 마이그레이션만 적용한다.
6. CentOS 환경 설정과 비밀을 유지하며 API·웹 등 해당 서비스만 교체하고 동일 동작을 재검증한다.

2026-10-08에 서버 DB 복사본에서 검증한 뒤 CentOS에 누락 마이그레이션 110~113을 적용했다.
서버와 로컬의 적용 이력은 001~118로 일치하며, 이전 운영 문서의 110~113 제외 지침은 해소됐다.
전체 백엔드 소스와 마이그레이션을 포함하는 `backend/Dockerfile.company`를 사용한다.
`backend/Dockerfile.ai-company`는 과거 부분 배포용이며 신규 배포에 사용하지 않는다.
CentOS 호환 런타임과 의존성도 확인하고, 회사용 이미지를 로컬 운영 DB 복사본에서 검증한다.

## 서버 기준으로 로컬 맞추기와 배포 일치 검증

- 사용자 확정: 서버를 업무 데이터의 기준으로 삼는다. 로컬 업무 데이터를 서버에 덮어쓰지 않는다.
- 새 기능 개발 중에는 로컬 코드·스키마가 먼저 바뀔 수 있다. 배포 완료 시에는 검증한 릴리스의
  코드·마이그레이션·스키마를 서버와 맞춘다. 서버의 접속 설정·비밀은 로컬에 복사하지 않는다.
- 서버 스냅샷을 로컬에 반영할 때는 기존 로컬 DB와 업로드 파일을 먼저 백업한다.
  서버 DB는 새 로컬 DB에 복원해 검증한 뒤 실행 DB로 전환한다. 시드를 다시 넣지 않는다.
  `dc.file_object`의 실제 업로드 파일도 함께 반영한다. 운영 데이터·덤프·파일은 Git에 넣지 않는다.
- 두 환경은 별도 DB이므로 이후 로그인·검사·신청·개발 작업으로 업무 데이터가 달라질 수 있다.
  데이터 일치는 서버 스냅샷 시점 기준이며 실시간 양방향 복제를 뜻하지 않는다.
- 스키마 소유자 권한과 해당 환경의 비밀 파일을 사용해 다음 읽기 전용 검증을 실행한다.
  출력에는 코드·스키마 해시와 테이블별 건수·해시만 포함되며 원문 데이터는 포함하지 않는다.

```powershell
# backend 디렉터리에서, DC_DB_*는 검사할 환경으로 지정한다.
.venv/Scripts/python.exe scripts/release_parity.py --output ../_workspace/server-release.json
.venv/Scripts/python.exe scripts/release_parity.py --reference ../_workspace/server-release.json
# 같은 서버 스냅샷을 복원한 직후 데이터까지 비교하려면 양쪽에 --data를 추가한다.
```

비교가 실패하면 코드·마이그레이션·스키마 중 어디가 다른지 해결한 뒤 배포 완료로 판단한다.
적용된 마이그레이션 파일을 수정하거나 이력을 지워 차이를 숨기지 않는다.
전체 테이블 해시는 운영 데이터 규모와 부하를 고려해 스냅샷 검증에 사용한다.

### 2026-10-08 일치 검증과 복구 기준

- 서버 API: `dreamcatch-api:parity-20261008`, 웹: `dreamcatch-web:lounge-ai-comment-20261007`.
  API에 전체 백엔드를 포함했고 110~113만 새로 적용했다. 다른 적용 파일의 체크섬 변경은 없었다.
- 새 격리 DB의 관련 회귀 테스트 54개 통과. 운영 복사본에서 프로그램 테스트 35개와
  고유 식별자를 사용하는 로그인 테스트 4개 통과. 회사용 API 이미지도 로컬 복사본에서 기동 검증했다.
- 서버 스냅샷을 복원한 로컬 실행 DB와 백엔드 63개 파일·마이그레이션 118개·스키마·
  144개 테이블 데이터 해시 일치. 업로드 파일 1,928개도 바이트 해시 일치.
  양쪽 실행 웹의 `v2.html`·`admin.html` 해시도 일치했다.
- Chrome MCP: 서버 학생 로그인 200(67ms), 프로그램 조회 200(165ms), 주간 일정 200(38ms).
  로컬에서 서버의 실제 Core 결과가 표시되고 5개 영역의 상세 표가 정상 동작했다.
  관리자 신규 프로그램 화면은 양쪽에서 담당자·신청 질문·시간 입력 5개·파일 입력 3개 확인.
  서버 관리자 API 29건 모두 200, 최대 214ms, 콘솔 오류·경고 없음.
  로컬 관리자 API 29건 모두 200, 최대 294ms, 콘솔 오류·경고 없음.
  등록·신청 등의 쓰기 검증은 격리 DB에서 수행했으며 운영에 검증 데이터를 넣지 않았다.
- 기존 큰 프로그램/채용 부팅 응답(약 1.1MB/0.73MB)과 진단 조회 중복은 이 배포에서 변경하지 않았다.
- 서버 백업: `/opt/dreamcatch/ai/parity-20261008/`의 `before-apply.dump`와 기존 Compose 파일.
  API 복구는 이미지를 `dreamcatch-api:student-profile-20261002`로 돌리고 API만 재기동한다.
  추가 스키마·담당자 연결은 보존하며, 새 업무 데이터 위에 과거 DB 전체를 복원하지 않는다.
- 이전 로컬 DB는 `dreamcatch_before_server_sync_20261008`로 보존했다.
  로컬 백업·서버 스냅샷·이전 업로드 파일은 `_workspace/parity-20261008/`에 보관한다.
  로컬 복구 시 API/web을 멈추고 보존한 DB와 파일을 전환한 뒤 같은 릴리스를 기동한다.

실패 복구는 이전 애플리케이션 이미지 복귀를 우선한다. 사용자 활동이 추가된 DB에 과거 덤프를 덮어쓰지 않는다.

## 2026-10-08 진단 결과 조회 후속 배포

- API·웹은 `dreamcatch-api:diagnosis-history-20261008`,
  `dreamcatch-web:diagnosis-history-20261008`로 갱신했다. 기존 회차 저장 구조를 사용하므로
  새 마이그레이션은 없으며 적용 이력 118건을 유지한다.
- 격리 DB 진단 회귀 41개, 그래프·수준 테스트 11개 통과. 로컬 Docker 빌드·백업·기동 성공.
  로컬과 배포 API의 코드 63개·마이그레이션 118개·스키마 해시가 일치하고,
  양쪽 실행 웹의 v2.html/admin.html 해시도 일치했다.
- Chrome 실제 서버: 저장 결과 조회 200/51ms(cached=true), 명시적 외부 재조회
  200/1169ms(cached=false, 새 회차 없음, 기존 결과 유지). 미응시 검사 조회는
  200/937ms, found=0 이후 미완료 alert와 목록 복귀를 확인했다. 콘솔 오류·경고 없음.
- 로컬 실제 결과 5영역 요약과 10항목 상세, 390px에서 가로 넘침 없음 및 14px/13px 유지.
  1·2회차 선택 전환은 로컬 브라우저에서만 주입한 검증 데이터로 확인하고 즉시 제거했다.
  실제 회차별 점수·중복 방지·외부 장애 시 저장본 조회·학생 분리는 격리 DB API 테스트로 검증했다.
  로컬 외부 키 미설정으로 새 결과 조회가 502인 경우에도 기존 결과가 유지됨을 확인했다.
- 기존 프로그램/채용 부팅 응답 약 1.1MB/0.73MB는 유지한다. 진단 DB 조회는 부팅 때와
  결과 페이지의 최신 이력 확인 때 각각 발생하지만 외부 조회는 저장본 유무/명시적 갱신으로 제한한다.
- 백업 `/opt/dreamcatch/ai/diagnosis-history-20261008/`: before.dump, Compose 원본,
  컨테이너 목록, release.tar, 코드/스키마 해시. release.tar SHA256:
  `4d54cac947e71b5c75c336637a38c5b2338675adf93600ef7f43376e51d3c00f`.
- 복구는 API를 `dreamcatch-api:parity-20261008`, 웹을
  `dreamcatch-web:lounge-ai-comment-20261007`로 되돌리고 두 서비스만 재기동한다.
  DB 구조 변경이 없으므로 DB 덤프 복원은 필요하지 않다.

## 2026-10-02 로컬 구성 검증

- 관련 회귀 테스트 75개 통과, Docker 프런트엔드 빌드 통과.
- GPU LLM 모델 조회 200, 로컬 RAG 검색 200·근거 3건.
- 로컬 SearXNG 검색 200·결과 30건·Google/Bing/DuckDuckGo 응답 확인(약 1.0초).
- 로컬 라운지 실제 코멘트 생성 200·15.46초, RAG/모델 처리 15.37초.
- 본문 559자와 모델명·근거가 로컬 PostgreSQL에 저장됨을 별도로 확인.
- Chrome 새로고침 후 동일 본문 복원, 저장본 조회 200·31ms, 실패 요청과 콘솔 오류 없음.
- 이번 구성 작업에서 CentOS 서비스·DB 또는 GPU 서버 설정을 변경하지 않았다.

## 2026-10-08 진단 디자인 변경 웹 배포

- Claude 커밋 `140b518`의 수준 배지 폭 통일과 Core 레이더 제목 제거를
  `dreamcatch-web:diagnosis-ui-polish-20261008`로 CentOS에 반영했다.
  사용자가 브라우저 화면 테스트를 하지 말라고 명시하여 해당 검증은 생략했다.
- 준비된 `web.tar`의 로컬·서버 SHA256은
  `858508e9c5d4b6eae795fa4e29b08bd168278077abf094b50c8ee09a8dc42e46`로 일치했다.
  서버 실행 `v2.html` SHA256은
  `876e7cef9081e3f504fd84c28d082026dc835de801a427f6fece9c98a958b07a`,
  `admin.html`은 `11ef3ceef60551e66e5f390afebc3e0349f4265dd28d1f041bac36567a2370da`로
  로컬 배포 이미지와 일치한다. Docker load 이후 이미지 ID는 환경 사이에 달랐으므로
  아카이브 및 실제 배포 파일 해시로 무결성을 확인했다.
- `/opt/dreamcatch/compose.yaml`의 웹 태그만 갱신하고 기존 `compose.chatbot.yaml`과 함께
  `up -d --no-deps web`으로 교체했다. 웹·API·DB 모두 healthy, 웹 `healthz`는 `ok`.
  API·DB 컨테이너 ID는 배포 전후 동일하다. API·DB 자료·마이그레이션 변경은 없다.
- 백업은 `/opt/dreamcatch/ai/diagnosis-ui-polish-20261008/`에 Compose 원본과 이전 웹 이미지,
  컨테이너 ID·HTML 해시·전송 아카이브를 보관했다.
  복구는 웹 태그를 `dreamcatch-web:diagnosis-history-20261008`로 되돌린 뒤
  `/opt/dreamcatch`에서 다음 명령으로 웹만 재기동한다.

  ```sh
  docker compose -f compose.yaml -f compose.chatbot.yaml up -d --no-deps web
  ```

브라우저에서 새 디자인이 표시되는지와 콘솔·실제 화면 API 동작은 사용자가 직접 확인한다.

### 결과표 수준 배지·헤더 후속 변경 (2026-10-08)

- `DiagnosisResultReport.css`에서 수준 배지를 68px 고정 폭으로 통일했다.
  작은 컨테이너(480px 이하)의 상세표에서는 모든 배지를 52px로 통일한다.
  매우낮음·매우높음까지 포함하며, `mid` 너비 규칙을 `th.mid`, `td.mid`로 한정해
  보통 배지에 열 너비가 적용되던 충돌을 제거했다.
- 표의 `thead th`는 배경 `#6548CF`, 글자 흰색이다. 본문의 영역 그룹 헤더는 기존 색을 유지한다.
  공유 진단 결과표에 적용하며 점수·수준 판정·API·DB 계약은 변경하지 않는다.
- 로컬 TypeScript 검사와 Vite 빌드 통과, 생성된 CSS의 고정 폭과 헤더 색 포함을 확인했다.
  로컬 웹을 갱신하고 서버 런타임을 유지하는 `dreamcatch-web:diagnosis-table-style-20261008`을 배포했다.
  아카이브 SHA256은 `af9d9a7ff958d85218f21656bcab3b7e21cb3eab87e4077879e49cc2ed919798`.
  서버 실행 `v2.html`은 `4b8872718b1d358d4cfcd36b2288703664c33b74c2adb5db10b09357f2958787`,
  `admin.html`은 `3c8616e7fae4e9980726c51644c465f8072581abad1e02c218353e1eb006d226`로
  로컬 배포 이미지와 일치한다.
- 백업 경로는 `/opt/dreamcatch/ai/diagnosis-table-style-20261008/`.
  복구는 웹 태그를 `dreamcatch-web:diagnosis-ui-polish-20261008`로 되돌리고 위 Compose 명령으로 웹만 재기동한다.
  사용자 요청에 따라 브라우저 화면 테스트는 수행하지 않았다.
