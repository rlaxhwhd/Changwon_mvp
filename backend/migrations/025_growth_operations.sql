-- 성장활동 — 학생이 직접 쓴 자료의 정본 한 벌.
--
-- 지금은 성장 홈·성장일지·포트폴리오가 각자 다른 저장소를 본다: 학생별 localStorage,
-- 학생별 JSON, **전 학생 공통 상수**, 화면 useState. 그래서 학생이 고친 내용이 상담사에게
-- 보이지 않고, 아무도 쓴 적 없는 실적이 모두에게 자기 것으로 보인다.
--
-- ★ 여기 만드는 것은 「학생이 쓴 자료」 한 벌뿐이다. 다음은 만들지 않는다.
--   · STAR 선발·마일리지·장학 — 정책이 없다(DB.md #29·#30). dc.star_track 을 읽기만 한다.
--   · 오늘 미션·퀘스트·XP·레벨·랭킹 — 문항·채점·보상 정책이 전부 화면 상수다(SPEC.md:484).
--     정책 없이 테이블을 만들면 임시 판정 로직이 된다(CLAUDE.md 14조).
--   · 자기소개서 — 022 의 dc.job_resume 가 정본이다. 포트폴리오는 그것을 읽는 projection 이다.
--   · 파일 바이트 — 022 의 dc.file_object 를 그대로 쓴다. 새 저장소를 만들지 않는다.
--
-- 자기신고(SELF_REPORTED)와 학사·기관이 확인한 사실(ACADEMIC_CERT 등)은 섞지 않는다.
-- 같은 자격을 이름이 같다고 자동 병합하지 않는다 — 검증 workflow 는 아직 없다.

-- ── 코드 ─────────────────────────────────────────────────────────────────
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order) VALUES
 ('GROWTH_ENTRY_KIND','성장 자료 종류','STRUCTURAL',true,80),
 ('GROWTH_SOURCE_KIND','성장 자료 출처','STRUCTURAL',true,81),
 ('GROWTH_JOURNAL_CATEGORY','성장일지 분류','OPERATIONAL',false,82),
 ('GROWTH_SKILL_CATEGORY','보유 기술 분류','OPERATIONAL',false,83),
 ('GROWTH_RECORD_CATEGORY','성장 기록 분류','OPERATIONAL',false,84);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('GROWTH_ENTRY_KIND','RECORD','성장 기록',0),
 ('GROWTH_ENTRY_KIND','JOURNAL','성장경험일지',1),
 ('GROWTH_ENTRY_KIND','PROJECT','프로젝트',2),
 ('GROWTH_ENTRY_KIND','SKILL','보유 기술',3),
 ('GROWTH_ENTRY_KIND','CERTIFICATE','자격증',4),
 ('GROWTH_ENTRY_KIND','LANGUAGE','어학',5),
 ('GROWTH_ENTRY_KIND','AWARD','수상',6),
 -- 학생이 직접 쓴 것과 기관이 확인한 것을 값으로 가른다. 화면이 배지를 다시 만들지 않는다.
 ('GROWTH_SOURCE_KIND','SELF_REPORTED','학생 자기신고',0),
 ('GROWTH_SOURCE_KIND','IMPORTED','이관 자료',1),
 ('GROWTH_JOURNAL_CATEGORY','PARTTIME','아르바이트',0),
 ('GROWTH_JOURNAL_CATEGORY','TEAM_PROJECT','팀프로젝트',1),
 ('GROWTH_JOURNAL_CATEGORY','ETC','기타 활동',2),
 ('GROWTH_SKILL_CATEGORY','LANGUAGE','언어',0),
 ('GROWTH_SKILL_CATEGORY','FRAMEWORK','프레임워크',1),
 ('GROWTH_SKILL_CATEGORY','TOOL','도구',2),
 ('GROWTH_SKILL_CATEGORY','DATABASE','DB',3),
 ('GROWTH_SKILL_CATEGORY','DESIGN','디자인',4),
 ('GROWTH_RECORD_CATEGORY','DIAGNOSIS','진단',0),
 ('GROWTH_RECORD_CATEGORY','PROGRAM','비교과',1),
 ('GROWTH_RECORD_CATEGORY','ACHIEVEMENT','성과',2),
 ('GROWTH_RECORD_CATEGORY','ETC','기타',3);

