# 0020 — Statistics and job district release

- Revision: 1
- Date: 2026-11-23
- Status: ASTRA_APPROVED (design approval; validation and deployment remain lead responsibilities)
- Source reviewed: origin/dev a89fb88. Scope: immutable migrations 173–175 and jobs/administration/metadata/stats/stats_kpi APIs.
- Deployment target state must be measured; the lead reports server 172 and local 175, not independently verified by this reviewer.

## Approved contract

173 records one student/posting/KST-day view with composite PK and posting/student FKs; only SELECT/INSERT are granted to dc_app. Identity comes from the authenticated principal. No historical views are fabricated.

174 adds stats.2 under stats, copies existing parent-role grants and advances affected auth_role aggregate versions. Menus control display; API authorization remains counselor-only for statistics and administrator-only for code management.

175 adds the operational JOB_REGION_DISTRICT code group and parent-linked codes, preserves existing codes via ON CONFLICT DO NOTHING, fills only NULL region legacy values, extends option kind/check/generated expression with DISTRICT while retaining every existing branch. Existing REGION options remain authoritative for region filters. API saves require the selected district's current parent in regions.

## Mandatory execution order

1. Record source SHA, pending migration list and runner-compatible checksums; stop if an already applied checksum differs. Do not edit/replay applied SQL. Inspect preexisting stats.2 and district code collisions rather than assuming ON CONFLICT validates them.
2. Confirm PostgreSQL server_version_num >=170000, generated group_code definition and expected kind CHECK/FK. Check option row count/table size, free disk and long transactions. 175 rewrites stored generated values; plan exclusive-lock downtime. Back up DB and files; preserve each environment's secrets.
3. Quiesce menu/code/job writes and drain requests during migration and API replacement. The migration advisory lock does not serialize API writes. 174 acquires role locks after inserting grants; concurrent menu replacement can race/deadlock. This quiescence is an approval condition.
4. On an isolated PostgreSQL test DB, validate the pending set and existing-data preservation, then run test_jobs.py, test_administration.py, test_stats_overview.py and test_stats_kpi.py. Do not use operational data as fixtures. The reviewer applied no migrations.
5. Complete local build and EgoLite screen/API checks; run npm run docker:up after approval. Validate local Docker before server deployment. Server deployment is permitted only by the current explicit user instruction, using company Dockerfile/release parity workflow.
6. Apply the exact pending set through app.migrate in one transaction. A lock/statement timeout or any error requires rollback and diagnosis; never mark a failed migration applied. Run ANALYZE dc.job_posting_option after successful commit because SET EXPRESSION removes column statistics.
7. Verify ledger/checksums, generated expression/FK/CHECK, old option counts and mappings, unchanged non-NULL legacy, district parents, stats.2 grants and advanced role versions. A pre-deployment role version must yield 409. Re-running the runner must skip these migrations.
8. Measure Docker then server UI/API errors, status, duration, payload and duplicate calls. Statistics aggregate scans and repeated roadmap_progress need actual timings; no performance claim is approved without measurement. Record deployment/verification independently.

## Rollback

Before commit, runner rollback restores the complete pending set. After commit prefer forward fix or app rollback with additive schema retained. Keep view history and district options. An older app can erase DISTRICT rows when saving a posting, so disable job writes during an old-app rollback until forward compatibility is restored. Never restore the old option CHECK/expression while DISTRICT rows exist. If disabling KPI menu, use a new migration and advance affected role versions; never decrement versions. Do not drop district codes referenced by options/events. Restore backup only under a deliberate recovery procedure that accounts for post-backup writes.

## Required contract checks and follow-up

- Views: authenticated student only, same-day duplicate/concurrent requests stay one row; deleted/missing posting rejected; staff views do not increment.
- Districts: JSON arrays round trip; inactive/missing/wrong-parent codes rejected; existing region-only posting remains editable; metadata includes nullable up_code; parent edit and code-change audit/version behavior tested.
- Stats: non-counselors rejected; mine/all and counsel role filters; no personal records in aggregate output; monthly lengths/date errors; KPI missing sources remain null/NA and unknown targets null/NONE.
- Existing limitations, not migration blockers: code management can reparent an already-used district without rewriting existing posting REGION options; prohibit such reparenting operationally pending a dedicated guarded change. Pipeline/KPI counsel counts aggregate all kinds, unlike role-filtered counsel-area charts; this is the current source contract and must not be represented as role-filtered detailed counts. KPI date range has no 3-year cap; assess bounded query execution before expanding usage.
