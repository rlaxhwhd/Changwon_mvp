# 데이터 계약 (DATA_CONTRACT) — 목업 → 실제 DB 전환 대비

> 목적: 지금 JSON 목데이터로 화면을 만들되, 나중에 **DB/REST API로 갈아끼울 때 컴포넌트를 안 건드리게** 하기 위한 규약.
> 원칙: **화면은 로더(서비스 레이어)만 부른다. 로더 시그니처가 곧 API 계약이다.** DB 붙일 때 로더 본문만 `fetch`로 교체.

---

## 1. 네이밍·타입 규칙 (지금 못 박기 — 나중에 바꾸면 전역 치환 지옥)

| 항목 | 확정 | 비고 |
|---|---|---|
| **키 케이스** | 프론트 **camelCase**, 변환은 **서버측 1순위** | Django면 **`djangorestframework-camel-case`** 로 응답 body·query param 일괄 변환(설정 한 줄). 클라 매퍼는 중첩·엔드포인트마다 새므로 **폴백**으로만 |
| **ID — 이중 식별자** | **내부 surrogate PK** + **학번 unique 컬럼** | 관계(벌점·신청·상담기록)의 FK는 **내부 PK 참조** → 학번 변경·재입학·복수학적에도 안 깨짐. 학번은 별도 unique 컬럼 |
| **URL/로그인 식별자** | **학번**(`/students/:studentNo`) | 학번으로 조회(unique 인덱스), 내부는 surrogate PK. 지금 목업 `id:"chaewon"`(슬러그)→ 실사용 시 `id`=surrogate, `studentNo`=학번(URL)로 분리 필요 |
| **프론트 ID 타입** | **항상 string** | DB PK가 정수여도 로더에서 `String(id)` 정규화 |
| **날짜** | **ISO 8601** (`2026-07-14`, `2026-07-14T09:00:00+09:00`) | 표시용 포맷팅은 화면에서. 저장/전송은 ISO 하나로 |
| **한글 오브젝트 키** | 지양 (`typeScores.진로명확도` 같은 건 목업 한정) | DB 컬럼은 영문. 남기려면 로더에서 매핑 레이어 |
| **불리언/열거** | 문자열 리터럴 유니온 유지 (`'게시'|'마감'`) | TS 타입 = API enum 계약 |

---

## 2. 응답 봉투 — 목록은 배열 그대로 반환 금지 ⚠️

목록 로더는 전체 배열이 아니라 **페이징 봉투**(`src_admin/data/query.ts`의 `Paginated<T>`)로 반환한다.
학생 6천건이 들어와도 화면은 **현재 페이지(items)만** 받는다.

```ts
interface Paginated<T> {
  items: T[]
  totalCount: number   // 필터 적용된 전체 건수 (페이지네이션 표시용)
  page: number
  pageSize: number
}
```

조회 파라미터(`ListParams`)는 **실제 쿼리스트링과 1:1**:

```ts
interface ListParams {
  page?: number                                  // 1-based
  pageSize?: number                              // 기본 20
  q?: string                                     // 통합 검색
  sort?: string                                  // 'name' | '-createdAt'
  filters?: Record<string, string | undefined>   // { major, grade, ... }
}
```

> 단건/뮤테이션 응답의 `{ success, data, message, errorCode }` 전체 봉투는 **백엔드 계약 확정 시** 한 번에 도입. 지금은 목록의 `items/totalCount/page`만 지켜도 충분(과한 ceremony 방지).

---

## 3. 서비스 레이어 (로더) = 유일한 스왑 seam

화면 → **로더** → (목업 JSON / localStorage) 구조. 컴포넌트는 JSON을 직접 import하지 않는다.

```
src_admin/data/query.ts          ← 공통: ListParams · Paginated · paginate · mockLatency
src_admin/data/programs.ts       ← queryPrograms(params)   [DB-ready 레퍼런스]
src_admin/data/studentRoster.ts  ← queryStudentRoster(params) [6천건 대비]
```

### DB 전환 시 (컴포넌트 무수정)
```ts
// 지금 (목업)
export async function queryStudentRoster(params) {
  await mockLatency()
  return paginate(getFullRoster(params.departments).filter(...), params)
}
// 나중 (DB) — 본문만 교체
export async function queryStudentRoster(params) {
  const res = await api.get('/students', { params })  // page/pageSize/q/filters
  return res.data                                      // { items, totalCount, page, pageSize }
}
```

---

## 4. ⭐ 가장 큰 숨은 비용: sync → async

기존 로더 다수가 **동기**(`getPrograms(): Program[]`)다. 실제 API는 **비동기(Promise)**.
→ 로더를 `async`로 바꾸면 **호출 화면마다 로딩/에러 상태 + `useEffect`가 필요**하다.

**대응:** 새 목록 로더는 처음부터 `async + Paginated`로 만든다(위 2개 완료). 나머지 sync 로더(`getPrograms` 등 기존 호출부)는 **화면을 손볼 때 하나씩** async 목록 로더로 이관.

### 레퍼런스 구현 (이 패턴을 복붙)
- **로더:** `studentRoster.ts` → `queryStudentRoster` / `getRosterFilterOptions` / `getRosterSummary`
- **화면:** `pages/StudentList.tsx` → `useEffect`로 조회, `items`만 렌더, `totalCount`로 페이지네이션, 로딩 스피너, 필터 변경 시 1페이지 리셋
- 필터 드롭다운 옵션·헤더 집계는 **현재 페이지가 아니라 전체 집합**에서 → 별도 함수(`getRosterFilterOptions`, `getRosterSummary`). DB에선 집계 엔드포인트.

---

## 5. 목업 특유 관례 (DB 전환 시 정리)

- **`base JSON(seed) + localStorage 오버레이` 병합** = 현재 "쓰기". DB 전환 시 오버레이 쓰기(`persist`)가 `POST/PATCH`로, 읽기 병합이 서버 조회로 대체. (CLAUDE.md "이벤트 → JSON 반영 매핑"이 사실상 뮤테이션 계약)
- **`mockLatency()`** = 네트워크 지연 흉내(로딩 상태 검증용). DB 전환 시 제거.
- **cross-SPA import**(`src_admin`이 `src_v2/data` 참조) = 임시 비계. DB 전환 시 공유는 API로.

---

## 6. 체크리스트 (새 목록 화면 만들 때)
- [ ] 로더는 `async (params: ListParams) => Promise<Paginated<T>>`
- [ ] 화면은 `items`만 렌더 + `totalCount` 페이지네이션 (절대 전체 배열 렌더 X)
- [ ] 필터/검색/정렬은 **파라미터로** 로더에 전달 (클라에서 전체 필터링 X)
- [ ] 필터 옵션·집계는 전체 집합 함수로 별도 조회
- [ ] 로딩·빈상태·(추후)에러 상태 처리
- [ ] ID는 string, 날짜는 ISO, 키는 camelCase
