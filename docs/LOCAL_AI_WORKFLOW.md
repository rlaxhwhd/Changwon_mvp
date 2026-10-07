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

현재 CentOS는 과거의 부분 배포 이력 때문에 로컬 마이그레이션 110~113이 적용되지 않았다.
따라서 로컬 전체 마이그레이션 명령을 그대로 CentOS에서 실행하면 안 된다. 다음 배포에서는
해당 차이를 DB 복사본에서 검증하고 적용 범위를 명시해야 한다.
기존 `backend/Dockerfile.ai-company`는 선택 파일만 복사하는 부분 배포용이므로 새 수정 파일이
배포 이미지에 포함되는지도 확인한다. 테스트한 로컬 이미지와 회사용 이미지가 자동으로 같다고 간주하지 않는다.

실패 복구는 이전 애플리케이션 이미지 복귀를 우선한다. 사용자 활동이 추가된 DB에 과거 덤프를 덮어쓰지 않는다.

## 2026-10-02 로컬 구성 검증

- 관련 회귀 테스트 75개 통과, Docker 프런트엔드 빌드 통과.
- GPU LLM 모델 조회 200, 로컬 RAG 검색 200·근거 3건.
- 로컬 SearXNG 검색 200·결과 30건·Google/Bing/DuckDuckGo 응답 확인(약 1.0초).
- 로컬 라운지 실제 코멘트 생성 200·15.46초, RAG/모델 처리 15.37초.
- 본문 559자와 모델명·근거가 로컬 PostgreSQL에 저장됨을 별도로 확인.
- Chrome 새로고침 후 동일 본문 복원, 저장본 조회 200·31ms, 실패 요청과 콘솔 오류 없음.
- 이번 구성 작업에서 CentOS 서비스·DB 또는 GPU 서버 설정을 변경하지 않았다.
