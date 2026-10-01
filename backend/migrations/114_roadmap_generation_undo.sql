-- Additive: preserve exact pre-generation state until the new draft is confirmed.
-- Rollback: deploy the previous API first; this nullable column/trigger can remain.
-- No existing rows are backfilled and no historical event is changed.
SET LOCAL lock_timeout = '5s';
ALTER TABLE dc.roadmap ADD COLUMN generation_undo jsonb
 CHECK(generation_undo IS NULL OR (jsonb_typeof(generation_undo)='object'
   AND generation_undo ? 'previous'));
ALTER TABLE dc.roadmap_event DROP CONSTRAINT roadmap_event_action_code_check;
ALTER TABLE dc.roadmap_event ADD CONSTRAINT roadmap_event_action_code_check CHECK(action_code IN
 ('CREATE','REGENERATE','EDIT','REVIEW','CONFIRM','REOPEN','PROGRAM_INSERT','PROGRAM_EXPIRE',
  'ITEM_COMPLETION','REQUEST_APPLIED','RESTORE_EDIT','IMPORT','UNDO_GENERATION'));
CREATE FUNCTION dc.clear_confirmed_generation_undo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status_code='CONFIRMED' THEN NEW.generation_undo:=NULL; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER roadmap_clear_generation_undo BEFORE INSERT OR UPDATE ON dc.roadmap
 FOR EACH ROW EXECUTE FUNCTION dc.clear_confirmed_generation_undo();