-- ── 프로필 ───────────────────────────────────────────────────────────────
-- 이름·학번·학과·학점은 학사 유래라 여기 복제하지 않는다(CLAUDE.md 1조).
-- 자기입력 연락처만 담는다 — 현행 화면은 'student@cwnu.ac.kr'·'010-1234-5678' 을
-- 모든 학생에게 합성해 보여 주고 있었다. 없는 값은 빈 값이다.
CREATE TABLE dc.growth_profile (
 student_uid   text PRIMARY KEY REFERENCES dc.student(intg_uid),
 intro         text NOT NULL DEFAULT '' CHECK(length(intro)<=5000),
 contact_email text CHECK(contact_email IS NULL OR length(contact_email) BETWEEN 3 AND 320),
 contact_phone text CHECK(contact_phone IS NULL OR length(contact_phone) BETWEEN 3 AND 40),
 version       bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at    timestamptz NOT NULL DEFAULT now(),
 updated_at    timestamptz NOT NULL DEFAULT now(),
 updated_by    text REFERENCES dc.person(intg_uid)
);

-- ── 자료 1건 ─────────────────────────────────────────────────────────────
-- 검색·소유·날짜·분류·상태·동시성은 일반 열이고, 종류마다 다른 본문만 content jsonb 다.
-- payload 에 owner/verified/score 같은 권한 필드를 섞을 수 없다.
CREATE TABLE dc.growth_entry (
 id             text PRIMARY KEY,
 student_uid    text NOT NULL REFERENCES dc.growth_profile(student_uid),
 kind_code      text NOT NULL,
 kind_group     text GENERATED ALWAYS AS ('GROWTH_ENTRY_KIND') STORED,
 category_code  text,
 -- 분류 사전이 종류마다 다르다. kind 에서 group 을 만들어 복합 FK 로 고정한다
 -- (022 job_posting_option 과 같은 규약).
 category_group text GENERATED ALWAYS AS (CASE kind_code
   WHEN 'JOURNAL' THEN 'GROWTH_JOURNAL_CATEGORY' WHEN 'SKILL' THEN 'GROWTH_SKILL_CATEGORY'
   WHEN 'RECORD' THEN 'GROWTH_RECORD_CATEGORY' END) STORED,
 title          text NOT NULL CHECK(btrim(title)<>'' AND length(title)<=200),
 -- 월 단위·기간 문자열을 첫날로 조작하지 않는다. 원문과 정밀도를 함께 보존한다.
 occurred_on    date,
 date_text      text CHECK(date_text IS NULL OR length(date_text)<=100),
 date_precision text NOT NULL DEFAULT 'UNKNOWN'
   CHECK(date_precision IN ('DAY','MONTH','YEAR','RANGE','UNKNOWN')),
 tags           text[] NOT NULL DEFAULT '{}' CHECK(array_length(tags,1) IS NULL OR array_length(tags,1)<=20),
 content        jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(content)='object'),
 bookmarked     boolean NOT NULL DEFAULT false,
 resume_used    boolean NOT NULL DEFAULT false,
 -- 학생이 명시적으로 고른 기존 자격 사전 항목일 때만 연결한다. 이름이 같다고 잇지 않는다.
 cert_id        text REFERENCES dc.cert(cert_id),
 source_kind    text NOT NULL DEFAULT 'SELF_REPORTED',
 source_group   text GENERATED ALWAYS AS ('GROWTH_SOURCE_KIND') STORED,
 legacy_ref     jsonb,
 version        bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at     timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 updated_at     timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES dc.person(intg_uid),
 -- 삭제는 논리삭제다. 제출·AI 입력에 쓰인 과거 본문이 사라지면 안 된다.
 deleted_at     timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 UNIQUE(student_uid,id),
 CONSTRAINT growth_entry_kind_fk FOREIGN KEY(kind_group,kind_code) REFERENCES dc.code_item(group_code,code),
 CONSTRAINT growth_entry_category_fk FOREIGN KEY(category_group,category_code)
   REFERENCES dc.code_item(group_code,code),
 CONSTRAINT growth_entry_source_fk FOREIGN KEY(source_group,source_kind)
   REFERENCES dc.code_item(group_code,code),
 CONSTRAINT growth_entry_deleted_pair CHECK((deleted_at IS NULL)=(deleted_by IS NULL)),
 CONSTRAINT growth_entry_cert_scope CHECK(cert_id IS NULL OR kind_code='CERTIFICATE'),
 CONSTRAINT growth_entry_date_pair CHECK(date_precision<>'DAY' OR occurred_on IS NOT NULL)
);
CREATE INDEX growth_entry_kind ON dc.growth_entry(student_uid,kind_code,occurred_on DESC NULLS LAST,id)
 WHERE deleted_at IS NULL;
