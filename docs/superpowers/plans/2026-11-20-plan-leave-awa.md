# Plan Leave & AWA Ahead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mark days on the calendar view as Planned AWA or Leave in one click, and warn before exporting days whose accomplishments are blank.

**Architecture:** Planned AWA is a new entry status `"planned"`; leave is a separate `leave_dates: string[]` list in the localStorage `AppData`, so exports never see it. A quick dropdown menu on calendar days creates both. Pure helpers in `lib/api.ts` decide status transitions and "unfilled" entries; a shared warning component gates PDF and Excel export.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind, shadcn/ui (`components/ui/dropdown-menu.tsx` already present), `bun test`.

**Spec:** `docs/superpowers/specs/2026-11-20-plan-leave-awa-design.md`

## Global Constraints

- No new dependencies.
- Keep `AppData.version: 1`; a missing `leave_dates` must read as `[]` (existing browser data loads unchanged).
- Dates are `YYYY-MM-DD` strings everywhere.
- Colors: Planned AWA = amber (`amber-500` legend dot, dashed border, `bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300` chip); Leave = purple (`purple-500` legend dot, solid border, diagonal stripes, `bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300` chip). Follow the existing draft/finalized chip pattern in `calendar-view.tsx`.
- Copy: menu items "Plan AWA", "Mark leave", "New entry…"; on leave days "Remove leave", "Change to planned AWA"; empty planned chip text *Planned AWA* (italic); leave chip "Leave"; legend labels "Planned AWA", "Leave"; warning buttons "Go back" / "Generate anyway" (PDF) and "Go back" / "Export anyway" (Excel).
- Leave never appears in PDF, Excel, table view, or ERP sync.
- Run tests with `bun test src/client`; typecheck with `bunx tsc --noEmit -p tsconfig.json` (a pre-existing `baseUrl` deprecation message is expected and not a failure).

## Review Focus

1. Existing browser data without `leave_dates` → loads, leave list is empty, nothing crashes. (Task 1 test)
2. A `planned` entry must not render as "finalized" in the calendar — current `getDayBorder` treats any non-draft status as finalized. (Task 2 test)
3. Accomplishments containing only whitespace/newlines → counts as unfilled and stays planned. (Task 1 tests)
4. ERP sync onto a planned date with empty accomplishments → stays `planned`, only work assignment changes. (Task 1 test)
5. Marking leave on the same date twice → stored once; removing a non-existent leave date → no-op, no throw. (Task 1 test)

---

### Task 1: Data layer — planned status, leave dates, helpers

**Files:**
- Modify: `src/client/lib/api.ts`
- Test: `src/client/lib/api.test.ts` (create)

**Interfaces:**
- Produces:
  - `Entry["status"]` = `"planned" | "draft" | "finalized"`
  - `AppData.leave_dates: string[]`
  - `api.getLeaveDates(): string[]` (sorted ascending)
  - `api.addLeaveDate(date: string): void` (dedupes)
  - `api.removeLeaveDate(date: string): void` (no-op if absent)
  - `isUnfilled(entry: Entry): boolean` — `entry.accomplishments.trim() === ""`
  - `statusAfterSave(status: Entry["status"], accomplishments: string): Entry["status"]` — `"planned"` + non-blank accomplishments → `"draft"`; otherwise unchanged
  - `upsertErpEntries` keeps `status: "planned"` on an existing planned entry whose accomplishments are blank; otherwise unchanged behavior (sets `"draft"`).

- [ ] **Step 1: Write the failing tests** in `src/client/lib/api.test.ts`. Install an in-memory `localStorage` on `globalThis` in `beforeEach` (Map-backed `getItem/setItem/removeItem/clear`) and clear it per test.

