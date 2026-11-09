-- C-5 취약요인 진단(PHQ-9 · GAD-7) — 2026-11-09 사용자 확정.
-- 업체 제공 문항을 우리 사이트에서 응시하고, 두 합계의 평균이 10 이상이면 심리상담사 공유 목록에 자동 연계한다.
-- 결과는 기존 diagnosis_attempt/result 회차 구조에 저장한다(source='dreamcatch').
-- Rollback: revert the app first; these additive tables stay. Never delete answered results.
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';

-- 결과표 항목: 두 검사의 원점수 합계.
INSERT INTO dc.code_item(group_code,code,label,sort_order) VALUES
 ('DIAGNOSIS_FACTOR','C5_PHQ9','PHQ-9 우울',1),('DIAGNOSIS_FACTOR','C5_GAD7','GAD-7 불안',2);
INSERT INTO dc.diagnosis_factor_definition(test_code,factor_code,label,secondary_label,sort_order) VALUES
 ('C5','PHQ9','PHQ-9 우울','PHQ-9',1),('C5','GAD7','GAD-7 불안','GAD-7',2);

-- 문항 정의. 응답 선택지는 0~3점 4단계이며 척도마다 표기가 다르다.
CREATE TABLE dc.screening_scale (
 code text PRIMARY KEY CHECK(code IN ('PHQ9','GAD7')),
 test_id text NOT NULL CHECK(test_id='c5'),
 label text NOT NULL, instruction text NOT NULL,
 options jsonb NOT NULL CHECK(jsonb_typeof(options)='array' AND jsonb_array_length(options)=4),
 sort_order integer NOT NULL UNIQUE
);
CREATE TABLE dc.screening_item (
 scale_code text NOT NULL REFERENCES dc.screening_scale(code),
 position integer NOT NULL CHECK(position>0),
 prompt text NOT NULL,
 PRIMARY KEY(scale_code,position)
);
INSERT INTO dc.screening_scale(code,test_id,label,instruction,options,sort_order) VALUES
 ('PHQ9','c5','PHQ-9','지난 2주 동안 아래의 증상들로 인해 얼마나 자주 어려움을 겪었는지 표시해 주시기 바랍니다.',
  '[{"value":0,"label":"없음"},{"value":1,"label":"2-3일 이상"},{"value":2,"label":"7일 이상"},{"value":3,"label":"거의 매일"}]',1),
 ('GAD7','c5','GAD-7','지난 2주 동안 아래의 문제들로 인해 얼마나 자주 불편감이나 방해를 받았는지 표시해 주시기 바랍니다.',
  '[{"value":0,"label":"전혀 방해 받지 않았다"},{"value":1,"label":"며칠 동안 방해 받았다"},{"value":2,"label":"2주 중 절반 이상은 방해 받았다"},{"value":3,"label":"거의 매일 방해 받았다"}]',2);
INSERT INTO dc.screening_item(scale_code,position,prompt) VALUES
 ('PHQ9',1,'기분이 가라앉거나, 우울하거나, 희망이 없다고 느꼈다.'),
 ('PHQ9',2,'평소 하던 일에 대한 흥미가 없어지거나 즐거움을 느끼지 못했다.'),
 ('PHQ9',3,'잠들기가 어렵거나 자주 깼다/혹은 너무 많이 잤다.'),
 ('PHQ9',4,'평소보다 식욕이 줄었다/혹은 평소보다 많이 먹었다.'),
 ('PHQ9',5,'다른 사람들이 알아차릴 정도로 평소보다 움직임이나 말이 느려졌다. / 또는 그 반대로 평소보다 안절부절못하거나 움직임이 많아졌다.'),
 ('PHQ9',6,'피곤하고 기운이 없었다.'),
 ('PHQ9',7,'내가 잘못 했거나, 실패했다는 생각이 들었다/혹은 자신과 가족을 실망시켰다고 생각했다.'),
 ('PHQ9',8,'신문을 읽거나 TV를 보는 것과 같은 일상적인 일에도 집중할 수가 없었다.'),
 ('PHQ9',9,'차라리 죽는 것이 더 낫겠다고 생각했다/혹은 자해할 생각을 했다.'),
 ('GAD7',1,'초조하거나 불안하거나 조마조마하게 느낀다.'),
 ('GAD7',2,'걱정하는 것을 멈추거나 조절할 수가 없다.'),
 ('GAD7',3,'여러 가지 것들에 대해 걱정을 너무 많이 한다.'),
 ('GAD7',4,'편하게 있기가 어렵다.'),
 ('GAD7',5,'너무 안절부절못해서 가만히 있기가 힘들다.'),
 ('GAD7',6,'쉽게 짜증이 나거나 쉽게 성을 내게 된다.'),
 ('GAD7',7,'마치 끔찍한 일이 생길 것처럼 두렵게 느껴진다.');