CREATE INDEX growth_entry_category ON dc.growth_entry(student_uid,category_code,updated_at DESC,id)
 WHERE deleted_at IS NULL;
CREATE INDEX growth_entry_bookmark ON dc.growth_entry(student_uid,updated_at DESC,id)
 WHERE deleted_at IS NULL AND bookmarked;
CREATE INDEX growth_entry_tags ON dc.growth_entry USING gin(tags);

-- ── 자료 사건 ────────────────────────────────────────────────────────────
-- before/after 에는 삭제 전 원문이 들어간다 → 본인만 본문을 조회한다.
-- 교직원에게는 행위·시각·행위자만 내려보낸다(API 가 가른다).
CREATE TABLE dc.growth_event (
 id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_uid     text NOT NULL REFERENCES dc.growth_profile(student_uid),
 entry_id        text,
 action          text NOT NULL CHECK(action IN
   ('PROFILE_CREATE','PROFILE_UPDATE','CREATE','UPDATE','DELETE','FILE_LINK','FILE_UNLINK','IMPORT')),
 entry_version_before   bigint, entry_version_after bigint,
 profile_version_before bigint, profile_version_after bigint,
 before_value    jsonb, after_value jsonb NOT NULL,
 reason          text NOT NULL DEFAULT '',
 actor_uid       text REFERENCES dc.person(intg_uid),
 transaction_id  uuid NOT NULL,
 created_at      timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT growth_event_entry_fk FOREIGN KEY(student_uid,entry_id)
   REFERENCES dc.growth_entry(student_uid,id) ON DELETE RESTRICT,
 CONSTRAINT growth_event_entry_scope
   CHECK((entry_id IS NULL)=(action IN ('PROFILE_CREATE','PROFILE_UPDATE'))),
 CONSTRAINT growth_event_actor CHECK(action='IMPORT' OR actor_uid IS NOT NULL)
);
CREATE INDEX growth_event_timeline ON dc.growth_event(student_uid,created_at DESC,id);
CREATE INDEX growth_event_entry ON dc.growth_event(entry_id,created_at DESC,id) WHERE entry_id IS NOT NULL;
CREATE TRIGGER growth_event_immutable BEFORE UPDATE OR DELETE ON dc.growth_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 첨부 ─────────────────────────────────────────────────────────────────
-- 해제한 파일을 다시 붙이는 일이 있다. (entry,file) 을 PK 로 두면 그 재연결이 기존 행의
-- unlinked_at 을 지우는 UPDATE 가 되어 연결 이력이 사라진다 → 대리 PK + 「현재 연결」 부분 유니크.
CREATE TABLE dc.growth_entry_file (
 id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_uid text NOT NULL,
 entry_id    text NOT NULL,
 file_id     text NOT NULL REFERENCES dc.file_object(id) ON DELETE RESTRICT,
 position    integer NOT NULL DEFAULT 0 CHECK(position>=0),
 linked_at   timestamptz NOT NULL DEFAULT now(), linked_by text REFERENCES dc.person(intg_uid),
 unlinked_at timestamptz, unlinked_by text REFERENCES dc.person(intg_uid),
 CONSTRAINT growth_entry_file_entry_fk FOREIGN KEY(student_uid,entry_id)
   REFERENCES dc.growth_entry(student_uid,id) ON DELETE RESTRICT,
 CONSTRAINT growth_entry_file_unlinked_pair CHECK((unlinked_at IS NULL)=(unlinked_by IS NULL))
);
CREATE UNIQUE INDEX growth_entry_file_current ON dc.growth_entry_file(entry_id,file_id)
 WHERE unlinked_at IS NULL;
