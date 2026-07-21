# Component map — shared program cards

## `ProgramCardGrid`

- Location: `src_v2/pages/growth/ProgramCardGrid.tsx`
- Role: presentation-only four-column program card grid. It reads no program data itself.
- Inputs: `programs`, `onSelect`, and optional `wished` / `onToggleWish` for the student-only wish control.
- Consumers:
  - `src_v2/pages/growth/ProgramApply.tsx` — program data comes from `src_admin/data/programs.ts`; opens `/growth/program/:id`.
  - `src_admin/pages/ProgramList.tsx` — uses the same card UI without wish props; opens `/programs/:id`.
- Card fields: image or placeholder, category, end-date-derived D-Day, title, two-line description, recruitment period, and capacity.
