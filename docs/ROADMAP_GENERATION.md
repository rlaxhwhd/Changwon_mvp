# AI 로드맵 생성 설정

## 개발용 임시 로드맵 (2026-09-14 사용자 요청)

RAG·클라우드 LLM 구축 전에는 명시적으로 활성화한 `development-template` 제공자를 사용할 수 있다. 사용자 요청으로 작성한 직무별 예시이며 실제 RAG 검색이나 LLM 호출 결과가 아니다.

- 068은 `dc.development_roadmap_template`을 만든다. DB 소유자로 `python -m app.seed_roadmap_templates`를 실행하면 현재 직무사전·직무 스킬을 바탕으로 직무별 IAP·CORE·GROWTH 각 5칸 예시를 저장한다. 현재 로컬 직무 13개를 반입했다.
- 로컬 `backend/.env`에 `DC_ROADMAP_PROVIDER=development-template`을 설정하고 API를 재시작했다. 설정은 Git에 넣지 않는다. `production`에서는 이 제공자와 반입 명령을 차단한다. 운영 기본값은 계속 `disabled`이며 모델 호출 실패 시 임시 템플릿으로 자동 대체하지 않는다.
- 선택한 직무명과 일치하는 DB 템플릿만 사용한다. 템플릿이 없거나 형식이 잘못됐으면 생성하지 않는다.
- 기존 생성 API가 상담 근거·담당 범위·메뉴 권한·동시 변경을 검사하고 초안을 `dc.roadmap`, 3개 축을 `dc.roadmap_axis`, 15개 미완료 칸을 `dc.roadmap_item`에 저장한다. 실제 프로그램 연결·학생 이수·점수·진단 결과는 생성하지 않는다.
- `dc.ai_run.source_ref.kind=DEVELOPMENT_TEMPLATE`, `ragUsed=false`, `llmUsed=false`, 직무 ID·템플릿 버전으로 실제 모델 결과와 구분한다. 화면에도 임시 생성임을 표시한다.
- 2026-09-14 사용자 지정 학번 **20261137**의 **웹 개발자** 초안 1개를 실제 생성 API로 저장했다. 3축·15칸 모두 TODO이며 확정하지 않았다. 브라우저 새로고침 후 저장 결과를 확인했다.

함께 수정한 오류: 관리자 관심직무 추가 API의 학생 본인 전용 제한을, 진로취업상담사 + 로드맵 메뉴 권한 + 담당 학생 범위 조건으로 확장했다. 학생 본인 권한과 자격증 수정 제한은 유지한다. 학생 상세 로드맵 탭에 서버 스토어 적재·구독을 연결하고, 생성 버튼의 옛 `student.roadmapOutcome` 의존성을 서버 capability로 교체했다. 실패 시 오류를 표시하고 재시도할 수 있다.

검증: `tests/test_development_roadmap.py` 8개(권한·범위·중복 직무·초안 저장·출처·멱등성·잘못된 직무·운영 차단), 기존 모델 제공자 회귀 테스트, 프런트 빌드·변경 컴포넌트 ESLint, 실제 브라우저 직무 추가 200·임시 로드맵 저장 및 재조회. 브라우저 추가 검증은 별도 테스트 DB에서 수행했다.

향후 목표는 선택 직무와 학생 근거를 바탕으로 RAG 검색 결과를 클라우드 LLM에 전달하고, 형식 검증을 통과한 결과를 현재 저장 경로에 채택하는 것이다. 아래 모델 HTTP 연결은 구현되어 있지만 RAG 검색 파이프라인은 아직 구현되지 않았다. 실제 연계가 준비되면 임시 제공자 설정을 교체한다.

## 실제 모델 제공자

`POST /students/{id}/roadmap/generate`와 `/regenerate`는 DB의 진단 결과, 현재 유형,
선택한 CARE 7+ 상담, 수강 과목, 자격증, 희망 직무를 읽어 생성 모델을 호출한다.
응답은 IAP·CORE·GROWTH 각 5칸으로 검증한다. 모든 칸은 TODO이며 실제 프로그램 연결은
생성 모델이 지정할 수 없다. 생성 결과는 DRAFT로 저장하고 상담사가 확정해야 학생에게 보인다.
실패하면 기존 계획·스냅샷·이력을 변경하지 않는다. 동일 Idempotency-Key 재시도는 저장 결과를 재사용한다.

백엔드 환경변수:

```dotenv
DC_ROADMAP_PROVIDER=openai-compatible
DC_ROADMAP_API_URL=https://api.openai.com/v1/chat/completions
DC_ROADMAP_MODEL=사용할_모델_ID
DC_ROADMAP_API_KEY_FILE=/비밀파일/절대경로
DC_ROADMAP_TIMEOUT_SECONDS=45
```

