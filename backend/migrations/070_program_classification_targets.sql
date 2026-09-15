-- 프로그램 분류와 참가대상은 코드관리에서 편집한다. 과거 분류는 삭제하지 않는다.
UPDATE dc.code_group SET label='프로그램 대분류' WHERE group_code='PROGRAM_CATEGORY';
UPDATE dc.code_item SET is_active=false WHERE group_code='PROGRAM_CATEGORY' AND code NOT IN ('CAREER','EMPLOY');
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,sort_order) VALUES
 ('PROGRAM_MIDDLE_CATEGORY','프로그램 중분류','OPERATIONAL',false,41),
 ('PROGRAM_TARGET_STATUS','프로그램 참가대상 구분','OPERATIONAL',false,42),
 ('PROGRAM_TARGET_GRADE','프로그램 참가대상 학년','OPERATIONAL',false,43);
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('PROGRAM_MIDDLE_CATEGORY','NURTURE','육성',0),
 ('PROGRAM_MIDDLE_CATEGORY','ANCHOR','앵커',1),
 ('PROGRAM_MIDDLE_CATEGORY','UNIV_PLUS','대플',2),
 ('PROGRAM_MIDDLE_CATEGORY','UNIV_PLUS_GRAD','대플(졸특)',3),
 ('PROGRAM_MIDDLE_CATEGORY','UNIV_PLUS_CUSTOM','대플(재맞고)',4),
 ('PROGRAM_MIDDLE_CATEGORY','GLOCAL','글로컬',5),
 ('PROGRAM_MIDDLE_CATEGORY','ETC','기타',6),
 ('PROGRAM_TARGET_STATUS','ENROLLED','재학생',0),
 ('PROGRAM_TARGET_STATUS','LEAVE','휴학생',1),
 ('PROGRAM_TARGET_STATUS','GRADUATED_COMPLETED','졸업 및 수료',2),
 ('PROGRAM_TARGET_GRADE','1','1학년',0),
 ('PROGRAM_TARGET_GRADE','2','2학년',1),
 ('PROGRAM_TARGET_GRADE','3','3학년',2),
 ('PROGRAM_TARGET_GRADE','4','4학년',3);
ALTER TABLE dc.program
 ADD COLUMN middle_category_code text,
 ADD COLUMN middle_category_group text GENERATED ALWAYS AS ('PROGRAM_MIDDLE_CATEGORY') STORED,
 ADD COLUMN target_statuses text[] NOT NULL DEFAULT '{}',
 ADD COLUMN target_grades text[] NOT NULL DEFAULT '{}',
 ADD FOREIGN KEY(middle_category_group,middle_category_code) REFERENCES dc.code_item(group_code,code);
