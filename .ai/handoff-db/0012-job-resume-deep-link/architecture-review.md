# 0012 DeepResume 자소서 연동 — Astra 설계 리뷰

- 판정: **ASTRA_APPROVED (교정 반영 조건)** — 아래 교정이 들어간 상태의 코드·마이그레이션을 승인한다.
- 대상 revision: work-order.md 없음(팀장 구두 요청 2026-11-13). 승인 기준 = 이 문서 작성 시점의
  `backend/migrations/162_job_resume_deep_link.sql`, `backend/app/deep.py`, `backend/app/jobs.py` 자소서 구간, `backend/tests/test_deep.py`.
- 적용: 어떤 DB에도 적용하지 않았다. pytest 미실행(dreamcatch_test 에 162 미적용 — 팀장이 적용 후 실행).

## 1. 마이그레이션 162 — 승인(주석만 보강)

| 항목 | 판단 |
|---|---|
| `ck_job_resume_deep_topic_needs_cover` | 맞다. topic 은 cover 없이 의미가 없다. |
| `ck_job_resume_deep_synced_version` (`NULL` 또는 cover 있음 ∧ `1..version`) | 맞다. CHECK 는 갱신 후 행에 대해 평가된다. ai_draft 의 `SET version=version+1, deep_synced_version=version+1` 은 SET 우변이 모두 **갱신 전** 값을 읽으므로 두 칸이 같아져 통과. 삭제의 `version+1` 은 synced ≤ version 을 유지. sync 는 읽은 version 을 기록하고 version 은 단조 증가하므로 그사이 저장이 끼어도 위반하지 않는다. |
| `uq_job_resume_deep_cover` 부분 unique | 유지. 조회용이 아니라 "Deep 자소서 1건 ↔ 우리 자소서 1건" 정합성 장치. 표가 작아 비용 무시 가능. deep_cover_id 로 찾는 질의는 없으므로 다른 인덱스는 불필요. |
| 잠금·재실행 | migrate.py 단일 트랜잭션, 작은 표의 ADD COLUMN(nullable, default 없음) — 메타데이터 변경만. 적용 이력 checksum 이 있어 재실행 안전. |
| 롤백 | 앱 먼저 되돌린 뒤 DROP COLUMN 3개. SQL 을 주석으로 명시했다(162:6-11). 되돌리면 Deep 연결 정보를 잃고 재적용 후 첫 저장이 Deep 자소서를 새로 만든다는 점도 기록. |

## 2. 교정한 설계 — 요청 커넥션을 쥔 채 Deep HTTP 를 기다리던 문제

**문제(차단 결함).** `principal`·엔드포인트가 `Depends(connection, scope='function')` 으로 받은 커넥션은 엔드포인트가
끝날 때까지 풀에서 빠져 있다. 풀은 `max_size=5`(db.py), 워커 1개다. 원안은 그 커넥션을 쥔 채
저장 20초(로그인까지 겹치면 그 이상)·AI 60초·평가 150초를 기다렸다. 게다가 `call()` → `token_for()` →
`identity(conn)` 의 SELECT 가 commit 뒤 새 트랜잭션을 열어 평가 150초 동안 **idle in transaction** 으로 남았다.
평가 5건이 겹치거나 Deep 이 응답 없이 매달리면 사이트 전체 API 가 풀 대기(10초) 후 실패한다 —
"Deep 장애가 학생 저장을 막지 않는다"는 목표와 정반대다. 행 잠금은 본인 행이라 경합은 작지만, 커넥션 고갈이 본질.

**교정.** 이 저장소가 이미 쓰는 방식(counsel_ai.save_journal, ai_comments.reserve_comprehensive)을 따른다.

1. `jobs.deep_principal` — `principal` 을 그대로 호출하되 `with pool.connection()` 짧은 커넥션으로. 인증 로직 복제 없음.
   자소서 create/update/delete/ai-draft/evaluation 엔드포인트가 이것을 쓴다.
2. DB 작업은 `with pool.connection()` 블록 안에서만 하고(정상 종료 커밋·예외 롤백) Deep HTTP 는 블록 밖에서 부른다.
   요청 중간 `conn.commit()`/`conn.rollback()` 이 모두 사라졌다.
