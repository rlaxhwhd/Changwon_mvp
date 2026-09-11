# 0003 시드 퇴역 — 결정 기록

| # | 날짜 | 질문 | 결정 | 결정자 |
|---|---|---|---|---|
| D1 | 2026-09-10 | 더미 112명의 시드 파생값(유형·GPA·이행률·건수·계층)을 어떻게 다루나 | **폐기.** 이름·학번·학과·학년만 사실로 두고 나머지는 실제 이벤트 테이블에서만 파생한다. `dc.student_list` 뷰의 `roster` jsonb 폴백을 제거한다. "김채원·김창원을 제외한 학생은 처음 접속하는 학생" | 사용자 |
| D2 | 2026-09-10 | 시드 JSON 파일의 거취 | 프론트 `src_*/data`에서 **전부 삭제.** `app.seed` 입력으로 필요한 파일은 `backend/seeds/`로 이동하고 `dc.seed_source.path`를 재매핑한다(039) | 팀장(기술) |
| D3 | 2026-09-10 | 교수가 신청 없이 남기는 지도학생 상담기록의 DB 구조(E4) | **(b) 기록 저장 시 `counsel_request`(type=PROF, 교수 발의, status=DONE)와 `counsel_record`를 한 트랜잭션에 생성.** 현행 `CON_PROF_INFO` 1행 구조 계승. `counsel_record`에 `category_code` 컬럼 추가. 신청 목록에는 「교수 발의」 표시 | 사용자 |
| D4 | 2026-09-10 | 로스터 응답에서 `penaltyTotal·penaltyEntries` 제거(계약 변경) | 승인 — 벌점 정본은 `/penalties`. Astra가 소비처 영향 확인 | 팀장 |
| D6 | 2026-09-11 | 개발 DB의 `seed_demo`(source `demo:roster`) 시연 데이터 — 더미 112명의 유형·상담·로드맵·비교과·진단·벌점 | **DB 재구축.** `docker rm` 후 LOCAL_DEV.md 절차(migrate 001~046 + `app.seed`)만 실행하고 `seed_demo`는 돌리지 않는다. 더미는 이름·학번·학과·학년만 남는다. 시연이 필요하면 그때 `seed_demo`를 명시 실행 | 사용자 |
| D5 | 2026-09-10 | 관리자 대시보드 `traffic`(접속 통계) | 소스 없음 → `null` 반환, 화면은 「집계 준비 중」. 0으로 위장 금지. 인증 도메인(#9) 이후 | 팀장 |

## D3 세부 (revision 2에 반영할 것)

- `POST /counsel-requests`에 교수 발의 경로 추가: `principal.kind=STAFF`(role=professor)이고 body에 `studentId`·`initiatedBy='PROFESSOR'`·`record{summary,categoryCode,method,date}`가 오면 REQ→DONE을 건너뛰어 `status_code='DONE'`, `counselor_uid=교수`, `requested_at=completed_at=date`, `source_payload.initiatedBy='PROFESSOR'`로 한 번에 만들고 `counsel_record`도 같이 쓴다. 이벤트는 `REQUESTED`·`COMPLETE` 두 행.
- 권한: 교수는 `dc.staff_student_scope`(전담 배정, E3) 안의 학생만. 조교·상담사 불가.
- `dc.counsel_record.category_code text NULL` + `dc.code_item`(group=`PROF_COUNSEL_CATEGORY`) FK — 018 두 층 코드 규약.
- 프론트 `profCounselRecords.ts`: localStorage 제거, `queryProfRecords`는 `GET /counsel-records?type=교수&professor=me`(record DTO에 `categoryCode`·`snapshot{studentNo,name,major,grade}` 추가)로. 교수 통계(`getProfessorStats`·`queryAdviseeCounselStatus`)는 `GET /counsel-records/summary?groupBy=professor|student` SQL로.
- 시드 `profCounselRecords.seed.json` 11행 → backfill 마이그레이션(D3 구조로 request+record 생성, `source='fixture'`).
- E4는 E3(전담 배정 → `staff_student_scope`) 뒤에 실행한다 — 권한 검사가 배정에 의존한다.
