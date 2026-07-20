---
name: json-dynamic-screen
description: 드림캐치 신규 역할 화면(상담사/관리자/교수)을 실서비스 투입 수준으로 만드는 방법. 데이터를 컴포넌트에 하드코딩하지 않고 스키마→JSON→로더/스토어→화면 구독 구조로 동적 구현할 때 반드시 따른다. 기획·개발 에이전트가 공유한다.
---

# JSON 동적 화면 패턴 (실서비스급)

드림캐치 신규 역할 화면은 학생 화면과 동일하게 **JSON을 단일 소스로 삼아 동적 렌더**한다. 하드코딩 리터럴은 QA에서 리젝된다. 기준 구현: `src_v2/data/students.ts` + `src_v2/data/students/*.json`.

## 왜 이렇게 하나

백엔드가 붙는 순간 **로더 한 곳만 API로 교체**하면 화면이 그대로 돌아가야 한다. 컴포넌트 안에 데이터를 박으면 그 전제가 깨지고 전면 재작업이 된다. 데이터와 뷰의 분리가 "실서비스 투입 가능"의 실체다.

## 4단계 구조

1. **타입** — `src_v2/types` 또는 로더 파일 상단에 역할 엔티티 `interface` 정의.
   예: `interface CounselorData { id; name; dept; schedule; caseload; ... }`
2. **데이터** — `src_v2/data/{role}/*.json` (역할 인스턴스마다 파일 1개). `students/chaewon.json` 구조를 참고.
3. **로더/스토어** — `src_v2/data/{role}.ts`:
   - JSON을 import해 배열로 노출
   - 활성 인스턴스 선택자(`getActive{Role}`) + `setActive{Role}`(필요 시 localStorage + reload)
   - `students.ts`의 `getActiveStudent` / `setActiveStudent` 구조를 그대로 미러링
4. **화면** — 페이지 컴포넌트는 로더에서 데이터를 가져와 렌더. **JSX 안에 데이터 리터럴 배열/객체를 두지 않는다.**

## 상태 처리 (필수)

- **로딩:** 데이터 준비 전 스켈레톤/플레이스홀더
- **빈:** 데이터 0건일 때 `EmptyState`
- **에러:** 로드 실패 시 안내 + 재시도

## 단일 소스 준수

네비 추가는 `navConfig.ts`, 진단 관련은 `careerProcess.ts`. 상담 관련 데이터는 기존 `counsel.ts` 재사용을 먼저 검토(중복 소스 생성 금지).

## 자가 점검 (개발 완료 전)

- [ ] 화면 컴포넌트에 하드코딩된 데이터 배열/객체가 없다
- [ ] 데이터가 `{role}.ts` 로더 → JSON에서 온다
- [ ] interface와 JSON 필드 shape이 일치한다
- [ ] 로딩/빈/에러 상태가 있다
- [ ] `npx tsc --noEmit` 통과
