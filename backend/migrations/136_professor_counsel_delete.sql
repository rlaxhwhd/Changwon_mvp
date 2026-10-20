-- 2026-10-20 explicit user decision: professor consultations may be permanently
-- deleted with their records/events. Other counseling histories remain immutable.
-- Irreversible after deletion; recovery requires the pre-deletion DB/file backup.
-- No broad DELETE privilege is granted to the API role.
CREATE FUNCTION dc.delete_professor_counsel(target_id text,actor_id text,expected_version integer)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,dc AS $$
DECLARE r dc.counsel_request; file_ids text[];
BEGIN
 SELECT * INTO r FROM dc.counsel_request WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR r.legacy_type<>'교수' OR r.counselor_uid<>actor_id OR NOT EXISTS
   (SELECT 1 FROM dc.staff WHERE intg_uid=actor_id AND role_code='professor')
 THEN RAISE EXCEPTION 'Professor consultation not found' USING ERRCODE='P0002'; END IF;
 IF r.version<>expected_version THEN RAISE EXCEPTION 'Consultation version conflict' USING ERRCODE='40001'; END IF;
 SELECT COALESCE(array_agg(id),ARRAY[]::text[]) INTO file_ids FROM dc.file_object
  WHERE owner_kind='COUNSEL_REQUEST' AND owner_id=target_id;
 DELETE FROM dc.notification WHERE source_kind='counsel' AND source_id IN
  (SELECT id::text FROM dc.counsel_event WHERE request_id=target_id);
 DELETE FROM dc.idempotency WHERE response->>'requestId'=target_id OR response->>'id'=target_id;
 DELETE FROM dc.file_object WHERE owner_kind='COUNSEL_REQUEST' AND owner_id=target_id;
 DELETE FROM dc.counsel_event WHERE request_id=target_id;
 DELETE FROM dc.counsel_record WHERE request_id=target_id;
 DELETE FROM dc.counsel_request WHERE id=target_id;
 RETURN file_ids;
END $$;
REVOKE ALL ON FUNCTION dc.delete_professor_counsel(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION dc.delete_professor_counsel(text,text,integer) TO dc_app;

CREATE FUNCTION dc.guard_counsel_event_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' AND current_user=pg_get_userbyid((SELECT proowner FROM pg_proc
    WHERE oid='dc.delete_professor_counsel(text,text,integer)'::regprocedure))
    AND EXISTS(SELECT 1 FROM dc.counsel_request WHERE id=OLD.request_id AND legacy_type='교수')
 THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'History is append-only';
END $$;
DROP TRIGGER counsel_event_immutable ON dc.counsel_event;
CREATE TRIGGER counsel_event_immutable BEFORE UPDATE OR DELETE ON dc.counsel_event
 FOR EACH ROW EXECUTE FUNCTION dc.guard_counsel_event_history();
