# 0019 — Jobs AI submenu deployment

- Revision: 1 (2026-11-20)
- Status: ASTRA_APPROVED
- Scope: immutable migration 171 plus corrective migration 172; existing student navigation mapping.
- Baseline reviewed: dev f87e8f3. Lead reports local 171 already applied and server through 170; reviewer did not independently query either database.

## Required behavior

Keep stu-jobs.3.0 (resume) and .3.1 (consulting) array indices intact. Add .3.2 (cover), .3.3 (interview), .3.4 (interview/results). Display sort order is cover 0, resume 1, consulting 2, interview 3, results 4. New grants inherit existing parent grants once. Existing revoked grants must not be restored by 172.

171 is immutable. 172 advances auth_role.version for student and roles holding the parent or new menus, with role row locks ordered by role_code. This prevents a pre-deployment full-set menu save from silently deleting new grants. Schema, API JSON shapes and student record access rules remain unchanged.

## Execution contract

1. Record/backup relevant menu rows, grants, role versions and schema_migration checksums; no student records are needed in the review output. Confirm parent and original children exist with expected student portal/routes. New keys must be absent before 171, or already exactly match it. ON CONFLICT DO NOTHING does not repair conflicting existing definitions.
2. Stop menu-management writes for the complete migration window. For server 170, stop API writers before the runner applies 171 and 172 together. For local 171, apply only pending 172. The runner holds advisory lock 480091 and commits all pending migrations and ledger inserts through one psycopg connection context. Do not run either file through autocommit psql.
3. Verify file checksums against architecture-review.md. Apply first to an isolated test DB after this approval. Do not manually replay 171 on a live configured database: it can restore a grant intentionally revoked after its original application.
4. Test new keys/routes/order, exact parent-to-child initial grants, preservation of unrelated grants, metadata revision invalidation, and stale expectedVersion rejection (409). Test current-version save succeeds with existing behavior. For a clean server-like DB apply 171+172; for a local-like DB apply 172 after 171. Repeat the runner and verify it skips both unchanged ledger entries.
5. Complete required local build/tests and local Docker/EgoLite verification before explicitly authorized server deployment. Reopen menu-management pages. Verify student GNB navigation to all five targets, console/network behavior, and the existing consent gates. No external AI generation is required for menu verification.
6. Confirm pending migration set, schema_migration checksum parity and API readiness after deployment. A lock timeout aborts the transaction; resolve active writes and retry the runner. Never edit recorded checksums to bypass drift.

## Rollback

Prefer application rollback with additive menu records retained. If menu rollback is needed, create a new reviewed migration; never delete ledger history or edit 171/172. Check for newer children/references and administrator edits first. Delete new menu_auth rows before their menu rows; restore original .3.0/.3.1 sort values from the pre-deployment snapshot, increment their versions, increment affected role versions, and explicitly increment metadata_revision because menu DELETE alone lacks that trigger. Keep role versions monotonic; do not decrement 172. Preserve resume/interview/business data and audit events.

## Verification status

Static review only at approval time. No database application, SQL runtime test, browser measurement or deployment was performed by the reviewer. Execution results must be recorded by the lead. Atlas memory tools were unavailable to this reviewer.
