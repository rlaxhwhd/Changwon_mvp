-- 채용·취업 운영 — 공고·기업·전형·지원·회차·찜·자소서를 SQL 로 옮긴다.
--
-- 018(비교과)의 규약을 그대로 따른다: 분류는 운영 코드(code_item 복합 FK + 생성열),
-- 상태·전이는 구조 코드(CHECK 로 고정), 이력은 append-only(reject_history_change).
--
-- 채용에만 있는 것 셋:
--   ① 전형 단계가 공고마다 다르다 → enum 이 아니라 데이터(dc.job_stage)다.
--   ② 취소 후 재지원이 있다 → 지원 1행은 현재만 들고, 제출 스냅샷은 회차(attempt)로 쌓는다.
--   ③ 제출 서류가 파일이다 → dc.file_object 에 메타만 두고 바이트는 웹루트 밖 볼륨에 둔다
--      (DB 안에 바이너리를 넣지 않는다 — 백업이 무거워지고 복구가 길어진다. DB.md #41).
--
-- 자소서(dc.job_resume)의 ID r1·r2 는 021 의 ai_run 이 이미 가리키고 있고 그 행은
-- append-only 라 사후 재매핑이 불가능하다. 실제 시드는 023 이 채운다.

-- ── 운영 코드 7종 ────────────────────────────────────────────────────────
-- 전부 신설이다. 기존 그룹과 의미가 겹치는 것이 없다
-- (JOB_CATEGORY=직종 ≠ PROGRAM_CATEGORY=비교과 분류).
-- legacy 는 NULL 로 둔다 — 현행 Oracle 값이 미확인이다(DB.md #17·#20). 추측해 채우지 않는다.
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order) VALUES
 ('JOB_COMPANY_TYPE','기업 구분','OPERATIONAL',false,60),
 ('JOB_EMPLOYMENT_TYPE','근무 형태','OPERATIONAL',false,61),
 ('JOB_CATEGORY','직종','OPERATIONAL',false,62),
 ('JOB_CAREER_TYPE','경력 구분','OPERATIONAL',false,63),
 ('JOB_GENDER','모집 성별','OPERATIONAL',false,64),
 ('JOB_REGION','근무 지역','OPERATIONAL',false,65),
 ('JOB_RESUME_CATEGORY','자기소개서 분야','OPERATIONAL',false,66);

INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('JOB_COMPANY_TYPE','GENERAL','일반기업',0),
 ('JOB_COMPANY_TYPE','VENTURE','벤처기업',1),
 ('JOB_COMPANY_TYPE','STRONG','강소기업',2),
 ('JOB_COMPANY_TYPE','MIDSIZE','중견기업',3),
 ('JOB_COMPANY_TYPE','PUBLIC','공기업',4),
 ('JOB_COMPANY_TYPE','LARGE','대기업',5),
 ('JOB_COMPANY_TYPE','FOREIGN','외국계',6),
 ('JOB_COMPANY_TYPE','ETC','기타',7),
 ('JOB_EMPLOYMENT_TYPE','FULLTIME','정규직',0),
 ('JOB_EMPLOYMENT_TYPE','CONTRACT','계약직',1),
 ('JOB_EMPLOYMENT_TYPE','INTERN_HIRE','채용형 인턴',2),
 ('JOB_EMPLOYMENT_TYPE','INTERN_EXP','체험형 인턴',3),
 ('JOB_CATEGORY','MGMT','경영/사무',0),
 ('JOB_CATEGORY','MARKETING','마케팅/광고',1),
 ('JOB_CATEGORY','TRADE','무역/유통',2),
 ('JOB_CATEGORY','SALES','영업/고객상담',3),
 ('JOB_CATEGORY','IT','IT/인터넷',4),
 ('JOB_CATEGORY','RND','연구개발',5),
 ('JOB_CATEGORY','MFG','생산/제조',6),
 ('JOB_CATEGORY','DESIGN','디자인',7),
 ('JOB_CATEGORY','MEDIA','미디어',8),
 ('JOB_CATEGORY','SERVICE','서비스',9),
 ('JOB_CATEGORY','EDU','교육',10),
 ('JOB_CATEGORY','CONSTRUCT','건설',11),
 ('JOB_CATEGORY','MEDICAL','보건/의료',12),
 ('JOB_CATEGORY','SPECIAL','전문/특수직',13),
 ('JOB_CATEGORY','ETC','기타',14),
 ('JOB_CAREER_TYPE','NEW','신입',0),
 ('JOB_CAREER_TYPE','EXPERIENCED','경력',1),
 ('JOB_GENDER','MALE','남자',0),
 ('JOB_GENDER','FEMALE','여자',1),
 ('JOB_GENDER','ANY','무관',2),
 -- '전체' 는 UI 필터 sentinel 이라 지역 항목이 아니다(지역 제한 없음 = 관계행 0개).
 ('JOB_REGION','SEOUL','서울',0),
 ('JOB_REGION','BUSAN','부산',1),
 ('JOB_REGION','DAEGU','대구',2),
 ('JOB_REGION','INCHEON','인천',3),
 ('JOB_REGION','GWANGJU','광주',4),
 ('JOB_REGION','DAEJEON','대전',5),
 ('JOB_REGION','ULSAN','울산',6),
 ('JOB_REGION','SEJONG','세종',7),
 ('JOB_REGION','GYEONGGI','경기',8),
 ('JOB_REGION','GANGWON','강원',9),
 ('JOB_REGION','CHUNGBUK','충북',10),
 ('JOB_REGION','CHUNGNAM','충남',11),
 ('JOB_REGION','JEONBUK','전북',12),
 ('JOB_REGION','JEONNAM','전남',13),
 ('JOB_REGION','GYEONGBUK','경북',14),
 ('JOB_REGION','GYEONGNAM','경남',15),
 ('JOB_REGION','JEJU','제주',16),
 -- AiResume 의 분야 20종 + 기존 저장 자소서가 쓰던 2종. 라벨을 잃지 않으려고 합집합을 넣는다.
 ('JOB_RESUME_CATEGORY','MOTIVE','지원동기',0),
 ('JOB_RESUME_CATEGORY','GROWTH','성장과정',1),
 ('JOB_RESUME_CATEGORY','PERSONALITY','성격의 장단점',2),
 ('JOB_RESUME_CATEGORY','ACADEMIC','학업 및 전문성',3),
 ('JOB_RESUME_CATEGORY','EXPERIENCE','경험 및 경력',4),
 ('JOB_RESUME_CATEGORY','ASPIRATION','입사 후 포부',5),
 ('JOB_RESUME_CATEGORY','COMPETENCY','직무역량',6),
 ('JOB_RESUME_CATEGORY','PROJECT','프로젝트 경험',7),
 ('JOB_RESUME_CATEGORY','TEAMWORK','팀워크 경험',8),
 ('JOB_RESUME_CATEGORY','LEADERSHIP','리더십 경험',9),
 ('JOB_RESUME_CATEGORY','PROBLEM','문제해결 경험',10),
 ('JOB_RESUME_CATEGORY','CONFLICT','갈등관리 경험',11),
 ('JOB_RESUME_CATEGORY','CHALLENGE','도전 경험',12),
 ('JOB_RESUME_CATEGORY','FAILURE','실패 극복 경험',13),
 ('JOB_RESUME_CATEGORY','CREATIVITY','창의적 사고',14),
 ('JOB_RESUME_CATEGORY','CUSTOMER','고객중심 경험',15),
 ('JOB_RESUME_CATEGORY','DATA','데이터 활용 경험',16),
 ('JOB_RESUME_CATEGORY','MAJOR_CHOICE','전공 선택 이유',17),
 ('JOB_RESUME_CATEGORY','COMPANY_CHOICE','회사 선택 기준',18),
 ('JOB_RESUME_CATEGORY','VALUES','사회공헌 및 가치관',19),
 ('JOB_RESUME_CATEGORY','STRENGTH','강점',20),
 ('JOB_RESUME_CATEGORY','JOB_RELATED','직무관련경험',21);

-- ── 파일 ─────────────────────────────────────────────────────────────────
-- 바이트는 DB 밖(웹루트 밖 볼륨)에 있고 여기에는 메타만 둔다. 저장 이름은 서버가
-- 부여한 id 자체다 — 업로드된 원본 이름을 경로에 쓰지 않는다(경로 조작 차단).
-- 정적 서빙하지 않는다. 다운로드는 API 가 소유·범위를 확인한 뒤 스트리밍한다.
-- owner_id 는 다형 참조라 FK 를 걸지 않는다(ai_run.subject_id 와 같은 규약).
-- 업로드 예약 시점에는 owner_id 가 없다(attempt 가 아직 없다) → NULL 로 두고
-- 신청 트랜잭션에서 확정한다. 그 전까지 소유자는 업로더 본인뿐이다.
CREATE TABLE dc.file_object (
 id            text PRIMARY KEY,
 owner_kind    text NOT NULL CHECK(owner_kind IN ('JOB_POSTING','JOB_APPLICATION_ATTEMPT')),
 owner_id      text,
 slot          text NOT NULL CHECK(slot IN ('LOGO','ATTACHMENT','RESUME')),
 original_name text NOT NULL CHECK(btrim(original_name)<>''),
 content_type  text NOT NULL,
 byte_size     bigint NOT NULL CHECK(byte_size>0),
 checksum      text NOT NULL,
 state         text NOT NULL DEFAULT 'READY' CHECK(state IN ('READY','DELETED')),
 uploaded_by   text NOT NULL REFERENCES dc.person(intg_uid),
 uploaded_at   timestamptz NOT NULL DEFAULT now(),
 deleted_at    timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 CONSTRAINT file_object_deleted_pair CHECK((state='DELETED')=(deleted_at IS NOT NULL))
);
CREATE INDEX file_object_owner ON dc.file_object(owner_kind,owner_id,slot) WHERE owner_id IS NOT NULL;

-- ── 기업 ─────────────────────────────────────────────────────────────────
-- 이름을 job_company 가 아니라 company 로 둔다. 조교 「학과 추천기업 관리」
-- (menu 'asst-companies')가 같은 사전을 쓴다 — 채용 전용 자산이 아니다.
-- 회사명 UNIQUE 를 걸지 않는다: 이름만 같은 두 회사를 자동 병합하지 않는다.
CREATE TABLE dc.company (
 id                 text PRIMARY KEY,
 display_name       text NOT NULL CHECK(btrim(display_name)<>''),
 company_type_group text GENERATED ALWAYS AS ('JOB_COMPANY_TYPE') STORED,
 company_type_code  text,
 website_url        text,
 source_system      text, source_key text,
 version            bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at         timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 updated_at         timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES dc.person(intg_uid),
 deleted_at         timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 CONSTRAINT company_type_fk FOREIGN KEY(company_type_group,company_type_code)
   REFERENCES dc.code_item(group_code,code),
 CONSTRAINT company_source_pair CHECK((source_system IS NULL)=(source_key IS NULL))
);
CREATE UNIQUE INDEX company_source ON dc.company(source_system,source_key) WHERE source_key IS NOT NULL;
CREATE INDEX company_active ON dc.company(display_name) WHERE deleted_at IS NULL;

-- ── 공고 ─────────────────────────────────────────────────────────────────
-- company_id 는 nullable 이다. 외부 수집 공고는 회사명 문자열뿐이고 기업 실체가 없다 —
-- NOT NULL 로 두면 가져오는 것만으로 기업 사전이 오염된다. 교내(manual) 공고만 필수.
CREATE TABLE dc.job_posting (
 id                    text PRIMARY KEY,
 company_id            text REFERENCES dc.company(id),
 company_name_snapshot text NOT NULL CHECK(btrim(company_name_snapshot)<>''),
 role                  text NOT NULL CHECK(btrim(role)<>''),
 tags                  text[] NOT NULL DEFAULT '{}',
 salary_text           text, location_text text,
 career_primary_group  text GENERATED ALWAYS AS ('JOB_CAREER_TYPE') STORED,
 career_primary_code   text,
 -- 등록 시점에 선언된 기업 구분. 기업 사전(dc.company.company_type_code)과 두 벌인 것이
 -- 아니라 스냅샷이다(CLAUDE.md 규칙 2) — 외부 수집 공고에는 기업 실체가 없고
 -- 값만 있으므로 이 열이 없으면 그 값을 잃는다.
 company_type_group    text GENERATED ALWAYS AS ('JOB_COMPANY_TYPE') STORED,
 company_type_code     text,
 source                text NOT NULL CHECK(source IN ('manual','external')),
 source_system         text, source_key text,
 recruit_type          text NOT NULL CHECK(recruit_type IN ('GENERAL','RECOMMENDATION')),
 stored_status         text NOT NULL CHECK(stored_status IN ('POSTED','CLOSED')),
 deadline_mode         text NOT NULL CHECK(deadline_mode IN ('DATE','ALWAYS','ON_HIRE')),
 deadline_date         date, deadline_raw text,
 posted_at             timestamptz NOT NULL,
 salary_negotiable     boolean NOT NULL DEFAULT false,
 url_title_link        boolean NOT NULL DEFAULT false,
 email_apply           boolean NOT NULL DEFAULT false,
 apply_url             text, email text,
 content_html          text,
 content_format        text NOT NULL DEFAULT 'HTML' CHECK(content_format IN ('HTML','TEXT')),
 logo_file_id          text REFERENCES dc.file_object(id),
 record_origin         text NOT NULL DEFAULT 'LIVE' CHECK(record_origin IN ('LIVE','LEGACY')),
 version               bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at            timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 updated_at            timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES dc.person(intg_uid),
 deleted_at            timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 CONSTRAINT posting_career_fk FOREIGN KEY(career_primary_group,career_primary_code)
   REFERENCES dc.code_item(group_code,code),
 CONSTRAINT posting_company_type_fk FOREIGN KEY(company_type_group,company_type_code)
   REFERENCES dc.code_item(group_code,code),
 CONSTRAINT posting_source_pair CHECK((source_system IS NULL)=(source_key IS NULL)),
 -- 검증된 기업으로만 교내 공고를 만든다. 외부 공고는 이름 스냅샷만 갖는다.
 CONSTRAINT posting_manual_company CHECK(source<>'manual' OR company_id IS NOT NULL),
 -- 상시(ALWAYS)만 마감일이 없다. DATE·ON_HIRE 는 날짜가 반드시 있다.
 CONSTRAINT posting_deadline_shape
   CHECK(record_origin='LEGACY' OR (deadline_date IS NULL)=(deadline_mode='ALWAYS'))
);
CREATE UNIQUE INDEX job_posting_source ON dc.job_posting(source_system,source_key) WHERE source_key IS NOT NULL;
CREATE INDEX job_posting_listing ON dc.job_posting(source,recruit_type,posted_at DESC,id) WHERE deleted_at IS NULL;
CREATE INDEX job_posting_deadline ON dc.job_posting(stored_status,deadline_date,id) WHERE deleted_at IS NULL;
CREATE INDEX job_posting_company ON dc.job_posting(company_id) WHERE company_id IS NOT NULL;

-- 복수 선택 분류. kind 에서 group_code 를 생성열로 만들어 복합 FK 로 고정한다
-- (018 program_category_fk · 019 ai_run_kind_fk 와 같은 규약).
CREATE TABLE dc.job_posting_option (
 posting_id text NOT NULL REFERENCES dc.job_posting(id),
 kind       text NOT NULL CHECK(kind IN ('EMPLOYMENT','CATEGORY','CAREER','GENDER','REGION')),
 group_code text GENERATED ALWAYS AS (CASE kind
   WHEN 'EMPLOYMENT' THEN 'JOB_EMPLOYMENT_TYPE' WHEN 'CATEGORY' THEN 'JOB_CATEGORY'
   WHEN 'CAREER' THEN 'JOB_CAREER_TYPE' WHEN 'GENDER' THEN 'JOB_GENDER'
   WHEN 'REGION' THEN 'JOB_REGION' END) STORED,
 code       text NOT NULL,
 PRIMARY KEY(posting_id,kind,code),
 CONSTRAINT job_posting_option_fk FOREIGN KEY(group_code,code) REFERENCES dc.code_item(group_code,code)
);
CREATE INDEX job_posting_option_filter ON dc.job_posting_option(kind,code,posting_id);

CREATE TABLE dc.job_posting_event (
 id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 posting_id  text NOT NULL REFERENCES dc.job_posting(id),
 seq         bigint NOT NULL CHECK(seq>0),
 action      text NOT NULL CHECK(action IN ('CREATE','UPDATE','CLOSE','REOPEN','DELETE','STAGES_CHANGE','IMPORT')),
 before_value jsonb, after_value jsonb NOT NULL, reason text NOT NULL DEFAULT '',
 actor_uid   text REFERENCES dc.person(intg_uid),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(posting_id,seq)
);
CREATE TRIGGER job_posting_event_immutable BEFORE UPDATE OR DELETE ON dc.job_posting_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 전형 단계 ────────────────────────────────────────────────────────────
-- 단계는 enum 이 아니라 데이터다 — 공고마다 수와 이름이 다르다.
-- system_key 가 있는 두 단계(서류 검토·기업 전달)는 교내 절차라 이름·순서·삭제 불가.
-- 활성 position UNIQUE 는 부분 인덱스라 DEFERRABLE 이 불가능하다 → 재정렬은
-- 임시 순서 영역(음수)을 거쳐 두 단계로 쓴다.
CREATE TABLE dc.job_stage (
 posting_id text NOT NULL REFERENCES dc.job_posting(id),
 id         text NOT NULL,
 system_key text CHECK(system_key IN ('REVIEW','FORWARD')),
 position   integer NOT NULL,
 name       text NOT NULL CHECK(btrim(name)<>''),
 deleted_at timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 PRIMARY KEY(posting_id,id)
);
CREATE UNIQUE INDEX job_stage_position ON dc.job_stage(posting_id,position) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX job_stage_system ON dc.job_stage(posting_id,system_key)
 WHERE system_key IS NOT NULL AND deleted_at IS NULL;

-- ── 지원 ─────────────────────────────────────────────────────────────────
-- 학생×공고 1행. 재지원은 새 행이 아니라 회차(attempt)를 올린다 —
-- 직전 제출 스냅샷·서류 귀속·취소 이력을 덮어쓰지 않기 위해서다.
CREATE TABLE dc.job_application (
 id                 text PRIMARY KEY,
 posting_id         text NOT NULL REFERENCES dc.job_posting(id),
 student_uid        text NOT NULL REFERENCES dc.student(intg_uid),
 current_attempt_no integer NOT NULL CHECK(current_attempt_no>0),
 status             text NOT NULL CHECK(status IN ('APPLIED','IN_PROGRESS','PASSED','REJECTED','CANCELED')),
 current_stage_id   text,
 applied_at         timestamptz NOT NULL, canceled_at timestamptz,
 record_origin      text NOT NULL DEFAULT 'LIVE' CHECK(record_origin IN ('LIVE','LEGACY')),
 version            bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at         timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 updated_at         timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES dc.person(intg_uid),
 UNIQUE(posting_id,student_uid), UNIQUE(posting_id,id),
 CONSTRAINT job_application_stage_fk FOREIGN KEY(posting_id,current_stage_id)
   REFERENCES dc.job_stage(posting_id,id),
 CONSTRAINT job_application_canceled_at CHECK((status='CANCELED')=(canceled_at IS NOT NULL)),
 CONSTRAINT job_application_stage_scope
   CHECK(current_stage_id IS NULL OR status IN ('IN_PROGRESS','PASSED','REJECTED'))
);
CREATE INDEX job_application_by_posting ON dc.job_application(posting_id,status,applied_at DESC,id);
CREATE INDEX job_application_by_student ON dc.job_application(student_uid,applied_at DESC,id);
CREATE INDEX job_application_on_stage ON dc.job_application(posting_id,current_stage_id)
 WHERE status='IN_PROGRESS';

-- 제출 회차. 신청 시점 학적 스냅샷을 여기에 둔다(CLAUDE.md 규칙 2).
-- 스냅샷은 서버가 현재 학사 데이터에서 만든다 — 클라이언트가 준 신원은 받지 않는다.
CREATE TABLE dc.job_application_attempt (
 id                    text PRIMARY KEY,
 application_id        text NOT NULL REFERENCES dc.job_application(id),
 attempt_no            integer NOT NULL CHECK(attempt_no>0),
 submitted_at          timestamptz NOT NULL DEFAULT now(),
 snap_student_no       text, snap_name text, snap_major_label text, snap_grade integer,
 snap_enrollment_status text,
 snap_college_code     text, snap_college_label text,
 snap_dept_code        text, snap_dept_label text,
 snap_student_type     text,
 attachment_kind       text CHECK(attachment_kind IN ('PORTFOLIO','RESUME_FILE')),
 attachment_file_id    text REFERENCES dc.file_object(id),
 portfolio_owner_uid   text REFERENCES dc.student(intg_uid),
 attachment_state      text NOT NULL DEFAULT 'UNKNOWN'
   CHECK(attachment_state IN ('AVAILABLE','MISSING_BINARY','DEPENDENCY_UNAVAILABLE','UNKNOWN')),
 legacy_file_name      text,
 eligibility_evidence  jsonb,
 record_origin         text NOT NULL DEFAULT 'LIVE' CHECK(record_origin IN ('LIVE','LEGACY')),
 created_at            timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 UNIQUE(application_id,attempt_no),
 -- 파일 제출은 실제 파일이 있어야 성립한다. 이름만 남은 legacy 는 MISSING_BINARY 로 보존한다.
 CONSTRAINT attempt_resume_file CHECK(record_origin='LEGACY' OR attachment_kind<>'RESUME_FILE'
   OR attachment_file_id IS NOT NULL),
 CONSTRAINT attempt_portfolio_owner CHECK(attachment_kind<>'PORTFOLIO' OR portfolio_owner_uid IS NOT NULL)
);
CREATE INDEX job_attempt_latest ON dc.job_application_attempt(application_id,attempt_no DESC);
CREATE TRIGGER job_attempt_immutable BEFORE UPDATE OR DELETE ON dc.job_application_attempt
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- 첫 신청은 application→attempt 삽입 순환이라 커밋 시점에 검증한다.
ALTER TABLE dc.job_application ADD CONSTRAINT job_application_current_attempt
 FOREIGN KEY(id,current_attempt_no) REFERENCES dc.job_application_attempt(application_id,attempt_no)
 DEFERRABLE INITIALLY DEFERRED;

-- 상태 이력. 단계는 이름을 바꾸거나 지울 수 있으므로 이름 스냅샷을 함께 남긴다 —
-- id 만 남기면 과거 이력이 "알 수 없는 단계"가 된다.
CREATE TABLE dc.job_application_event (
 id             text PRIMARY KEY,
 application_id text NOT NULL REFERENCES dc.job_application(id),
 posting_id     text NOT NULL,
 attempt_no     integer NOT NULL CHECK(attempt_no>0),
 seq            bigint NOT NULL CHECK(seq>0),
 action         text NOT NULL CHECK(action IN ('APPLY','REAPPLY','ADVANCE','REJECT','PASS','CANCEL','IMPORT')),
 from_status    text, to_status text,
 from_stage_id  text, to_stage_id text,
 from_stage_name text, to_stage_name text,
 reason         text NOT NULL DEFAULT '',
 actor_uid      text REFERENCES dc.person(intg_uid), actor_name_snapshot text,
 occurred_at    timestamptz, recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(application_id,seq),
 CONSTRAINT job_event_application_fk FOREIGN KEY(posting_id,application_id)
   REFERENCES dc.job_application(posting_id,id),
 CONSTRAINT job_event_attempt_fk FOREIGN KEY(application_id,attempt_no)
   REFERENCES dc.job_application_attempt(application_id,attempt_no) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT job_event_from_stage_fk FOREIGN KEY(posting_id,from_stage_id) REFERENCES dc.job_stage(posting_id,id),
 CONSTRAINT job_event_to_stage_fk FOREIGN KEY(posting_id,to_stage_id) REFERENCES dc.job_stage(posting_id,id)
);
CREATE INDEX job_application_event_timeline ON dc.job_application_event(application_id,attempt_no,seq);
CREATE TRIGGER job_application_event_immutable BEFORE UPDATE OR DELETE ON dc.job_application_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 찜 ───────────────────────────────────────────────────────────────────
-- 현행 localStorage 배열에는 학생 ID 가 아예 없어 계정 전환 시 공유됐다.
-- 소유자를 추측해 수입하지 않는다 — 정당한 소유자가 존재하지 않기 때문이다.
CREATE TABLE dc.job_wishlist (
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 posting_id  text NOT NULL REFERENCES dc.job_posting(id),
 created_at  timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(student_uid,posting_id)
);
CREATE INDEX job_wishlist_recent ON dc.job_wishlist(student_uid,created_at DESC,posting_id);

-- ── 텍스트 자기소개서 ────────────────────────────────────────────────────
-- 파일이 아니라 텍스트다. 021 의 ai_run(subject_kind='RESUME') 이 이 표의 id 를 가리킨다.
-- AI 결과 역참조 컬럼을 두지 않는다 — 파생값을 원본에 넣지 않는다(CLAUDE.md 규칙 3).
-- origin 은 USER|LEGACY 두 값뿐이다. AI 초안 생성기는 존재하지 않으므로
-- AI_ASSISTED 를 정직하게 세울 수 없고, 필요해지면 ai_run 존재 여부로 질의한다.
CREATE TABLE dc.job_resume (
 id                    text PRIMARY KEY,
 student_uid           text NOT NULL REFERENCES dc.student(intg_uid),
 title                 text NOT NULL CHECK(btrim(title)<>''),
 company_text          text, job_type_text text, position_text text,
 category_group        text GENERATED ALWAYS AS ('JOB_RESUME_CATEGORY') STORED,
 category_code         text,
 category_label_legacy text,
 content               text NOT NULL,
 origin                text NOT NULL CHECK(origin IN ('USER','LEGACY')),
 version               bigint NOT NULL DEFAULT 1 CHECK(version>0),
 created_at            timestamptz NOT NULL DEFAULT now(), created_by text REFERENCES dc.person(intg_uid),
 updated_at            timestamptz NOT NULL DEFAULT now(), updated_by text REFERENCES dc.person(intg_uid),
 deleted_at            timestamptz, deleted_by text REFERENCES dc.person(intg_uid),
 CONSTRAINT job_resume_category_fk FOREIGN KEY(category_group,category_code)
   REFERENCES dc.code_item(group_code,code)
);
CREATE INDEX job_resume_owner ON dc.job_resume(student_uid,updated_at DESC,id) WHERE deleted_at IS NULL;

CREATE TABLE dc.job_resume_event (
 id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 resume_id     text NOT NULL REFERENCES dc.job_resume(id),
 seq           bigint NOT NULL CHECK(seq>0),
 action        text NOT NULL CHECK(action IN ('CREATE','UPDATE','DELETE','IMPORT')),
 changed_fields text[] NOT NULL DEFAULT '{}',
 actor_uid     text REFERENCES dc.person(intg_uid),
 occurred_at   timestamptz NOT NULL DEFAULT now(),
 UNIQUE(resume_id,seq)
);
CREATE TRIGGER job_resume_event_immutable BEFORE UPDATE OR DELETE ON dc.job_resume_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 열람 감사 ────────────────────────────────────────────────────────────
-- dc.admin_event 에는 before/after 와 NOT NULL reason 이 있어 열람 사건을 담을 자리가 없다.
-- payload 에 CSV 본문·자소서 본문·학생 PII 를 넣지 않는다 — 무엇을 몇 건 봤는지만 남긴다.
CREATE TABLE dc.job_access_event (
 id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_uid   text NOT NULL REFERENCES dc.person(intg_uid),
 action      text NOT NULL CHECK(action IN ('EXPORT_CSV','VIEW_DOCUMENT')),
 target_kind text NOT NULL, target_id text,
 filter_hash text NOT NULL, row_count integer NOT NULL CHECK(row_count>=0),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_access_event_actor ON dc.job_access_event(actor_uid,occurred_at DESC);
CREATE TRIGGER job_access_event_immutable BEFORE UPDATE OR DELETE ON dc.job_access_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- ── 권한 ─────────────────────────────────────────────────────────────────
-- 이력·회차·감사는 INSERT 만 준다. UPDATE/DELETE 는 트리거가 막고 grant 도 주지 않는다.
GRANT SELECT,INSERT,UPDATE ON dc.company,dc.job_posting,dc.job_stage,dc.job_resume,
 dc.job_application,dc.file_object TO dc_app;
GRANT DELETE ON dc.job_posting_option TO dc_app;
GRANT SELECT,INSERT ON dc.job_posting_option,dc.job_posting_event,dc.job_application_attempt,
 dc.job_application_event,dc.job_resume_event,dc.job_access_event TO dc_app;
GRANT SELECT,INSERT,DELETE ON dc.job_wishlist TO dc_app;
