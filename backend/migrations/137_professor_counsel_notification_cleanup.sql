-- Delete only notifications belonging to the professor counseling being removed.
-- Read receipts must be removed before their parent notification. This trigger
-- runs under the narrowly authorized deletion function, never the API role.
CREATE FUNCTION dc.guard_professor_counsel_notification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_key text; origin text;
BEGIN
 IF TG_OP<>'DELETE' OR current_user<>pg_get_userbyid((SELECT proowner FROM pg_proc
    WHERE oid='dc.delete_professor_counsel(text,text,integer)'::regprocedure))
 THEN RAISE EXCEPTION 'History is append-only'; END IF;
 IF TG_TABLE_NAME='notification_read' THEN
   SELECT source_id,source_kind INTO event_key,origin FROM dc.notification WHERE id=OLD.notification_id;
 ELSE event_key:=OLD.source_id; origin:=OLD.source_kind; END IF;
 IF origin='counsel' AND EXISTS(SELECT 1 FROM dc.counsel_event e JOIN dc.counsel_request r ON r.id=e.request_id
   WHERE e.id::text=event_key AND r.legacy_type='교수') THEN
   IF TG_TABLE_NAME='notification' THEN DELETE FROM dc.notification_read WHERE notification_id=OLD.id; END IF;
   RETURN OLD;
 END IF;
 RAISE EXCEPTION 'History is append-only';
END $$;
DROP TRIGGER notification_immutable ON dc.notification;
CREATE TRIGGER notification_immutable BEFORE UPDATE OR DELETE ON dc.notification
 FOR EACH ROW EXECUTE FUNCTION dc.guard_professor_counsel_notification();
DROP TRIGGER notification_read_immutable ON dc.notification_read;
CREATE TRIGGER notification_read_immutable BEFORE UPDATE OR DELETE ON dc.notification_read
 FOR EACH ROW EXECUTE FUNCTION dc.guard_professor_counsel_notification();
