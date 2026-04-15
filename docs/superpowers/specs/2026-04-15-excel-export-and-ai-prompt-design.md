# Excel Export & AI Prompt Improvement Design

**Date:** 2026-04-15
**Status:** Approved

## Overview

Two features for AWAfiler:
1. An "Export Excel" button that generates an `.xlsx` file from entries, with a date range picker and "select all" option.
2. Improved AI system prompt to generate gradual, incremental development entries that follow natural project phases.

---

## Feature 1: Excel Export

### Dialog Component

A new `ExportExcelDialog` component modeled after the existing `GeneratePdfDialog`.

**Trigger:** New "Export Excel" button in the sidebar (next to existing "Generate PDF" button).

**Dialog contents:**
- "Select All" option to export every entry
- Date range picker (from/to) for filtered export
- "Export" button to trigger download
- "Cancel" button to close

### Excel File Structure

- Single sheet named "Entries"
- Columns: **Date**, **Work Assignment**, **Accomplishments**
- Header row styled with bold text
- Entries sorted by date ascending
- File name: `AWAfiler_Entries_YYYY-MM-DD_to_YYYY-MM-DD.xlsx` (or `AWAfiler_All_Entries_YYYY-MM-DD.xlsx` for "select all")

### Implementation

- Install `xlsx` (SheetJS) as a dependency
- Create `src/client/lib/export-excel.ts` utility function
- Reuse existing `GET /api/entries` endpoint with `dateFrom`/`dateTo` query params for filtering
- Use browser `Blob` + `URL.createObjectURL` pattern for file download (same as existing PDF export)

### Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `xlsx` dependency |
| `src/client/components/export-excel-dialog.tsx` | New component |
| `src/client/lib/export-excel.ts` | New utility function |
| `src/client/components/sidebar.tsx` | Add "Export Excel" button |

---

## Feature 2: AI System Prompt Improvement

### Problem

The current system prompt in `src/server/ai.ts` is minimal. It lacks guidance on:
- How much work one entry represents (a day vs. a week)
- How development phases should progress over time
- How to learn and match the user's writing style from recent entries

### Solution: Enhanced System Prompt

Add two sections to `SYSTEM_PROMPT_TEMPLATE`:

**Pacing Rules:**
- Each generated entry represents **one work day** of effort
- Development work follows a natural, gradual progression:
  1. Requirements gathering / planning
  2. Environment setup / configuration
  3. Development / implementation
  4. Code review / refinement
  5. Testing (unit, integration, user acceptance)
  6. Bug fixes / adjustments
  7. Deployment / rollout
  8. Documentation / handover
- Never skip phases — don't go from "testing" on day 1 to "deployment" on day 2
- Each day's accomplishment should be a logical continuation of the previous day

**Style Matching:**
- Analyze the user's recent entries (already provided in the prompt) for:
  - Sentence structure patterns (short vs. long sentences)
  - Level of detail (brief summaries vs. detailed descriptions)
  - Technical depth (jargon-heavy vs. accessible)
  - Common phrases or formatting patterns
- Match these patterns when generating new entries

### Files Changed

| File | Change |
|------|--------|
| `src/server/ai.ts` | Update `SYSTEM_PROMPT_TEMPLATE` with pacing rules and style matching instructions |

---

## Out of Scope

- Server-side Excel generation
- Database schema changes
- New API endpoints
- Adding phase tracking to entries
