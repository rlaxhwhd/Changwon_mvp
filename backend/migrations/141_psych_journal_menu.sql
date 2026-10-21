-- 심리상담사 상담관리에 「상담일지」를 다시 단다(2026-10-21 사용자 지시 — 140 에서 뺐던 counsel.2).
-- 일지 범위는 counsel.visibility() 가 심리상담만 주므로 진로취업 일지와 섞이지 않는다.
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('counsel.2','psych') ON CONFLICT DO NOTHING;