```ts
test("missing leave_dates in stored data reads as []", () => {
  localStorage.setItem("awafiler-data", JSON.stringify({ version: 1, profile: {}, entries: [], context_documents: [] }));
  expect(api.getLeaveDates()).toEqual([]);
  api.addLeaveDate("2026-12-21");
  expect(api.getLeaveDates()).toEqual(["2026-12-21"]);
});
test("addLeaveDate dedupes and getLeaveDates sorts", () => {
  api.addLeaveDate("2026-12-22"); api.addLeaveDate("2026-12-21"); api.addLeaveDate("2026-12-22");
  expect(api.getLeaveDates()).toEqual(["2026-12-21", "2026-12-22"]);
});
test("removeLeaveDate removes, and is a no-op when absent", () => {
  api.addLeaveDate("2026-12-21");
  api.removeLeaveDate("2026-12-21");
  expect(() => api.removeLeaveDate("2026-12-25")).not.toThrow();
  expect(api.getLeaveDates()).toEqual([]);
});
test("leave dates never appear in getEntries", () => {
  api.addLeaveDate("2026-12-21");
  expect(api.getEntries({ start: "2026-12-01", end: "2026-12-31" })).toEqual([]);
});
test("isUnfilled treats whitespace as blank", () => {
  const e = api.createEntry({ date: "2026-12-02", status: "planned", accomplishments: "  \n " });
  expect(isUnfilled(e)).toBe(true);
  expect(isUnfilled({ ...e, accomplishments: "Did X" })).toBe(false);
});
test("statusAfterSave", () => {
  expect(statusAfterSave("planned", "")).toBe("planned");
  expect(statusAfterSave("planned", "   ")).toBe("planned");
  expect(statusAfterSave("planned", "Did X")).toBe("draft");
  expect(statusAfterSave("finalized", "Did X")).toBe("finalized");
  expect(statusAfterSave("draft", "")).toBe("draft");
});
test("ERP sync keeps a blank planned entry planned", () => {
  api.createEntry({ date: "2026-12-02", status: "planned" });
  api.upsertErpEntries([{ date: "2026-12-02", work_assignment: "Pass slip work" }]);
  const [e] = api.getEntries({ start: "2026-12-02", end: "2026-12-02" });
  expect(e.status).toBe("planned");
  expect(e.work_assignment).toBe("Pass slip work");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/client/lib/api.test.ts`
Expected: FAIL (`getLeaveDates` / `isUnfilled` / `statusAfterSave` not exported).

- [ ] **Step 3: Implement** the Interfaces above in `src/client/lib/api.ts`. `readData()` normalizes `parsed.leave_dates ??= []`; `createEmptyData()` includes `leave_dates: []`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/client`
Expected: all PASS (including existing `utils.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/client/lib/api.ts src/client/lib/api.test.ts
git commit -m "feat: add planned status and leave dates to data layer"
```

### Task 2: Calendar view — quick menu, rendering, legend

**Files:**
- Modify: `src/client/components/calendar-view.tsx`
- Test: `src/client/components/calendar-view.test.ts` (create)

**Interfaces:**
- Consumes: `api.getLeaveDates`, `api.addLeaveDate`, `api.removeLeaveDate`, `api.createEntry({ date, status: "planned" })`, `Entry["status"]` with `"planned"` (Task 1).
- Produces: exported `getDayBorder(entries: Entry[]): DayBorder` where `DayBorder = "none" | "planned" | "draft" | "finalized" | "mixed"`.

- [ ] **Step 1: Write the failing test** for `getDayBorder`:

```ts
const e = (status: Entry["status"]) => ({ status }) as Entry;
expect(getDayBorder([])).toBe("none");
expect(getDayBorder([e("planned")])).toBe("planned");
expect(getDayBorder([e("finalized")])).toBe("finalized");
expect(getDayBorder([e("draft"), e("finalized")])).toBe("mixed");
expect(getDayBorder([e("planned"), e("finalized")])).toBe("mixed");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test src/client/components/calendar-view.test.ts`
Expected: FAIL (`getDayBorder` not exported / returns `"finalized"` for planned).

- [ ] **Step 3: Implement**
  - Export `getDayBorder`; `"planned"` when all entries are planned; `"mixed"` when statuses differ; `getDayBorderColor("planned")` = dashed amber left border.
  - Read leave dates into a `Set<string>` re-read on the same `revision`/`refetch` as entries.
  - Day click: day with entries → open entry form (unchanged; planned entries open the form too). Empty day → `DropdownMenu` anchored to the cell with "Plan AWA" (`api.createEntry({date, status:"planned"})`, refetch, toast), "Mark leave" (`api.addLeaveDate`, refetch, toast), "New entry…" (existing form). Leave day → menu with "Remove leave" and "Change to planned AWA" (remove leave, then create planned entry).
  - Leave day rendering: purple solid left border, diagonal stripe background (`bg-[repeating-linear-gradient(...)]` using purple-50/purple-100, dark-mode equivalents), purple "Leave" chip.
  - Planned chip: amber dashed chip; text = `work_assignment` or italic *Planned AWA* when blank. Tooltip badge shows "planned".
  - Legend: add "Planned AWA" (`bg-amber-500`) and "Leave" (`bg-purple-500`) using the existing legend markup.

- [ ] **Step 4: Verify**

Run: `bun test src/client && bunx tsc --noEmit -p tsconfig.json`
Expected: tests PASS; no type errors besides the known `baseUrl` notice.
Manual: `bun run dev`, open the calendar, go to December 2026: Plan AWA on Dec 2, Mark leave on Dec 21, reload page → both persist; click Dec 21 → Remove leave works; dark mode toggle → chips readable.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/calendar-view.tsx src/client/components/calendar-view.test.ts
git commit -m "feat: plan AWA and mark leave from the calendar view"
```

