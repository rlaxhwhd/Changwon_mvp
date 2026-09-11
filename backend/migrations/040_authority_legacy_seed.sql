-- 039 의 데이터 적재 — 스키마와 분리한다.
-- ① 역할 5개를 현행 SY_AUTH(CURRENT.md §3-2) 에 매핑한다. 라벨은 012 가 임시로 넣은 코드 문자열이었다.
--    자동 부여(base_group) 여부는 §3-3 의 두 갈래를 그대로 옮긴 것이다.
UPDATE dc.auth_role SET base_group=false,legacy_code='AUTH0006',sort_order=0,
 description='명시 부여 — auth_user 에 등록해야 들어온다' WHERE role_code='AUTH0006';
UPDATE dc.auth_role SET label='진로·취업 상담사',base_group=true,legacy_code='AUTH0012',sort_order=10,
 description='신분 자동 부여 — 현행 실무 상담사(AUTH0012)를 진로·심리로 나눈 것' WHERE role_code='career';
UPDATE dc.auth_role SET label='심리 상담사',base_group=true,legacy_code='AUTH0012',sort_order=11,
 description='신분 자동 부여 — 현행 실무 상담사(AUTH0012)를 진로·심리로 나눈 것' WHERE role_code='psych';
UPDATE dc.auth_role SET label='교수',base_group=true,legacy_code='AUTH0003',sort_order=20,
 description='신분 자동 부여 — USER_TY_CD 1301(교원)' WHERE role_code='professor';
UPDATE dc.auth_role SET label='조교',base_group=true,legacy_code='AUTH0002',sort_order=30,
 description='신분 자동 부여 — USER_TY_CD 1501(조교)' WHERE role_code='assistant';

-- ② 상담 운영에 쓰이는 현행 SY_CODE 그룹(CURRENT.md §4-5 대장) 을 코드 관리 구조로 옮긴다.
--    코드는 우리 규약(의미 있는 영문)으로 두고 현행 값은 legacy 에 보존한다 — 이관 조인용이다.
--    ⚠ 0145→0147(심리검사 종류·세부)은 심리검사 폐지 여부가 미결(DB.md §9)이라 옮기지 않는다.
--    ⚠ 0143(S/M/A/R/T 5단계)은 T1~T6 와 1:1 이 아니라 매핑하지 않는다.
INSERT INTO dc.code_group(group_code,label,managed_by,fixed_codes,legacy_group,sort_order) VALUES
 ('COUNSELOR_STATUS','상담사 상태','OPERATIONAL',true,'0024',90),
 ('PROF_COUNSEL_TYPE','교수상담 세부구분','OPERATIONAL',false,'0131',91);
INSERT INTO dc.code_item(group_code,code,label,legacy,sort_order) VALUES
 ('COUNSELOR_STATUS','ACTIVE','정상','0001',0),
 ('COUNSELOR_STATUS','SUSPENDED','일시중지','0002',1),
 ('COUNSELOR_STATUS','REVOKED','권한정지','0003',2),
 ('PROF_COUNSEL_TYPE','MAJOR_STUDY','전공 및 학업','0001',0),
 ('PROF_COUNSEL_TYPE','CAREER','진로','0002',1),
 ('PROF_COUNSEL_TYPE','JOB','취업','0003',2),
 ('PROF_COUNSEL_TYPE','ETC','기타','0004',3),
 ('PROF_COUNSEL_TYPE','SERVICE_PRACTICE','봉사 및 실습','0005',4),
 ('PROF_COUNSEL_TYPE','MENTORING_PROGRAM','사제동행프로그램','0006',5);

-- ③ 0146 은 현행 상담사 상담의 CONSULTTYPE(진로/심리/해석/기타/장기결석자) 이다 — 우리 COUNSEL_TYPE 과 같은 개념.
--    진로·심리만 대응한다. 취업(JOB)은 현행에서 COUNSELTYPEIDX='2' 하드코딩 분기라 코드가 없고,
--    교수(PROF)는 별도 표(CON_PROF_INFO)라 0146 에 없다. 해석·기타·장기결석자는 우리 구조에 자리가 없어 남겨 둔다.
UPDATE dc.code_group SET legacy_group='0146' WHERE group_code='COUNSEL_TYPE';
UPDATE dc.code_item SET legacy='1' WHERE (group_code,code)=('COUNSEL_TYPE','CAREER');
UPDATE dc.code_item SET legacy='2' WHERE (group_code,code)=('COUNSEL_TYPE','PSY');
