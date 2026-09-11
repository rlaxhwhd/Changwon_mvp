# Mock → API 계약 테스트

DB로 옮기는 엔티티마다 `test_{entity}_contract.py`를 만든다.

1. 작업지시서가 지정한 기존 mock JSON에서 계약 fragment를 읽는다. 기존 mock이 없는 새 기능은 팀장이 구현 전에 승인한 `fixtures/{entity}.json`을 읽는다.
2. 실제 test client로 API를 호출한다.
3. 목록 envelope 등 작업지시서가 지정한 위치에서 비교 대상을 꺼낸다.
4. `assert_same_json_shape(mock_fragment, api_fragment)`를 호출한다.

키 이름, 중첩, 배열 item 구조, primitive type 중 하나라도 바뀌면 실패한다. 값의 동일성은 별도의 mapping/behavior assertion으로 확인한다. 배열 계약은 seeded API가 비어 있으면 실패하며 mock에 존재하는 모든 nullable/shape variant가 응답에도 있어야 한다. 빈 mock 배열은 item 계약을 표현하지 못하므로 팀장이 대표 객체 fixture를 먼저 승인한다.