3. `deep.py` 의 `call/token_for/push_cover/delete_cover/write_ai/evaluate` 에서 `conn` 인자를 뺐다.
   `token_for` 는 캐시가 없을 때만 짧게 커넥션을 빌려 학번·이름을 읽고, 로그인 HTTP 전에 돌려준다.
4. 동시 저장의 Deep 자소서 중복 생성·역순 덮어쓰기: 원안은 `FOR UPDATE` 로 막았다(커넥션을 쥐는 대가).
   교정안은 `jobs.resume_lock(resume_id)` 프로세스 잠금으로 같은 자소서의 반영을 직렬화한다 — 잠금 안에서 최신 행을
   읽고 보내므로 Deep 에는 version 순서대로 반영된다. workers=1 전제는 deep 토큰 캐시와 같다.
   방어선으로 연결 UPDATE 에 `deleted_at IS NULL AND deep_cover_id IS NOT DISTINCT FROM <읽은 값>` 조건을 걸어,
   워커를 늘리거나 삭제가 끼어들어 0행이면 방금 만든 Deep 자소서를 지우고(고아 정리) FAILED 를 돌려준다.
   삭제도 같은 잠금을 잡는다.
5. ai_draft 경합: AI 호출 중 다른 저장으로 version 이 바뀌면 409 를 주는 것은 원안과 같고, 이때 Deep 쪽에는 AI 문장이
   이미 붙었으므로 `deep_synced_version=NULL` 로 표시를 지워 다음 저장이 우리 본문으로 Deep 을 다시 맞추게 했다
   (원안은 이 경우 synced 표시가 거짓으로 남을 수 있었다 — 두 탭 동시 AI 에서 재현).

## 3. 남는 위험(수용)

- Deep `POST covers` 가 생성 후 응답 시간 초과되면 id 를 모른 채 다음 반영이 하나 더 만든다 — Deep API 에 멱등 키가 없다(API v7 확인). 고아 1건, 학생 데이터 손실 없음.
- 삭제 시 Deep 삭제가 실패하면(컨설팅 진행 중 400 등) 우리 행은 삭제되고 Deep 사본은 남는다. 재시도 큐 없음 — 응답의 `deepSync.FAILED` 로만 알린다.
- 토큰: **메모리 캐시 유지가 맞다.** 베어러 토큰을 DB 에 두면 비밀 노출면만 늘고 얻는 것은 재시작 후 재로그인 절약뿐이다. 재시작 직후 분당 120회 로그인 제한에 걸리면 429 → 저장은 FAILED(다음 저장 때 재전송), AI·평가는 429 안내. workers 를 늘리면 워커별 로그인이 늘 뿐 정합성 문제는 없다.
- 교정 블록은 `SET LOCAL jit=off` 를 하지 않는다 — 자소서 질의는 PK·단건이라 JIT 임계에 닿지 않는다.

## 4. 주요 질의와 인덱스

| 질의 | 인덱스 |
|---|---|
| 목록 `student_uid=? AND deleted_at IS NULL ORDER BY updated_at DESC,id` | `job_resume_owner`(022) |
| 단건·잠금 `id=?` | PK |
| 연결 UPDATE `id=? AND deep_cover_id IS NOT DISTINCT FROM ?` | PK (조건은 행 필터) |
| Deep cover 1:1 보장 | `uq_job_resume_deep_cover` |

## 5. JSON 계약 · 테스트

응답 키는 바뀌지 않았다(`deepLinked`·`deepSynced`·`deepSync{status,message}`·ai-draft `{resume,generated}`·평가 DTO).
`test_deep.py` 에 `test_save_during_ai_draft_keeps_ours_and_marks_deep_for_resync` 추가(가짜 Deep 의 `on_ai` 훅으로 AI 호출 중 저장 재현).

## 6. 실행 순서(팀장)

1. `dreamcatch_test` 에 162 적용 → `pytest backend/tests/test_deep.py backend/tests/test_api.py -k "resume or deep"` (알려진 실패 4건 제외 규칙 유지).
2. 로컬 Docker 에 반영 후 ego-browser 로 자소서 저장·AI·평가 측정, Deep 비활성(`deep_key_file` 미설정) 시 DISABLED 경로 확인.
3. 운영 반영은 사용자 지시가 있을 때만.
