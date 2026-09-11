# UI 핸드오프 계약

새 UI 작업도 3역할 하네스를 사용한다.

```text
.ai/handoff/000X-{role}-{screen}/
├── image.png          # 선택: 사용자 참조 이미지
├── ui-spec.md         # 팀장(Opus) 확정 기획·데이터 연결·컴포넌트 재사용
├── implementation.md  # Sol 구현 기록
└── verification.md    # 팀장 최종 디자인·내용·동작 검증
```

## 팀장 규칙

- 학생은 `STU_README.md` + `src_v2/DESIGN.md`, 상담사는 `Counsel_README.md` + `src_admin/index.css`를 읽는다.
- 디자인은 `DESIGN.md` 토큰을 적용하며 새 팔레트·폰트를 만들지 않는다.
- `ui-spec.md`에 route, 문구, 동작, 재사용 컴포넌트, loader/selector를 명시한다.
- 데이터 변화가 없으면 `NO_DB_CHANGE`를 쓴다.
- 새 데이터나 API가 필요하면 `.ai/handoff-db/000X-{entity}/work-order.md`를 연결하고 DB 작업의 `PASS` 뒤 UI 구현을 시작한다.

## Sol 규칙

- `ui-spec.md`와 연결된 READY 골든 패스를 따른다.
- 화면에서 JSON/localStorage/API를 직접 읽지 않고 팀장이 지정한 loader/selector를 구독한다.
- 기존 컴포넌트와 디자인 토큰을 우선 재사용한다.
- `npm run build`를 통과하고 `implementation.md`에 결과를 남긴다.

## 팀장 검증

- 기획·용어·네비게이션·버튼 동작
- 디자인 토큰 drift와 하드코딩
- 데이터 loader/selector 및 연결된 DB 계약
- 접근성·오류·loading·empty 상태
- 실제 화면 왕복과 build

기존 폴더의 `data-contract.md`, `data-review.md`, `component-map.md`, `review.md`는 과거 이력으로 보존한다. 새 작업부터 위 네 파일 계약을 쓴다.
