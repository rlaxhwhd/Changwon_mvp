-- 2026-10-16 사용자 확정 심리상담 연계 사유 목록: 적응문제 · 대인관계 · 성격·정서 · 행동·습관 · 실존문제.
-- 사유는 코드로 저장한다(psych_referral.reason_code). 이미 쓰인 코드가 있을 수 있으므로 옛 코드는 지우지 않고
-- 비활성으로 남긴다 — 지난 연계 기록의 사유 표시가 그대로 유지되고, 새 연계에서는 고를 수 없다.
SET LOCAL lock_timeout='3s';

-- sort_order 는 UNIQUE 라 옛 코드를 먼저 뒤로 비킨다.
UPDATE dc.psych_referral_reason SET sort_order=sort_order+100 WHERE sort_order<100;

-- 뜻이 같은 두 코드는 이름만 바꿔 이어 쓴다.
UPDATE dc.psych_referral_reason SET label='적응문제', sort_order=1, active=true WHERE code='ADJUSTMENT';
UPDATE dc.psych_referral_reason SET label='대인관계', sort_order=2, active=true WHERE code='RELATIONSHIP';

INSERT INTO dc.psych_referral_reason(code,label,sort_order,active) VALUES
 ('PERSONALITY_EMOTION','성격·정서',3,true),
 ('BEHAVIOR_HABIT','행동·습관',4,true),
 ('EXISTENTIAL','실존문제',5,true)
ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label, sort_order=EXCLUDED.sort_order, active=true;

UPDATE dc.psych_referral_reason SET active=false WHERE code IN ('EMOTIONAL','STRESS','SPECIALIST');
