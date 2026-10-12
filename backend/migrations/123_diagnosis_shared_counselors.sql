-- Match the shared diagnosis workspace established by 099: all counselors.
INSERT INTO dc.menu_auth(menu_code,role_code) VALUES('diagnosis.manage','psych') ON CONFLICT DO NOTHING;
