-- Rename the professor '마이홈' menu (138) to '마이페이지'. Route and permissions are unchanged.
-- Rollback: a new migration restoring label='마이홈'.
UPDATE dc.menu SET label='마이페이지',version=version+1 WHERE menu_code='prof-home';
