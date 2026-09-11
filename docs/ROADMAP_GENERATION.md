# AI 로드맵 생성 설정

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