-- 자동 연계: 응시 1건당 최대 1건. 받는 상담사·사유가 없고 심리상담사 전원이 공유한다.
-- 저장된 C5 결과 회차를 복합 FK 로 가리킨다 — 학생 불일치·타 검사·결과 없는 연계를 DB 가 거부한다.
CREATE TABLE dc.psych_screening_referral (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_uid text NOT NULL REFERENCES dc.student(intg_uid),
 test_id text NOT NULL DEFAULT 'c5' CHECK(test_id='c5'),
 attempt_no integer NOT NULL,
 phq9 integer NOT NULL CHECK(phq9 BETWEEN 0 AND 27),
 gad7 integer NOT NULL CHECK(gad7 BETWEEN 0 AND 21),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_PROGRESS','DONE')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 accepted_at timestamptz, accepted_by text REFERENCES dc.staff(intg_uid),
 completed_at timestamptz, completed_by text REFERENCES dc.staff(intg_uid),
 UNIQUE(student_uid,test_id,attempt_no),
 FOREIGN KEY(student_uid,test_id,attempt_no) REFERENCES dc.diagnosis_result(student_uid,test_id,attempt_no),
 CHECK(phq9+gad7>=20),
 CHECK(accepted_at>=created_at AND completed_at>=accepted_at),
 CHECK((status='PENDING' AND accepted_at IS NULL AND accepted_by IS NULL AND completed_at IS NULL AND completed_by IS NULL)
  OR (status='IN_PROGRESS' AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL AND completed_at IS NULL AND completed_by IS NULL)
  OR (status='DONE' AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL AND completed_at IS NOT NULL AND completed_by IS NOT NULL))
);
CREATE INDEX psych_screening_referral_list ON dc.psych_screening_referral(created_at DESC,id);
-- 학생별 조회는 UNIQUE(student_uid,test_id,attempt_no) 가 덮는다.
-- 취소·재개가 없으므로 각 동작은 연계당 한 번뿐이다 — UNIQUE 가 referral_id 조회 인덱스를 겸한다.
CREATE TABLE dc.psych_screening_referral_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 referral_id uuid NOT NULL REFERENCES dc.psych_screening_referral(id),
 actor_uid text REFERENCES dc.staff(intg_uid),
 action text NOT NULL CHECK(action IN ('CREATE','ACCEPT','COMPLETE')),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(referral_id,action),
 CHECK((action='CREATE')=(actor_uid IS NULL))
);
CREATE TRIGGER psych_screening_referral_event_immutable BEFORE UPDATE OR DELETE ON dc.psych_screening_referral_event
 FOR EACH ROW EXECUTE FUNCTION dc.reject_history_change();

GRANT SELECT ON dc.screening_scale,dc.screening_item,dc.psych_screening_referral,dc.psych_screening_referral_event TO dc_app;
GRANT INSERT,UPDATE ON dc.psych_screening_referral TO dc_app;
GRANT INSERT ON dc.psych_screening_referral_event TO dc_app;
