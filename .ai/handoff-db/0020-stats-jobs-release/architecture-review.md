# 0020 — Astra architecture review

- Decision: **ASTRA_APPROVED** for work-order revision 1 and exact SQL below, conditional on its preflight/write-quiescence/validation contract.
- Date: 2026-11-23. Reviewer: delegated DB reviewer under codex-astra-db-reviewer instructions.
- This is design approval, not a claim of runtime tests, measured performance, or successful deployment. No DB was changed.

## Checksums

Runner-compatible SHA256 of UTF-8 text after Python universal-newline reading:

| File | SHA256 |
|---|---|
| 173_job_posting_view.sql | ae46321b735d8c78347fa086544991354d47031266f7592f619080fc872e994a |
| 174_stats_kpi_menu.sql | 8d96f6d0acfc7b65d6465d6716a89c6937adda0664ba2ac29bd2661e082854e3 |
| 175_job_region_district.sql | 8df356e3209507fc8d532727a6e2257807e99f6a924615cac8a6aad02dfd4f73 |

## Findings and design correction

No SQL source edits were made. The work order makes PostgreSQL version, write quiescence, conflict preflight, rewrite downtime and rollback write restrictions explicit. DB_SCHEMA.md gains the missing 173–175 schema contract.

173 has bounded row identity and concurrent idempotency through its PK. Student identity is principal-derived; the API checks the posting before insertion. The application grant excludes UPDATE/DELETE. Hard deletion of referenced students/postings is restricted by FKs; existing logical deletion is compatible. The new table starts empty, so historical totals are intentionally unavailable.

174 follows the original-index menu convention (stats.0/1/2). Aggregate version invalidation protects forms opened before migration after commit. However it is not safe to assert fully serialized live menu editing: menu_auth changes precede auth_role locks. Stop menu writes during deployment, as for release 0019. ON CONFLICT preserves existing rows but cannot certify a conflicting route/parent; inspect collisions. No API privilege is granted by menu visibility.

175 preserves prior CASE outputs, option keys and code relationships. Only previously NULL legacy fields are filled, with code-item version/time increments; existing non-NULL business values are untouched. Generated group_code still supplies the composite code FK. District parent membership is validated in the API, not as a cross-row DB constraint. Reparenting used codes remains a documented operational restriction, and no existing posting is silently rewritten.

[PostgreSQL 17 ALTER TABLE](https://www.postgresql.org/docs/17/sql-altertable.html) explicitly supports SET EXPRESSION AS for stored generated columns. It rewrites existing generated values and removes their statistics. Verify server major version, table size/locks and ANALYZE after migration. The runner uses one psycopg transaction and advisory lock for pending SQL plus ledger entries. 173's SET LOCAL statement_timeout=30s persists into 174/175 when all three run together; 175 alone does not set this timeout. Preserve atomic failure behavior and assess the actual pending set.

## Query / index assessment

| Query | Access path and remaining measurement |
|---|---|
| Posting view counts for a page | New PK(posting_id,viewed_on,student_uid) supports posting prefix; one batched query |
| View insert/idempotency | Composite PK plus posting/student FK indexes |
| Period/population view stats | PK is not led by viewed_on/student_uid; expect aggregate scan as history grows, measure before adding index |
| Job district filtering/options | Existing option PK and job_posting_option_filter(kind,code,posting_id); code_item composite PK/FK |
| Menu grants/versions | Small catalog, menu_auth composite PK; role locks ordered by role_code |
| Stats population and facts | Existing student identities, counsel_request_student, job_application_by_student and related domain indexes; KST casts can prevent ordinary timestamp range scans |
| Roadmap/KPI aggregates | Existing roadmap_progress reused, but repeated per-student lateral work requires timing/plan checks at representative population size |

No new materialized aggregate or JSON store is introduced. Responses aggregate existing source rows; monthly/top lists are bounded. Overview restricts periods to three years; KPI currently does not. No EXPLAIN or latency was measured by this reviewer. Slow-query remediation should be based on Docker network/server/DB measurements, not presumed indexes.

## Authority and JSON

Statistics reuse counselor(), requiring staff with career/psych role. Overview's counsel-area rows additionally filter counsel kind and mine counselor assignment. Pipeline/KPI aggregate counsel counts do not have that same kind filter; record this distinction explicitly. Code writes retain administrator guard, optimistic version, group advisory serialization and audit events. Metadata adds nullable up_code without removing existing fields; job DTO adds districts array; KPI preserves null values for unavailable sources and null targets. Existing tests cover shape, role rejection, district parent validation and overview scope; work-order verification extends concurrency, preservation and version checks.

## Release disposition

Technical blockers are unmet preconditions (unsupported PG version, checksum/schema conflicts, inability to quiesce writes, failed tests/parity, timeout/DDL failure), not a requirement to rewrite applied SQL. Follow work-order revision 1 in order. After-commit rollback retains added data and disables old-app posting writes; deleting DISTRICT rows to force downgrade is not approved.

Reviewed migrations 173–175, existing option/grant schema and runner, related API implementations, metadata, tests, project DB/spec/interop contracts and prior 0019 review. Graft graph was structurally current; kpi HTTP handler has no static incoming callers. Atlas tools were unavailable; no memory access or persistence is claimed.