CREATE INDEX growth_entry_file_order ON dc.growth_entry_file(entry_id,position,id) WHERE unlinked_at IS NULL;

-- 파일 소유 종류를 넓힌다. 채용 전용이던 allowlist 에 성장 자료 첨부를 더한다 —
-- 「모든 종류 허용」으로 완화하지 않는다.
ALTER TABLE dc.file_object
 DROP CONSTRAINT file_object_owner_kind_check,
 DROP CONSTRAINT file_object_slot_check,
 ADD CONSTRAINT file_object_owner_kind_check
   CHECK(owner_kind IN ('JOB_POSTING','JOB_APPLICATION_ATTEMPT','GROWTH_ENTRY')),
 ADD CONSTRAINT file_object_slot_check
   CHECK(slot IN ('LOGO','ATTACHMENT','RESUME','PORTFOLIO_ATTACHMENT'));

-- ── 비교과 찜 ────────────────────────────────────────────────────────────
-- 현행 localStorage 키에는 학생 ID 가 없어 계정을 바꿔도 같은 찜이 보였다.
-- 소유자를 추측해 수입하지 않는다 — 정당한 소유자가 없기 때문이다(022 job_wishlist 와 같은 판정).
-- 해제해도 행을 지우지 않는다: 지우면 version 이 0 으로 돌아가 낙관적 잠금 토큰이 재사용된다.
CREATE TABLE dc.program_wishlist (
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 program_id  text NOT NULL REFERENCES dc.program(id) ON DELETE RESTRICT,
 wished      boolean NOT NULL DEFAULT true,
 version     bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at  timestamptz NOT NULL DEFAULT now(),
 updated_at  timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(student_uid,program_id)
);
CREATE INDEX program_wishlist_owner ON dc.program_wishlist(student_uid,wished,updated_at DESC,program_id);

CREATE TABLE dc.program_wishlist_event (
 id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_uid    text NOT NULL, program_id text NOT NULL,
 wished_before  boolean, wished_after boolean NOT NULL,
 version_before bigint, version_after bigint NOT NULL,
 actor_uid      text NOT NULL REFERENCES dc.person(intg_uid),
 created_at     timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT program_wishlist_event_fk FOREIGN KEY(student_uid,program_id)
   REFERENCES dc.program_wishlist(student_uid,program_id) ON DELETE RESTRICT
);
CREATE INDEX program_wishlist_event_target
 ON dc.program_wishlist_event(student_uid,program_id,created_at DESC,id);
CREATE TRIGGER program_wishlist_event_immutable BEFORE UPDATE OR DELETE ON dc.program_wishlist_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 권한 ─────────────────────────────────────────────────────────────────
-- 사건은 INSERT 만 준다. 물리삭제는 어디에도 주지 않는다 — 성장 자료의 삭제는 논리삭제다.
GRANT SELECT,INSERT,UPDATE ON dc.growth_profile,dc.growth_entry,dc.program_wishlist TO dc_app;
GRANT SELECT,INSERT,UPDATE ON dc.growth_entry_file TO dc_app;
GRANT SELECT,INSERT ON dc.growth_event,dc.program_wishlist_event TO dc_app;
