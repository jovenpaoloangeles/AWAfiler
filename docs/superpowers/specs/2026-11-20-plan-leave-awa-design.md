# Plan Leave & AWA Ahead — Design

Date: 2026-11-20
Mockup: `.superpowers/brainstorm/697065-1795153352/content/calendar-plan.html` (option A chosen)

## Why

The user plans their leave and AWA (Alternative Work Arrangement) days weeks ahead (today: mapping
out through December) and currently tracks that plan in a separate notes app. They want the plan on
the app's own **calendar view**, so planned days sit next to their real entries. Accomplishments for
future days don't exist yet, so planned days must be allowed to stay empty.

## Goals

- Mark a future (or any) day as **Planned AWA** or **Leave** from the calendar view, one day at a
  time, in one click each (no form).
- See planned AWA and leave days at a glance, with both in the calendar legend.
- Fill in a planned AWA day later through the existing entry form.
- When generating a PDF for a period that still has blank planned AWA days, get warned first.

## Non-goals

- Range selection / drag to mark many days. User explicitly wants one day at a time.
- Syncing to Google Calendar or any external calendar. "Calendar" means the app's calendar view.
- Leave types (sick, vacation, etc.), leave balances, or approval workflows.
- Showing leave in the PDF or Excel export.

## Anti-goals

- Leave days leaking into the PDF, Excel export, table view, or ERP sync as if they were work entries.
- Making marking slower than writing it in notes (a form per day would be a failure).
- Breaking existing saved data in users' browsers.

## Behavior (decided with the user)

### Marking a day — quick menu (option A)

Clicking an **empty** day in the calendar opens a small menu anchored to that day:

- **Plan AWA**: immediately creates a planned AWA entry for that date. No form.
- **Mark leave**: immediately marks the date as leave. No form.
- **New entry…**: opens the existing entry form for that date (today's behavior).

Clicking a day that already has entries keeps today's behavior (opens the entry form for the first
entry).

### What each kind means

- **Planned AWA** = an entry with the date set and work assignment / accomplishments blank (they may
  be pre-filled later). It is a real entry: it eventually goes into the PDF like any other.
- **Leave** = a marker that the user is off that day. Nothing to fill in. Never appears in the PDF or
  Excel export.

### Look (from the mockup, follow existing calendar styling)

- Planned AWA: amber, **dashed** left border on the day and a dashed amber chip. Chip text is the
  work assignment if one is filled in, otherwise italic *Planned AWA*.
- Leave: purple solid left border, light purple diagonal stripes on the day, purple chip reading
  *Leave*.
- Legend in the calendar header gains **Planned AWA** (amber) and **Leave** (purple) next to the
  existing Draft (blue) and Finalized (green). Both light and dark mode must look right, using the
  same pattern as the existing draft/finalized chips (`bg-*-100 … dark:bg-*-900/30 …`).

### PDF generation with blank planned days

If the selected period contains planned AWA entries, the generate-PDF dialog warns before generating:
it lists those dates (e.g. "Dec 2, Dec 9 are planned but not filled in") with **Go back** and
**Generate anyway**. On Generate anyway, those days are included as rows with only **date and
duration** filled in (work assignment and accomplishments cells empty).

## Builder's notes — calls made by the assistant (not confirmed by the user)

These are my calls; the user may revisit them.

1. **Data model.**
   - Planned AWA: extend `Entry["status"]` to `"planned" | "draft" | "finalized"`. "Plan AWA" calls
     `api.createEntry({ date, status: "planned" })`.
   - Leave: stored separately as `leave_dates: string[]` (`YYYY-MM-DD`) on `AppData` in
     `src/client/lib/api.ts`, with `api.getLeaveDates()`, `api.addLeaveDate(date)`,
     `api.removeLeaveDate(date)`. Keeping leave out of `entries` means the PDF, Excel, table view,
     and ERP sync need no filtering to exclude it (anti-goal above).
   - Backward compatibility: `readData()` treats a missing `leave_dates` as `[]`. Keep
     `version: 1` (the field is additive), so existing saved data loads unchanged.
2. **When a day stops being planned.** A planned entry stays `planned` (amber) until its
   **accomplishments** are filled in; work assignment alone does not change it. So the amber chip can
   show a pre-filled work assignment. Concretely: on save from the entry form, if status is `planned`
   and accomplishments is non-empty, set status to `draft`; otherwise keep `planned`. ERP sync
   (`upsertErpEntries`) must not demote a `planned` entry to `draft` while its accomplishments are
   still empty. The form's status badge shows "Planned" for planned entries.
   **The PDF/Excel warning checks content, not status:** it lists every entry in the period whose
   accomplishments are empty (planned or not), since an empty accomplishments cell is what the
   warning exists to prevent.
3. **Clicking a leave day** opens the same quick menu with **Remove leave** and **Change to planned
   AWA** (removes the leave date, creates a planned entry).
4. **Conflicts.** The quick menu only appears on empty days, so a day can't be both leave and have
   entries via the menu. If ERP sync writes an entry onto a leave date, show both; no auto-cleanup.
   ERP sync already sets touched entries to `draft`, which naturally converts planned ones.
5. **Excel export** (decided by the user): same warning and same include-as-blank-rows behavior as
   the PDF, in every mode including "Select All". Future planned days are listed in the warning too.
6. **Table view** shows planned entries with a "Planned" badge (outline variant). Its status toggle
   on a planned entry moves it to `draft`.
7. **Menu component**: use the existing `components/ui/dropdown-menu.tsx` (already in the project),
   no new dependency.
8. **Legend color dots** reuse the existing legend markup (`h-3 w-1 rounded-full`), amber-500 and
   purple-500.

## Left to the builder

- Exact Tailwind classes for the stripe pattern and dashed borders (match the mockup's intent).
- Warning UI form inside the PDF/Excel sheets (inline alert in the sheet vs. a confirm step), as long
  as it lists the dates and offers Go back / Generate anyway.
- Toast copy for marking/unmarking.
- Tests: one small check for the `api` additions (leave add/remove/dedupe, missing
  `leave_dates` defaults to `[]`) alongside the existing `src/client/lib/utils.test.ts`.

## Files expected to change

- `src/client/lib/api.ts` — status union, `leave_dates`, leave methods.
- `src/client/components/calendar-view.tsx` — quick menu, new styles, legend, leave rendering.
- `src/client/components/entry-form.tsx` — handle `planned` status, convert to draft on save.
- `src/client/components/generate-pdf-dialog.tsx` — warning step.
- `src/client/components/export-excel-dialog.tsx` — same warning step.
- `src/client/components/table-view.tsx` — Planned badge / toggle.
- `.gitignore` — add `.superpowers/`.
