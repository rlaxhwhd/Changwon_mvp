# 0009-professor-screens — 리뷰 종합

> 팀장(team-lead) 통합. 상세 판정은 `review-design.md`(4단계) · `review-content.md`(5단계).

## 최종 판정: **PASS** (재작업 3회 후)

| 단계 | 1차 | 재검증 |
|---|---|---|
| 4 · 디자인·유지보수 | REJECT (P0 3 · P1 6 · P2 14 · P3 6) | **PASS** |
| 5 · 내용 정합성 | REJECT (차단 4 · Major 5군) | **PASS** |

재작업 3회: ①팀장 사전 반려(미니파이·헤더주석·일정확정 누락·seed 0건) → ②리뷰어 P0/차단 → ③줄바꿈·학번 폴백.

## ★ 이번 작업의 최대 발견 — 검증 명령이 틀려 있었다

루트 `tsconfig.json`이 `"files": []` + project references라 **`tsc --noEmit`은 아무것도 검사하지 않고 exit 0을 낸다.** 하네스 문서 5곳이 이 명령을 빌드 게이트로 못박아 뒀고, Codex도 팀장도 두 라운드를 "통과"로 믿고 진행했다. 실제 게이트는 `npm run build`(= `tsc -b`)이고, 돌리자 **타입 에러 9건**이 나왔다.

- 조치: `AGENTS.md` · `dreamcatch-orchestrator/SKILL.md`(2곳) · `codex-implementer.md` · `design-reviewer.md` · `developer.md` **6곳을 `npm run build`(= `tsc -b`)로 정정**.
- 직전 handoff `0008`도 같은 무의미한 게이트로 통과시켰으나, `tsc -b` 재검증 결과 **에러 0**으로 확인됨.

## 차단 → 해소 이력

| ID | 결함 | 조치 | 재검증 실측 |
|---|---|---|---|
| P0-1/B1 | `tsc -b` 타입 에러 9건 | 유니온 접근·미import·TDZ 정리 | exit 0 |
| P0-2/B2 | **학생 교수상담 화면 완전 파손(회귀)** — `useState(onlineTopic)`이 3줄 뒤 `const`를 참조(TDZ) + 삭제된 `PROFESSOR_GROUPS` 잔존 | 선언 순서 수정 + 잔존 참조 교체 | `/v2/counsel/professor` 정상 렌더, 콘솔 에러 0 |
| P0-3/B3 | 핵심 가치 흐름이 uncaught throw — ui-spec §7-3의 `snapshot?` 파라미터 누락, 로스터 밖 owner(학번 id) 해석 실패 | `snapshot?` 폴백 복원 + 신청 행 스냅샷 전달 | 김지연(`20229876`) 확정건 저장 성공 |
| B4/P1 | 화면단 `getFullRoster().filter(...)` 범위 좁힘(콜백 내 N회 재호출) | `getAdviseeRoster()` 데이터층 이동 | §11-4 준수 |
| P1 | 페이징 전무(11건째부터 도달 불가) | 접수함·기록 화면 PAGE_SIZE=10 | 2p 첫 행 번호 11 확인 |
| P1 | seed 임의 창작(§7-10에 없는 5번째 신청 + owner `stu-101`) → 학번 칸에 slug 노출 | 창작분 제거 → §7-10대로 4건 | `cse-1` 확정1·대기2 / `biz-1` 대기1 |
| P1 | 저장·확정 실패 침묵 | 인라인 오류 표시 | — |
| P1 | 영문 주석 8건 (저장소는 전량 한국어 규약) | 한국어화 | — |

## ★ 핵심 가치 3단 — 실증 완료

교수가 기록 저장 → ① `dc_prof_counsel_records` append(requestId·snapshot 보존) → ② 신청 '완료' patch + completedAt → ③ 조교 `/assistant/advisor/records` 집계.
실측: 기록 7→8→9건, 접수함 탭 `확정0/완료1`, 조교 실적 **박지훈 4건/2026.03.12 → 5건/2026.07.31**.

결정 3·6도 이번에 처음 end-to-end 실증: 학생 온라인 신청(동의→서명→제출) → owner 스토어 append → 교수 접수함 "0분 전 신청" 대기 행 등장(탭 3→4). `accept=false` 저장 → 학생 화면에서 해당 교수 사라짐, 단대 전원 off 시 폴백(크래시 없음). 그 상태에서도 상담사 접수함 13건·교수건 누출 0.

## PASS로 확정된 것

- **신원 통합 실효** — `prof_lee`→`cse-1` 박지훈 / `prof_jung`→`biz-1` 김세환. 0008 seed(배정 16·기록 7)가 즉시 로그인 교수의 데이터가 됨(cse-1 지도학생 5·기록 4).
- **디자인 토큰 무drift** — 교수 귀속 신규 CSS는 `index.css:2193-2197` **5줄(modifier 3개)** 뿐. 색상·폰트·radius·shadow 신규 0. (같은 파일 +149줄은 병렬 상담사 작업물)
- **조교 3화면 무회귀** — 렌더 확인(15명·13명·11명, 페이징 정상, 에러 0). 공유 `StudentRosterTable`의 `studentIds`는 `=== undefined` 판정이라 미전달 시 동일 동작.
- **빈 배열 = 0명 스코프** — 전체 로스터 폴백 없음(`studentRoster.ts:189,205,218`).
- impeccable 신규 안티패턴 0건(hit 2건은 pre-existing side-tab).

## 팀장 직접 정리 (리뷰 후 nit)

| 항목 | 조치 |
|---|---|
| `owner.studentNo ?? owner.id` 폴백 | **제거** — `students.ts:309`가 `studentNo: o.id`를 항상 채워 실행되지 않는 죽은 코드였고, 함께 단 주석도 사실과 달랐다(팀장 판단 착오). 두 층에 중복된 "id=학번" 판단을 한 층으로 되돌림 |
| `major`에 학년 포함("…3학년") | 투영 단계 `majorOnly()` 정규화 — 기록 화면 "…3학년 · 3학년" 중복 제거 + `snapshot.major` 오염 차단(이관 대상 데이터) |
| `addProfCounselRecord` 동일 throw 메시지 2개 | "교수 정보" / "학생 정보"로 분리 |
| 온라인 상담 내용 textarea 예시 문구 소실 | `placeholder={onlineTopic}` |
| [초기화]가 건수 옆에 붙음 | `admin-page-head > admin-head-actions`로 이동(기존 7개 페이지 관행) |
| ui-spec §4 문장 | 조교 집계는 **배정 지도학생 기록만** 잡는다는 스코프 규칙을 정정 주석으로 명시 |

## 남은 것 (비차단)

- `StudentRosterTable.tsx:45-46` 메모 키가 raw 배열 — 매 렌더 재계산(동작 무회귀, 성능 nit)
- 제한일정 유효성 힌트 문구 미반영
- `advisorAssigns.ts` `getAdvisorRosterForExport` 시그니처가 `ListParams &`로 정리됨(0008 파일, 범위 밖이나 동작 동등·타입 개선)

## 협업 특이사항

작업 내내 **다른 세션이 같은 저장소를 병렬 편집**했다(상담사 도메인: counselEvents·psychTests·counselStats·diagnosisAttempts·상담기록 인쇄·navConfig·careerProcess). 리뷰어 양쪽에 제외 목록을 주입해 판정에서 분리했고, 교수 작업 diff에 그쪽 파일의 추가/삭제가 0줄임을 확인했다. 최종 산출물은 그 세션이 `c72be11`로 함께 커밋했으며, 두 리뷰어 모두 `git show`로 **검증 대상 == 커밋 내용**임을 대조했다.