모델은 Chat Completions의 strict JSON Schema 출력을 지원해야 한다.
요청 형식은 [공식 Structured Outputs 문서](https://developers.openai.com/api/docs/guides/structured-outputs)를 따른다.
API 키는 `DC_ROADMAP_API_KEY` 환경변수도 지원한다. 파일 설정이 있으면 파일을 우선한다.
키와 모델은 저장소에 넣지 않는다. 설정 변경 후 API 서버를 재시작한다.

기본값은 `disabled`다. 설정이 없으면 capability가 생성 불가 사유를 반환한다.
시드 `roadmapOutcome`은 실제 AI의 폴백으로 사용하지 않는다.
`fixture`는 명시적으로 선택한 개발·계약 테스트에서만 허용하며 production에서는 차단한다.
기존 계약 테스트는 `DC_ROADMAP_PROVIDER=fixture`로 실행한다.
새 생성 테스트는 네트워크 응답을 대체해 실제 모델 호출 없이 DB 저장과 실패 롤백을 검증한다.

`ai_run`에 모델, 입력 스냅샷·해시, 프롬프트 버전과 생성 출처가 저장된다.
학번·이름·연락처·자격증 번호·심리상담 기록은 생성 입력에 포함하지 않는다.
외부 호출은 로드맵 전역 잠금을 잡기 전에 수행하고, 응답 후 버전·상담 상태를 다시 검사한다.

# GPA 정책

마이그레이션 052의 `dc.gpa_policy`, `dc.gpa_term_order`에 학교가 정한 정책을 등록한다.
자동 활성화되는 정책은 없다. 미등록/비활성 상태는 기존 GPA를 `legacy_detail` 출처로 유지한다.
활성화에는 재수강 처리, 제외 성적 코드, 학기 코드 순서, 적용 학기 범위, 반올림 자릿수와
정책 revision·승인자·승인시점이 필요하다. 정책 표는 앱 계정에서 읽기만 가능하다.
`dc.student_gpa(uid)`가 목록과 학생 상세의 공통 계산원이다.
정책 비활성화는 기존 GPA 조회로 되돌리는 방법이며, 원본 수강 정보는 수정하지 않는다.

실제 DB 검증은 별도의 `*_test` DB에서 실행한다.
일반 테스트는 `dc_app`, `test_gpa_policy.py`와 6천 명 fixture 삽입 테스트는 DB 소유자 계정으로 실행한다.
정책·대용량 fixture 테스트는 트랜잭션 롤백으로 데이터를 복구한다.


## 상담 기록 저장과 로드맵 확정 (2026-09-14)

사용자 확정: 상담 진행 화면의 **저장 후 완료 처리**는 생성된 로드맵을 DB에 확정 저장하고 상담을 완료하는 동작이다. 최종 유형 재선택이나 별도의 로드맵 확정 버튼 조작을 선행 요구하지 않는다. 생성 시에는 복구 가능한 DRAFT로 DB에 저장하며, 완료 시 해당 초안을 CONFIRMED로 전환한다. 외부 진단 유형은 그대로 유지하고 새 유형을 임의로 만들지 않는다.

- `POST /counsel-requests/{id}/complete`는 상담의 `expectedVersion`과 로드맵의 `expectedRoadmapVersion`, `expectedRoadmapLockVersion`을 검증한다.
- 현재 담당자의 확정 예약, 동일 학생·동일 상담 근거, 로드맵 권한·3축 15칸·버전을 확인한 후 기존 확정 전이 함수를 재사용한다. 로드맵 확정 및 이력, 상담 기록 저장, 상담 DONE 및 이력은 동일 트랜잭션이다. 실패 시 모두 롤백한다.
- 생성 시 상담 진행 화면의 신청 ID를 전달한다. 학생 상세에서는 본인 담당 확정 상담을 완료 상담보다 우선한다. 다른 상담의 계획을 몰래 재연결하거나 오래된 버전을 확정하지 않는다.
- 관리자 진로 여정은 과거 프로필 `phases` 대신 학생 포털과 같은 `getPipelineState` / `buildCareerJourney`를 사용한다. DB에서 읽은 진단 응시·CARE 7+ 상담 완료·로드맵 확정 상태를 조합하고 진행 중인 상담의 접수/예약 상태를 안내한다. 여정 진행률과 15칸 이행률은 별도 지표다.
- 기존 테이블을 사용하므로 추가 DB 마이그레이션은 없다. 실제 학생의 상담을 테스트 목적으로 완료 처리하지 않는다.

검증: `test_counsel_roadmap_completion.py` 9개와 기존 생성 테스트 16개 통과. 기록 저장 실패 시 확정 롤백, 버전 충돌, 다른 상담/담당자, 권한 차단, 중복 완료를 포함한다. TypeScript 빌드 통과. 변경 파일 ESLint 오류 0개(기존 journalRevision 경고 1개).

브라우저 검증: 실제 이지우 조회에서 상담 단계·예약 확정 표시 확인. 별도 테스트 DB에서 현재 상담으로 웹 개발자 로드맵을 생성하고 저장 후 완료 처리(200), 새로고침 후 확정된 세대와 역량강화 단계 표시를 확인했다. 콘솔 오류/API 실패 0개. 로드맵 배지의 버전은 편집 잠금 번호가 아닌 생성 세대 번호를 표시하도록 수정했다.
