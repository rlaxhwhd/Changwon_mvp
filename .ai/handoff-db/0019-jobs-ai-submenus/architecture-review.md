# 0019 — Astra architecture review

- Decision: **ASTRA_APPROVED** for work-order revision 1 and the exact 171+172 files below, under its deployment/write-quiescence contract.
- Date: 2026-11-20. Reviewer: delegated Astra DB reviewer.
- Approval is permission to begin prescribed DB validation, not a claim that tests/deployment passed.

## Checksums (runner-compatible UTF-8 text SHA256)

| File | SHA256 |
|---|---|
| 171_jobs_ai_submenus.sql | 0a6bba04176920ca9d80cf16b64dbc16359bfff7521dd744ca45fc6fde7ca433 |
| 172_jobs_ai_menu_role_version.sql | 103b73675a56b41486d3264130f0efa790f85f0257b04ff736e77a3c5e9f8758 |

## Findings and correction

171 correctly preserves migration089's array-index identity contract; getNavSections applies DB label/sort/active state to each original index. App.tsx declares all five paths. menu and menu_auth primary/foreign keys already enforce uniqueness and referential integrity. Existing menu update predicates avoid needless menu version changes. Parent role grants are copied without inventing a privileged role. New menus are display configuration; jobs.py still checks student ownership and consent through its existing API paths.

**Corrected lost-update gap:** migration088 defines auth_role.version as the role's menu_auth aggregate version. administration.save_role_menus locks that role, checks expectedVersion and replaces its complete grant set. 171 inserted grants without increasing this version, allowing stale forms to erase them. As the lead confirmed 171 is already applied locally, it was not edited. New 172 locks affected role rows in deterministic order and increases their versions without changing grants. Including student covers a locally edited/revoked grant set. No role version is reset. This is a narrowly scoped deployment repair, not general permission synchronization.

The runner uses a single non-autocommit psycopg connection context and transaction-level advisory lock for all pending migrations; both 171 and 172 plus ledger rows commit together on a server at 170. SET LOCAL lock_timeout=3s remains in force. The advisory lock serializes migration runners, not admin API writes. Stop menu-management writes during deployment: 171 mutates menu_auth before 172's aggregate locks and could otherwise race/deadlock with a role replacement. Timeout rolls back the whole pending set. After commit, stale forms are rejected by the advanced role versions.

## Query and index assessment

| Operation | Existing access path / bounded work |
|---|---|
| 171 parent grants lookup | menu_auth PK(menu_code,role_code), parent prefix equality |
| New menu/grant insertion | menu PK; menu_auth composite PK; both FK checks |
| Existing child order updates | menu PK, two rows |
| 172 affected roles + locks | small auth_role catalog; correlated menu_auth PK probes for four menu codes |
| Metadata menu load | existing join/EXISTS over menu_auth and menu; three additional catalog rows |

No new table, JSONB, index, pagination or query-per-student work is introduced. Eight thousand students do not produce eight thousand grant rows. Existing catalog statement triggers invalidate metadata_revision, including conflict/no-op INSERT statements. No EXPLAIN or timing was measured and no performance improvement is claimed. 172 touches only auth_role.version, which the admin role endpoint reads directly; it does not need another metadata invalidation.

## Idempotency, permissions, rollback

171 is row-state idempotent under unchanged configuration, but replay after intentional grant revocation would restore grants. Rely on schema_migration's once-only ledger. 172 is intentionally a one-time version invalidation; manually repeating it increases versions again, with no business-data loss. Normal repeated runner execution skips it by checksum.

ON CONFLICT DO NOTHING does not validate preexisting conflicting menu contents, so preflight must inspect existing keys. Missing parent causes FK failure. Existing labels/active flags are preserved. No database privileges, API access policy, ownership keys or sensitive payloads change. No administrator audit event is fabricated: migrations have no human changed_by principal, and release/migration history records the deployment.

Rollback follows work-order revision 1: additive retention is safest; otherwise new migration removes grants before menu FK targets, restores saved sort values and advances versions/revision. Do not decrement role versions or destroy resume/interview records.

## JSON and execution verification

Required tests: /metadata still returns menus as an array with existing keys/types; new menu_code/label/route/sort_order/is_active values and no duplicate grants; hidden parent remains hidden; unauthorized roles do not gain grants; role save using pre-172 expectedVersion returns409; refreshed version works; unrelated grants survive; rerunning runner changes no ledger or role version. Test current original-child grants are preserved and all five visible paths map to their intended pages.

Reviewed original sources: migrations009/088/089/171/172; backend/app/{migrate,metadata,administration,auth,jobs}.py; src_v2/components/navConfig.ts; src_v2/App.tsx; MenuVisibility caller; DB_SCHEMA.md/DB.md/spec_v1.md relevant contracts; SPEC.md menu/authority sections; interop and GOLDEN_PATH guidance. Graft freshness reported structural graph in sync; navConfig callers were GNB and PageCrumb; role save is reached by HTTP and therefore absent from static call edges. No schema DDL change requires DB_SCHEMA.md alteration.

No DB was changed or runtime test performed by this reviewer. Lead must record test and deployment results separately. Atlas memory tools were unavailable; no memory read/write is claimed.
