# 0003 시드 퇴역 — 구현 기록

| 라운드 | 범위 | 구현자 | 상태 |
|---|---|---|---|
| 1 | E0 고아 JSON 이동 + E2 조직·교직원 프로필(`/departments`·`/staff`·044) | Sol (Codex) | 완료 (2026-09-10) |
| 2 백엔드 | E1 042·043 + E3 045·046 + `advisor_assignments.py` + `/students/summary` | Sol (Codex) | 작성 후 중단 → 팀장이 042(의존 뷰 `diagnosis_status`)·046(`||`/`->>` 우선순위) 교정 후 적용 |
| 2 프론트 | E1 `studentRoster.ts` · E3 `advisorAssigns.ts` | 팀장 직접 (Sol 토큰 소진) | 완료 (2026-09-11) |
| 3 | E5a 팝업 047·048 + `GET /popups` · E5b `dashboard.ts` 삭제(소비처 0) | 팀장 직접 | 완료 |
| 4 | E4 교수 상담기록 049·050 + `POST /counsel-records/professor` + `/advisor-nudges` | 팀장 직접 | 완료 |

## 설계에서 벗어난 것 (Astra 재리뷰 대상)

- **E1 전량 selector 유지** — Astra 교정 5(`/students/lite` 삭제·전량 적재 금지)와 달리 `studentRoster.ts`는 부팅 때 `/students`를 100건씩 전량 적재하고 `getFullRoster`·`studentLiteOf`·`getRosterFilterOptions`·`getRosterSummary` 동기 셀렉터를 유지한다. 이유: 사용자가 하네스 없이 최소 변경을 지시했고 소비처 14파일이 동기 셀렉터에 의존. fixture 120명에서는 41KB·309ms. **6천명이 오면 집계 셀렉터를 `/students/summary`·`/students/metadata`로 옮긴다** — 파일 머리말에 적어 둠. `/students/summary`는 만들어졌으나 아직 호출부 없음.
- **E3 `queryAdvisorRoster`**는 여전히 클라이언트 페이징(`paginate`) — 같은 이유. `/advisor-assignments/roster`·`/summary`는 서버에 있으나 미사용.
- **E5a 팝업** — `dc.notice.kind='POPUP'` 대신 별도 표 `dc.main_popup`. 목록 혼입(Astra 교정 12)을 표 분리로 피했다.
- **E4 분류 코드** — `counsel_record.category_code` 컬럼 대신 기존 `counsel_request.topic_code` + 기존 코드 그룹 `PROF_COUNSEL_TYPE`. 049가 `topic_group` 생성식을 `type_code`로 분기. 프론트 `PROF_COUNSEL_CATEGORIES`는 서버 코드(`MAJOR_STUDY`…)로 교체.
- **E4 조교 가시성** — `counsel.visibility()`에 `assistant` 분기 추가(담당 학과 학생의 교수상담만). 조교 실적 화면이 서버 기록을 읽으려면 필요했다.
- **`counsel.py` DTO** — `slot_date`만 있고 `slot_start` 없는 행(교수 발의 기록) 허용.

## 검증 (2026-09-11)

- 빈 테스트 DB migration 001~050 + `app.seed` → `pytest` **117 passed**
- `npx tsc -b` · `npm run build` 통과
- 프론트 `src_v2/data`·`src_admin/data` JSON 파일 **0**, JSON import **0**
- 개발 DB 재구축(D6): `seed_demo` 미실행 → 더미 112명 유형 0건, 로드맵 2건(김채원·김창원), 전담배정 16건
- 브라우저(chrome-devtools MCP): admin 5역할 11화면 + v2 3학생 5화면 콘솔 오류 0·실패 요청 0. 부팅 API 27건 최장 309ms.
- 왕복: 교수(cse-1) 직접 기록 저장 → 목록 4→5 → 조교(asst_kim) 실적 화면에 「박지훈 5건 · 최근 2026.09.11」 반영. 학생 메인 팝업 3장 서버 적재.

## 운영 메모

- Windows에서 `uvicorn --reload`는 리로더를 죽여도 **워커 고아가 18100 소켓을 물고 옛 코드로 응답**한다(이번 라운드에서 두 번 발생). 재기동 전 `multiprocessing.spawn` python 프로세스를 함께 정리하거나 reload 없이 띄운다.
