-- 비교과 만족도 조사 문항 — docs/만족도조사.hwp(【붙임 1】 프로그램 만족도 서식) 그대로.
-- 4영역 × 4문항 5점 척도 + 서술형 2문항(17·18). 영역·문항은 코드관리(SURVEY_AREA group=SATISFACTION)가 정본이다.
-- 서술형은 payload.kind='TEXT' 로 표시하고 응답은 survey_answer.text_value 에 담는다(점수 없음).
-- Rollback: 코드 항목 is_active=false, text_value 열은 보존한다.
SET LOCAL lock_timeout = '5s';
INSERT INTO dc.code_item(group_code,code,label,sort_order,payload) VALUES
('SURVEY_AREA','SAT_1','교육 내용',31,'{"group":"SATISFACTION","position":1}'),
('SURVEY_AREA','SAT_2','교수자',32,'{"group":"SATISFACTION","position":2}'),
('SURVEY_AREA','SAT_3','운영 및 환경',33,'{"group":"SATISFACTION","position":3}'),
('SURVEY_AREA','SAT_4','교육 성과',34,'{"group":"SATISFACTION","position":4}'),
('SURVEY_AREA','SAT_5','의견',35,'{"group":"SATISFACTION","position":5}');
INSERT INTO dc.code_item(group_code,code,label,sort_order,payload) VALUES
('SURVEY_ITEM','SAT_1_01','교육 내용은 프로그램의 목적과 목표에 부합하게 구성되었다.',3101,'{"areaKey":"SAT_1","position":1}'),
('SURVEY_ITEM','SAT_1_02','교육 내용은 이해하기 쉽도록 단계적이고 체계적으로 구성되었다.',3102,'{"areaKey":"SAT_1","position":2}'),
('SURVEY_ITEM','SAT_1_03','교육 내용의 수준(난이도)은 나의 현재 수준에 적절하였다.',3103,'{"areaKey":"SAT_1","position":3}'),
('SURVEY_ITEM','SAT_1_04','제공된 교육 자료(교재, 유인물 등)는 학습에 실질적인 도움이 되었다.',3104,'{"areaKey":"SAT_1","position":4}'),
('SURVEY_ITEM','SAT_2_01','강사는 해당 분야에 대한 충분한 전문 지식과 식견을 갖추고 있었다.',3201,'{"areaKey":"SAT_2","position":1}'),
('SURVEY_ITEM','SAT_2_02','강사는 내용을 이해하기 쉽게 효과적으로 전달(강의)하였다.',3202,'{"areaKey":"SAT_2","position":2}'),
('SURVEY_ITEM','SAT_2_03','강사는 학생들의 질문에 성실히 응답하고 적극적으로 소통하였다.',3203,'{"areaKey":"SAT_2","position":3}'),
('SURVEY_ITEM','SAT_2_04','강사는 열정적인 태도로 강의에 임하여 학습 동기를 높여주었다.',3204,'{"areaKey":"SAT_2","position":4}'),
('SURVEY_ITEM','SAT_3_01','프로그램 일정, 장소, 내용 등에 대한 사전 안내가 충분하였다.',3301,'{"areaKey":"SAT_3","position":1}'),
('SURVEY_ITEM','SAT_3_02','담당자의 프로그램 진행(출석, Q&A, 시스템 지원 등)은 원활하였다.',3302,'{"areaKey":"SAT_3","position":2}'),
('SURVEY_ITEM','SAT_3_03','교육 장소(강의실 또는 온라인 플랫폼)와 기자재 상태는 학습하기에 쾌적하였다.',3303,'{"areaKey":"SAT_3","position":3}'),
('SURVEY_ITEM','SAT_3_04','프로그램의 운영 시기와 시간 배분(기간, 시간대)은 참여하기에 적절하였다.',3304,'{"areaKey":"SAT_3","position":4}'),
('SURVEY_ITEM','SAT_4_01','이 프로그램은 나의 진로 설정 및 취업 역량 향상에 실질적인 도움이 되었다.',3401,'{"areaKey":"SAT_4","position":1}'),
('SURVEY_ITEM','SAT_4_02','이 프로그램은 향후 진로 및 취업 준비에 대한 자신감(동기)을 높여주었다.',3402,'{"areaKey":"SAT_4","position":2}'),
('SURVEY_ITEM','SAT_4_03','향후 이와 유사한 심화 과정이나 연계 프로그램이 개설된다면 참여하고 싶다.',3403,'{"areaKey":"SAT_4","position":3}'),
('SURVEY_ITEM','SAT_4_04','이 프로그램을 주변 친구나 후배들에게 추천하고 싶다.',3404,'{"areaKey":"SAT_4","position":4}'),
('SURVEY_ITEM','SAT_5_01','이 프로그램에서 가장 유익하거나 만족스러웠던 점은 무엇입니까?',3501,'{"areaKey":"SAT_5","position":1,"kind":"TEXT"}'),
('SURVEY_ITEM','SAT_5_02','향후 프로그램 발전을 위해 보완하거나 개선해야 할 점은 무엇입니까?',3502,'{"areaKey":"SAT_5","position":2,"kind":"TEXT"}');
ALTER TABLE dc.survey_answer
 ALTER COLUMN value DROP NOT NULL,
 ADD COLUMN text_value text CHECK(length(text_value) BETWEEN 1 AND 2000),
 ADD CONSTRAINT survey_answer_one_value CHECK((value IS NULL) <> (text_value IS NULL));
