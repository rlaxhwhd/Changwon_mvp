# 0015 상담 가능 시간대 1시간당 인원 + 접수함·상담일정 통합 — 적용 전 Astra 검토

- revision: 2 (2026-11-19 Astra 교정 반영 — `architecture-review.md`)
- 상태: ASTRA_APPROVED (마이그레이션 미적용 — 테스트 DB 포함 어떤 DB에도 적용하지 않았다)
- 사용자 요청: 2026-11-19
  1. 「admin/settings/availability 에서 설정 시간대추가에 상담 가능 인원도 추가할 수 있게해줘 — 월 09:00~12:00 3명 + 월 13:00~15:00 2명」
  2. 「admin/counsel/requests 의 '상담일정'(시간대에 학생 추가)과 신청목록 화면을 하나로 합치자. 상담일정 화면 기준으로 시간대에
     추가 및 신청 목록. 학생 직접 추가도 (1)의 인원만큼 — 13~15시 2명 세팅, 13~14시에 1명 신청했다면 추가 가능 인원은 1명」
- 사용자 확정(질문 답): 인원 = **1시간마다** n명(13~15시 2명 = 13시 2명·14시 2명) · **학생 신청(/v2)에도 같은 인원 적용** ·
  시간 미정 신청은 **시간대 표 안**(맨 위 「시간 미정」 칸)에만 · 기존 시간대 인원 = **1명**.

## 마이그레이션

`backend/migrations/167_counsel_slot_capacity.sql` SHA256 `3b3c2442006bade57d3cb1b740f018b7c0fc1a8d2488e897e93d1271702c359b`

```sql
ALTER TABLE dc.counsel_schedule_slot
  ADD COLUMN capacity smallint NOT NULL DEFAULT 1
  CONSTRAINT ck_counsel_schedule_slot_capacity CHECK (capacity BETWEEN 1 AND 20);
```

- 상수 기본값이라 재작성 없음. 기존 행 = 1 → 종전 동작(담당자 한 시각 1건)과 동일.
- EXCLUDED 행은 의미 없음 — 앱이 항상 1을 넣는다.
- 권한: dc_app 은 이미 SELECT/INSERT/DELETE(035). 새 컬럼에 별도 GRANT 불필요.
- 롤백: 앱만 되돌리고 컬럼은 둔다. 옛 앱의 위치 기반 6값 INSERT 는 기본값 1로 동작한다. 단 인원 >1 로 저장된 행은 옛 앱에서 1명으로 취급된다(데이터 손실 없음).

## 코드

- `backend/app/counsel_operations.py`
  - `Slot.capacity` (기본 1, 1~20), `schedule_dto` 에 capacity, 저장 INSERT 를 **컬럼 명시**로 변경(available 만 capacity, excluded=1).
  - `check_personal_schedule` 가 이제 **그 시간의 인원을 반환**한다(가능 시간대 미설정 → 1).
  - `GET /counsel-slots`: 학생 본인 겹침은 그대로 차단, 담당자 쪽은 겹치는 REQ/CONFIRMED 수 < 인원일 때만 available.
- `backend/app/counsel.py` `check_slot`: 한 쿼리로 학생 겹침 수·담당자 겹침 수를 FILTER 집계.
  학생 겹침 ≥1 → 409(종전 문구), 담당자 겹침 ≥ 인원 → 409(인원>1 이면 「이 시간대의 상담 인원이 모두 찼습니다.」).
  호출 경로 5곳(학생 신청·상담사 학생 추가·확정·일정 변경·재배정) 공통. 동시성은 기존 advisory lock(담당자·학생 키) 그대로.
- 화면: `src_admin/pages/SettingsAvailability.tsx`(1시간당 인원 입력·표시), `src_admin/data/availability.ts`(getOpenHours 가 인원 동반),
  `src_admin/data/counselRequests.ts` `buildDaySchedule`(행마다 capacity·booked — booked 는 필터 전 대기·확정 수),
  `src_admin/pages/CounselRequests.tsx`(목록 뷰·토글 제거, 일정 뷰 하나로 통합. 각 시각 「신청/인원」, 남은 자리 있을 때만 「학생 추가」,
  처리 버튼은 「상담 처리」 모달 하나로), `src_admin/index.css`(배지 2줄).

## 검토 요청 사항

1. 인원 카운트 기준 — 화면(booked)은 **시작 시각 기준 시간 버킷**, 서버(check_slot)는 **구간 겹침** 기준이다. 2시간짜리 확정 건(13~15시)은
   서버에선 13·14시 모두 차지, 화면에선 13시만 센다. 상담사가 일정 변경으로 만든 긴 일정만 해당 — 화면도 겹침 기준으로 맞출지.
2. 한 시각에 서로 다른 인원의 가능 시간대가 걸칠 수 없음(저장 시 겹침 422)을 전제로 `fetchone()` 한 행을 쓴다 — 맞는지.
3. 가능 시간대 밖에 잡힌 기존 일정(일정 변경 경로)과 미설정 담당자(capacity 1) 처리.
4. `/counsel-slots` N×일×시간 루프의 파이썬 집계 비용(종전과 동일 규모, 겹침 리스트 1회 필터 추가).
5. 교수(`professor`)도 같은 테이블·같은 check_slot 을 쓴다 — 교수 화면에는 인원 입력이 없어 항상 1. 문제 없는지.

## Astra 교정(revision 2)

- `check_slot`: 담당자 자리는 겹치는 건 **총수**가 아니라 **동시 진행 최대 건수(peak)** 로 판정한다. 인원 1이면 종전과 동일,
  긴 일정(13~15시)은 13시·14시를 따로 본다. 학생 겹침·409 문구 규칙은 그대로.
- `buildDaySchedule.booked`: 시작 시각 버킷 → 그 1시간 칸과 **겹치는** 대기·확정 건수(검토 요청 1 해소). items 배치는 그대로.
- `/counsel-slots`: `busy` 를 날짜별로 한 번 나눠 루프 비용을 줄였다(결과 동일).
- 계약 테스트 `test_availability_fixture_contract` 기대값에 `capacity:1` 추가 — 시드 JSON 은 seed_source 체크섬 때문에 고치지 않는다.
- 마이그레이션 SQL·SHA256 은 바뀌지 않았다. 인원 테스트 5건 목록은 `architecture-review.md` §5.

## 적용 순서(승인 뒤)

테스트 DB(dreamcatch_test) 167 적용 → 관련 pytest(test_remaining_migrations·counsel 계열, 기존 실패 4건 제외) + 인원 테스트 추가
→ `npx tsc -b`(통과 확인됨) → `npm run docker:up` → ego-browser 로 설정·접수함·학생 신청 왕복 검증 → 커밋·푸시. CentOS 배포 없음.