### Task 3: Entry form and table view handle "planned"

**Files:**
- Modify: `src/client/components/entry-form.tsx`
- Modify: `src/client/components/table-view.tsx`

**Interfaces:**
- Consumes: `statusAfterSave` (Task 1).

- [ ] **Step 1: Implement**
  - Entry form `handleSave`: send `status: statusAfterSave(status, accomplishments)`. Status badge shows "Planned" (`variant="outline"`) for planned; clicking it on a planned entry sets `"draft"`; draft ↔ finalized unchanged.
  - Table view: badge "Planned" (`variant="outline"`) for planned entries; `handleToggleStatus` on planned → `"draft"`; draft ↔ finalized unchanged.

- [ ] **Step 2: Verify**

Run: `bun test src/client && bunx tsc --noEmit -p tsconfig.json`
Expected: PASS / no new type errors.
Manual: open a planned day, type only a work assignment, Save → still amber with the assignment as chip text; add accomplishments, Save → turns blue (draft). Table view shows "Planned" badge for a planned entry.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/entry-form.tsx src/client/components/table-view.tsx
git commit -m "feat: support planned status in entry form and table view"
```

### Task 4: Unfilled-days warning before PDF and Excel export

**Files:**
- Create: `src/client/components/unfilled-warning.tsx`
- Modify: `src/client/components/generate-pdf-dialog.tsx`
- Modify: `src/client/components/export-excel-dialog.tsx`

**Interfaces:**
- Consumes: `isUnfilled` (Task 1).
- Produces: `UnfilledWarning({ dates, confirmLabel, onBack, onConfirm }: { dates: string[]; confirmLabel: string; onBack: () => void; onConfirm: () => void })` — inline alert listing dates as "Dec 2, Dec 9" (short month + day, add year only when the list spans years) with message "… have no accomplishments yet." and two buttons.

- [ ] **Step 1: Implement**
  - Both dialogs: after fetching entries (and after the existing empty-period check), compute `entries.filter(isUnfilled)`. If non-empty, store entries + unfilled dates in state and render `UnfilledWarning` in the sheet instead of generating. "Go back" clears that state; confirm runs the existing `generatePdf(...)` / `exportToExcel(...)` with the same entries unchanged (blank cells render as empty rows — no changes to `generate-pdf.ts` or `export-excel.ts`).
  - Applies in every Excel mode including "Select All". PDF confirm label "Generate anyway"; Excel "Export anyway".

- [ ] **Step 2: Verify**

Run: `bun test src/client && bunx tsc --noEmit -p tsconfig.json`
Expected: PASS / no new type errors.
Manual: with planned blank Dec 2 and a filled Dec 3, generate PDF for "December 1-15, 2026" → warning lists "Dec 2"; Go back closes warning; Generate anyway downloads a PDF where Dec 2 row has date + "1 Day" and empty text cells, and no leave rows. Excel "Select All" → same warning and rows.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/unfilled-warning.tsx src/client/components/generate-pdf-dialog.tsx src/client/components/export-excel-dialog.tsx
git commit -m "feat: warn before exporting days without accomplishments"
```
