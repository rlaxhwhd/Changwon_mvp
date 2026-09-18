---
name: graft
description: Use the project's local Graft code graph to find existing implementations, inspect imports and callers, and assess change impact before modifying shared code.
---

# Project Graft integration

Read `AGENTS.md` first. This skill is the project's Docker adaptation, not an upstream-generated file.

1. Use the `graft-changwon` MCP's `graft_check_freshness`, then `graft_find_code` to locate the existing implementation. Discover tool schemas before calling them.
2. Inspect `graft_file_api` and `graft_trace_calls` for the selected symbol. Use `graft_find_all` or `rg` to search other implementations and HTTP endpoint strings.
3. Read the actual source before editing. Prefer imports from existing shared modules. Extract genuinely equivalent logic when appropriate, preserving differences in permissions, side effects and business rules.
4. Query affected callers after the edit and run checks appropriate to the change. Queries refresh the structural graph automatically; they do not replace tests, Chrome MCP or DB review.

If MCP tools are not injected into this session, use the verified CLI from the repository root:

```powershell
powershell -NoProfile -File tools/graft/graft.ps1 check
powershell -NoProfile -File tools/graft/graft.ps1 ask "mission week question selection"
powershell -NoProfile -File tools/graft/graft.ps1 skeleton shared/missions.ts
powershell -NoProfile -File tools/graft/graft.ps1 callers currentMonday
```

The container's `/workspace` maps to this checkout. Resolve returned relative paths against this repository, not the container filesystem.
Docker Desktop must be running. Installation and recovery: `docs/GRAFT_SETUP.md`.
In this structural-only setup, freshness output may say `NO GRAPH` for the semantic manifest while also saying `graph check: OK` for the code graph. The latter is the relevant structural status; do not run `--deep` just to remove the semantic notice.

The graph covers application source and backend tests; it does not replace Markdown rules, skills, SQL migrations, runtime network tracing, or database inspection. Do not enable external Brain/LLM services or run upstream `graft init` automatically: this integration already supplies the Windows-compatible MCP wiring, and upstream hooks assume a native CLI.
