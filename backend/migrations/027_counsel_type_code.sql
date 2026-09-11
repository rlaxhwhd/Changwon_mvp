-- 상담 종류 코드를 채우고 한글 매칭을 끊는다.
--
-- 지금까지 진로·취업 상담만 `type_code` 가 비어 있었다. 심리는 PSY, 교수는 PROF 가
-- 들어가는데 진로취업만 한글 `legacy_type='진로취업'` 으로 식별됐다. 그래서 서버가
-- 한글 리터럴을 값처럼 써야 했고(CLAUDE.md 4조 위반), 게이트 술어가 서버와 화면에서
-- 두 벌로 갈려 초안 로드맵에도 취업지원이 열리는 결함이 났다.
--
-- ★ 진로와 취업을 CAREER / JOB 으로 나누지 않는다(2026-09-09 결정).
--   현행 운영이 둘을 나눈 적이 없어 21건 전부 어느 쪽인지 알 수 없다. 나누려면
--   행마다 「이건 진로였나 취업이었나」를 지어내야 한다. JOB 은 CHECK 에 남겨 두되
--   쓰지 않는다 — 나중에 나눌 때 코드 표(gates.COUNSEL_TYPE_CODE)만 고치면 된다.
--
-- ⚠ CARE 7+ 는 여기서 채울 것이 없다. 그것은 종류가 아니라 트랙이고
--   `care_track` 이 이미 갖고 있다. 이 마이그레이션은 두 축을 섞지 않는다.
--     type_code  = CAREER | JOB | PSY | PROF   (상담 종류)
--     care_track = general | care7             (진로·취업 안의 트랙)

UPDATE dc.counsel_request SET type_code='CAREER'
 WHERE type_code IS NULL AND legacy_type='진로취업';

-- 남은 NULL 이 있으면 여기서 멈춘다. 조용히 통과시키면 폴백이 되살아난다.
DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM dc.counsel_request WHERE type_code IS NULL;
  IF remaining > 0 THEN
    RAISE EXCEPTION '상담 종류 코드가 비어 있는 행이 % 건 남았다', remaining;
  END IF;
END $$;

ALTER TABLE dc.counsel_request ALTER COLUMN type_code SET NOT NULL;

-- 트랙은 진로·취업 상담에만 있다. 심리·교수에 트랙이 붙거나, 진로·취업에 트랙이
-- 없으면 게이트가 판정할 수 없다 — 그 상태를 DB 가 거부한다.
-- (counsel.py 가 신청 때 이미 검사하지만, 시드와 직접 INSERT 는 그 경로를 안 탄다)
ALTER TABLE dc.counsel_request
  ADD CONSTRAINT counsel_track_only_for_career
  CHECK ((type_code IN ('CAREER','JOB')) = (care_track IS NOT NULL));
