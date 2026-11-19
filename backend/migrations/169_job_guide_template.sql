-- 169: 채용공고 모집요강 템플릿 (2026-11-19 사용자 요청, 작업지시서 0017)
--
-- 템플릿 종류와 입력값을 공고 행에 둔다. 입력값은 공고 1건에 딸린 문서 한 덩어리라 따로 조회·집계·검색하지 않는다 → jsonb.
-- 회사명·공고제목·연봉·근무지·근무형태·마감·채용유형은 기존 컬럼에서 읽고 여기에 복사하지 않는다(한 사실 한 곳).
-- 키·길이 검증은 API(GuideFields, extra=forbid)가 한다. DB 는 열거·모양·짝만 지킨다.
ALTER TABLE dc.job_posting
  ADD COLUMN guide_template text,
  ADD COLUMN guide_fields jsonb,
  ADD CONSTRAINT posting_guide_template CHECK (guide_template IN ('POSTER','HIGHLIGHT','DOCUMENT')),
  ADD CONSTRAINT posting_guide_fields_object CHECK (guide_fields IS NULL OR jsonb_typeof(guide_fields)='object'),
  -- 템플릿을 끄면 입력값도 없다(숨은 값 저장 금지). 템플릿이 있으면 입력값 객체가 반드시 있다.
  ADD CONSTRAINT posting_guide_pair CHECK ((guide_template IS NULL)=(guide_fields IS NULL));
COMMENT ON COLUMN dc.job_posting.guide_template IS
  '모집요강 템플릿(NULL=사용 안 함). POSTER 포스터형 · HIGHLIGHT 핵심 숫자형 · DOCUMENT 요강 문서형';
COMMENT ON COLUMN dc.job_posting.guide_fields IS
  '템플릿 입력값(JSON object, guide_template 과 함께 NULL). 키·길이는 API(GuideFields)가 검증. 회사명·연봉·근무지·마감 등은 기존 컬럼에서 읽고 여기 복사하지 않는다';
