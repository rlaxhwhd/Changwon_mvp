# 0018 — Astra 설계 리뷰

- 판정: **ASTRA_APPROVED (APPROVED WITH CHANGES)**
- 승인 대상: `work-order.md` 2026-11-20 Astra 교정본 · `backend/migrations/170_job_career_any.sql` 교정본
- 적용: 어떤 DB 에도 적용하지 않았다(리뷰만).

## 결론

INSERT 본문 `('JOB_CAREER_TYPE','ANY','경력무관',2)` 는 그대로 승인. 롤백 주석이 존재하지 않는 열을 가리키고 있어 SQL 파일(주석)과 작업지시서를 직접 고쳤다.

## 점검 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| PK/FK/CHECK | 통과 | `code_item` PK `(group_code,code)` — `ANY` 신규, 충돌 없음. `code_group` FK: `JOB_CAREER_TYPE` 은 022 에서 생성. label CHECK(1~200자) 통과. `up_*` NULL 쌍 CHECK 통과. `updated_by` NULL 허용 |
| 참조 측 | 통과 | `job_posting.posting_career_fk(career_primary_group,career_primary_code)` · `job_posting_option_fk(group_code,code)` 모두 `code_item` 복합 FK — 새 행이 있으면 참조 가능 |
| 서버 검증 | 통과 | `jobs.py check_code` 는 `is_active` 인 행이면 허용. 코드값 분기 없음 |
| NEW/EXPERIENCED 분기 · 2개 가정 | 없음 | 백엔드·`src_admin`·`src_v2`·`shared` 에 `EXPERIENCED` 리터럴 0건. 화면(`JobForm.tsx` 라디오, `JobBoard`, `JobDetailView`, `jobsSource` 엑셀)은 모두 `jobOptions/jobLabelsOf(JOB_CAREER_TYPE)` 로 code_item 을 순회. 테스트는 `careerTypes:['NEW']` 1곳뿐 — 개수 단언 없음 |
| sort_order | 충돌 없음 | 기존 NEW=0, EXPERIENCED=1 (022). 이후 마이그레이션에서 이 그룹을 바꾼 곳 없음. sort_order 는 unique 도 아님 |
| code_item_event | 쓰지 않는 것이 맞다 | `changed_by NOT NULL REFERENCES dc.person` — 사람 주체의 관리자 변경 이력. 163 이 같은 이유로 명시적으로 생략한 선례가 있고 022/155 도 이벤트 없이 삽입 |
| metadata 캐시 | 통과 | `code_revision` 트리거(AFTER INSERT OR UPDATE, statement)가 `metadata_revision` 을 올려 `/metadata` 캐시가 갱신된다 |
| 인덱스·트래픽 | 변화 없음 | 1행 삽입. `job_posting_option_filter(kind,code,posting_id)` 가 새 코드 필터도 그대로 커버 |
| 멱등성 | 러너 의존 | `ON CONFLICT` 없음 — `migrate.py` 가 `schema_migration` 으로 1회 적용을 보장하므로 022/155/163 과 같은 규약. 수용 |

## 교정한 것

1. **롤백 주석의 열 이름 오류** — `dc.job_posting WHERE job_type='ANY'` 는 존재하지 않는 열이라 롤백 판정 쿼리가 실패한다. 대표 경력 열은 `career_primary_code`(API 키 `jobType`)다. → 교정.
2. **롤백 DELETE 가 막히는 경우 누락** — 관리자가 코드 관리 화면에서 이 행을 한 번이라도 수정하면 `code_item_event` 행이 생기고, 그 FK 와 불변 트리거 때문에 DELETE 가 실패한다. 판정 쿼리에 `code_item_event` 건수를 추가.
3. **DELETE 시 metadata_revision 미증가** — 트리거가 INSERT/UPDATE 에만 걸려 있어 DELETE 만 하면 클라이언트 `/metadata` 캐시에 삭제된 코드가 남는다. 롤백 절차에 `UPDATE dc.metadata_revision SET revision=revision+1` 추가. (`is_active=false` 경로는 UPDATE 라 자동.)
4. `work-order.md` 의 `job_posting.job_type` 표기를 `career_primary_code` 로, 롤백 절을 위와 같이 교정.

## 주의 — checksum

`migrate.py` 는 적용된 파일의 sha256 을 비교해 다르면 `Applied migration changed` 로 중단한다. 이번 교정은 주석만 바꿨지만 checksum 이 바뀐다. **170 을 이미 로컬 DB 에 적용했다면** 교정 전 내용으로 돌리거나 해당 DB 의 `dc.schema_migration` checksum 을 새 파일 기준으로 갱신해야 한다. 아직 적용 전이면 조치 불필요.

## JSON 호환성 테스트 항목

- `GET /metadata` 의 `JOB_CAREER_TYPE` 항목이 3개, 순서 NEW·EXPERIENCED·ANY, `ANY.label='경력무관'`.
- 공고 저장 `jobType='ANY'`, `careerTypes=['ANY']` → 200, 재조회 응답의 key·type 이 기존과 같음(`jobType` 문자열, `careerTypes` 배열).
- `is_active=false` 로 바꾼 뒤 `jobType='ANY'` 저장 → 422.

## 실행 순서

1. (적용 여부 확인) 로컬 DB 에 170 이 이미 있으면 위 checksum 조치.
2. `npm run docker:up` 으로 마이그레이션 적용 → `/metadata` 확인.
3. 테스트 DB 에 적용 후 `tests/test_jobs.py` 회귀(알려진 실패 4건 제외 규칙 준수).
4. 등록 폼 라디오 3개·저장·학생 목록/상세 표시 왕복을 ego-browser 로 확인.
