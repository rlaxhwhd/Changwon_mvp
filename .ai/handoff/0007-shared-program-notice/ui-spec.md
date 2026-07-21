# 공유 공고 상세 (학생 ↔ 상담사 동일 공고) — UI 스펙

> **목표:** 프로그램 카드(프로그램 목록) 클릭 시 **학생이 보는 공고 상세와 동일한 화면**을 상담사도 본다. 공고 상세를 **공유 데이터(getPrograms) 기반 lean 뷰**로 만들어 두 포털이 같은 컴포넌트를 쓴다.
> **사용자 확정:** 데이터 기반 lean(리치 하드코딩 섹션 제거). 프로그램 관리(테이블)→관리 상세는 **그대로 유지**(잘 됨).

## 현황 (Phase 0)
- 학생 `src_v2/pages/growth/ProgramDetail.tsx`: **하드코딩 `MOCK_PROGRAMS`(id '1'~'5')** 사용 → 공유 id(prog_001) 매칭 안 됨(기본값 표시). 리치 섹션(소개/참여방법/내용/효과/일정/후기/Q&A)은 스키마에 없음.
- 상담사 `ProgramList`(프로그램 목록, 카드) onSelect → `/programs/:id`(관리 상세). 
- 상담사 `ProgramManage`(테이블) 행 → `/programs/:id`(관리 상세) — **유지**.
- 공유 `Program` 스키마: id·title·desc·category·startDate/endDate(모집)·runStartDate/runEndDate(운영)·capacity·location·status·sessions·manager·fiscalYear·image·applicants.

## 1) 공유 컴포넌트 `ProgramNotice` (신규, src_v2)
파일: `src_v2/pages/growth/ProgramNotice.tsx` (CSS는 기존 `ProgramDetail.css` 재사용/이관). **getPrograms 단일소스에서 id로 조회**.
```ts
interface Props {
  programId: string
  onApply?: () => void   // 있으면 '신청하기'(학생), 없으면 미표시(상담사 미리보기)
  backTo: string         // '목록으로' 링크 (학생 '/growth/program', 상담사 '/programs')
}
```
- `getPrograms().find(p => p.id === programId)` — 없으면 EmptyState("공고를 찾을 수 없습니다").
- **표시(실데이터):** 이미지, 분류(category), 제목(title), 소개(desc, 문단), **모집기간**(startDate~endDate), **운영기간**(runStartDate~runEndDate, 있을 때), 장소(location), 정원(capacity), **담당자**(manager), **총회차**(sessions회), 상태(status). 학생 공고 레이아웃(pd-*) 톤 계승(2컬럼: 좌 소개/우 신청정보 카드).
- **하드코딩 제거:** 참여방법/내용/효과/일정/후기/Q&A 탭·섹션 미포함(스키마 없음). 필요 시 desc만.
- 액션: `onApply` 있으면 `신청하기` 버튼(+찜, 학생). 없으면 상담사 미리보기 — `목록으로`(backTo)만.

## 2) 학생 `ProgramDetail.tsx` (재작성 — thin wrapper)
- `MOCK_PROGRAMS` **전부 삭제.** `useParams id`(문자열, prog_001) → `<ProgramNotice programId={id} onApply={()=>setApplyOpen(true)} backTo="/growth/program" />` + 기존 `ProgramApplyModal`(신청) 유지, 찜 유지.
- 라우트 `/growth/program/:id`는 그대로.

## 3) 상담사 공고 뷰 + 카드 라우팅
- **신규 페이지** `src_admin/pages/ProgramNoticeView.tsx`: 상담사 Layout 안에서 `<ProgramNotice programId={id} backTo="/programs" />` 렌더(onApply 미전달 → 신청 버튼 없음, 미리보기). 상단에 "학생 공개 공고 미리보기" 정도 라벨 + 관리로 가는 링크(선택: `/programs/:id` 관리 상세).
- **라우트(App.tsx):** `{ path: '/programs/:id/notice', element: <ProgramNoticeView /> }` 추가.
- **ProgramList(프로그램 목록) 카드 onSelect** → `navigate('/programs/'+id+'/notice')` 로 변경(관리 상세가 아닌 공고 뷰).
- **ProgramManage(테이블) 행 → `/programs/:id`(관리 상세) 그대로. 변경 금지.**

## 하드룰
- JSON 동적, 하드코딩 데이터 0. 단일소스 getPrograms(). (id는 문자열.)
- ProgramNotice는 학생(src_v2) 톤 CSS — 상담사에서도 동일 노출(의도: "학생이 보는 공고 그대로"). 새 팔레트 금지.
- 상담사 관리 상세(ProgramDetail, 신청자·출석)·ProgramManage·ProgramForm(.pf) 손상 금지.
- 크로스-SPA(src_admin→src_v2 import)는 기존 방식.

## 완료 기준
1. `npx tsc --noEmit` + `npm run build` 통과. `grep MOCK_PROGRAMS src_v2/pages/growth/ProgramDetail.tsx` → 없음.
2. 학생 `/v2/growth/program` 카드 클릭 → 공유 공고(실데이터, prog_001 정상 표시)·신청하기.
3. 상담사 `/admin/programs` 카드 클릭 → **같은 공고 뷰**(신청 없음). 프로그램 관리 테이블 행 → 관리 상세 그대로.
