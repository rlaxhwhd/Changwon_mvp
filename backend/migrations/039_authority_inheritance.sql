-- 현행 SY_AUTH 4테이블 모델(CURRENT.md §3-1)에서 아직 계승하지 않은 두 가지를 옮긴다.
-- 1) SY_AUTH.BASEGRUP_YN — 권한 부여가 두 갈래다(§3-3): 신분(staff.role_code)으로 자동 부여되는 역할과
--    auth_user 에 등록해야 들어오는 명시 역할. metadata.py 의 메뉴 술어는 이미 그렇게 판정하지만
--    표에는 어느 역할이 어느 갈래인지 표시가 없었다.
-- 2) SY_AUTH_LOG — 권한 변경 이력. auth_user 는 append-only 이벤트가 없던 유일한 운영 표였다.
ALTER TABLE dc.auth_role
 ADD COLUMN base_group boolean NOT NULL DEFAULT false,
 ADD COLUMN legacy_code text,
 ADD COLUMN description text,
 ADD COLUMN sort_order integer NOT NULL DEFAULT 0,
 -- legacy_code 는 SY_AUTH.AUTH_CODE 이관 매핑 전용이다. 판정에 쓰지 않으며 두 역할이 한 현행 역할에서
 -- 갈라질 수 있어(진로·심리 상담사 ← AUTH0012) UNIQUE 를 걸지 않는다.
 ADD CONSTRAINT auth_role_legacy_code_format CHECK (legacy_code IS NULL OR legacy_code ~ '^AUTH[0-9]{4}$');

CREATE TABLE dc.auth_user_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 person_uid text NOT NULL REFERENCES dc.person, role_code text NOT NULL REFERENCES dc.auth_role,
 action text NOT NULL CHECK(action IN ('GRANT','REVOKE','EXTEND')),
 before jsonb, after jsonb NOT NULL, reason text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(), changed_by text NOT NULL REFERENCES dc.person
);
CREATE INDEX auth_user_event_person_idx ON dc.auth_user_event(person_uid,changed_at DESC);
CREATE TRIGGER auth_user_event_immutable BEFORE UPDATE OR DELETE ON dc.auth_user_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

-- 역할·부여가 바뀌면 메뉴 노출도 바뀐다 → 코드·메뉴와 같은 캐시 무효화 경로를 탄다.
CREATE TRIGGER auth_role_revision AFTER UPDATE ON dc.auth_role FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();
CREATE TRIGGER auth_user_revision AFTER INSERT OR UPDATE OR DELETE ON dc.auth_user FOR EACH STATEMENT EXECUTE FUNCTION dc.bump_metadata_revision();

GRANT SELECT ON dc.auth_user_event TO dc_app;
GRANT INSERT ON dc.auth_user_event TO dc_app;
-- 역할 부여 API(후속)의 쓰기 자리. 회수는 DELETE 가 아니라 valid_to 를 닫는다.
GRANT INSERT,UPDATE ON dc.auth_user TO dc_app;
