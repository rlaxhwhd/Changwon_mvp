-- 학생 메인 팝업(캐러셀) — 예전 src_v2/data/popups.seed.json 을 대체한다.
-- 텍스트 공지(dc.notice)와 생명주기·형태가 다르다(이미지·링크·순서). 목록에 섞이지 않게 별도 표.
CREATE TABLE dc.main_popup (
 id text PRIMARY KEY,
 image_path text NOT NULL CHECK(image_path LIKE '/%' AND image_path NOT LIKE '//%'),
 alt text NOT NULL CHECK(btrim(alt)<>''),
 href text NOT NULL CHECK(href LIKE '/%' AND href NOT LIKE '//%'),
 sort_order integer NOT NULL,
 active boolean NOT NULL DEFAULT true,
 starts_at date,ends_at date,CHECK(starts_at IS NULL OR ends_at IS NULL OR starts_at<=ends_at),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE INDEX ix_main_popup_active ON dc.main_popup(sort_order) WHERE active;
GRANT SELECT ON dc.main_popup TO dc_app;

