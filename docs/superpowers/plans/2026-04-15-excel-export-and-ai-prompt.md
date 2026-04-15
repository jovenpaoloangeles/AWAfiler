# Excel Export & AI Prompt Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Export Excel" button with date range picker that generates an `.xlsx` file, and improve the AI system prompt to generate gradual, realistic development entries.

**Architecture:** Client-side Excel generation using SheetJS (`xlsx` library) with a dialog modeled after the existing `GeneratePdfDialog`. AI prompt improvement is a single-file change to `src/server/ai.ts`. No backend changes needed.

**Tech Stack:** React, TypeScript, SheetJS (xlsx), Tailwind CSS, shadcn/ui, Bun

---

### Task 1: Install xlsx dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install xlsx package**

Run: `bun add xlsx`
Expected: Package installs successfully, `xlsx` appears in `package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add xlsx dependency for Excel export"
```

---

### Task 2: Create Excel export utility

**Files:**
- Create: `src/client/lib/export-excel.ts`

- [ ] **Step 1: Create the export utility function**

Create `src/client/lib/export-excel.ts`:

```typescript
import * as XLSX from "xlsx";
import type { Entry } from "./api";

export function exportToExcel(entries: Entry[], start?: string, end?: string): void {
  // Sort entries by date ascending
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build worksheet data with only the 3 required columns
  const data = sorted.map((entry) => ({
    Date: entry.date,
    "Work Assignment": entry.work_assignment,
    Accomplishments: entry.accomplishments,
  }));

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 14 }, // Date
    { wch: 40 }, // Work Assignment
    { wch: 60 }, // Accomplishments
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Entries");

  // Generate filename
  const today = new Date().toISOString().split("T")[0];
  let filename: string;
  if (start && end) {
    filename = `AWAfiler_Entries_${start}_to_${end}.xlsx`;
  } else {
    filename = `AWAfiler_All_Entries_${today}.xlsx`;
  }

  // Trigger download
  XLSX.writeFile(wb, filename);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/lib/export-excel.ts
git commit -m "feat: add Excel export utility function"
```

---

### Task 3: Create ExportExcelDialog component

**Files:**
- Create: `src/client/components/export-excel-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

Create `src/client/components/export-excel-dialog.tsx`. This follows the same pattern as `GeneratePdfDialog` — a Sheet with preset/custom date range modes, plus a "Select All" option:

```tsx
import { useState, useMemo, useCallback } from "react";
import { FileSpreadsheet, Loader2, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface PeriodOption {
  label: string;
  value: string;
  start: string;
  end: string;
}

function buildPresets(): PeriodOption[] {
  const now = new Date();
  const options: PeriodOption[] = [];

  for (let offset = 0; offset < 12; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const monthName = MONTH_NAMES[month];
    const mm = String(month + 1).padStart(2, "0");

    options.push({
      label: `${monthName} 1-15, ${year}`,
      value: `${year}-${mm}-first`,
      start: `${year}-${mm}-01`,
      end: `${year}-${mm}-15`,
    });

    options.push({
      label: `${monthName} 16-${daysInMonth}, ${year}`,
      value: `${year}-${mm}-second`,
      start: `${year}-${mm}-16`,
      end: `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`,
    });
  }

  options.sort((a, b) => b.start.localeCompare(a.start));
  return options;
}

type ExportMode = "all" | "preset" | "custom";

export function ExportExcelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const presets = useMemo(() => buildPresets(), []);

  const [mode, setMode] = useState<ExportMode>("all");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [exporting, setExporting] = useState(false);

  const selectedRange = useMemo(() => {
    if (mode === "all") {
      return { start: undefined as string | undefined, end: undefined as string | undefined, label: "All Entries" };
    }
    if (mode === "preset") {
      const preset = presets.find((p) => p.value === selectedPreset);
      return preset ? { start: preset.start, end: preset.end, label: preset.label } : null;
    }
    if (customStart && customEnd) {
      return { start: customStart, end: customEnd, label: `${customStart} to ${customEnd}` };
    }
    return null;
  }, [mode, selectedPreset, customStart, customEnd, presets]);

  const handleExport = useCallback(async () => {
    if (!selectedRange) return;

    setExporting(true);
    try {
      const params: { start?: string; end?: string } = {};
      if (selectedRange.start) params.start = selectedRange.start;
      if (selectedRange.end) params.end = selectedRange.end;

      const entries = await api.getEntries(params);

      if (entries.length === 0) {
        toast.error("No entries found for the selected period.");
        return;
      }

      exportToExcel(entries, selectedRange.start, selectedRange.end);
      toast.success("Excel file exported successfully!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export Excel");
    } finally {
      setExporting(false);
    }
  }, [selectedRange, onOpenChange]);

  const isReady = mode === "all" || !!selectedRange;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Export to Excel</SheetTitle>
          <SheetDescription>
            Select entries to export as an Excel file.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4">
          {/* Mode toggle */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("all")}
            >
              <CheckCircle className="size-4" />
              Select All
            </Button>
            <Button
              variant={mode === "preset" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("preset")}
            >
              <Calendar className="size-4" />
              Preset Period
            </Button>
            <Button
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("custom")}
            >
              Custom Range
            </Button>
          </div>

          <Separator />

          {mode === "preset" ? (
            <div className="space-y-2">
              <Label>Covered Period</Label>
              <Select
                value={selectedPreset}
                onValueChange={(v) => setSelectedPreset(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a period..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : mode === "custom" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="excel-start">Start Date</Label>
                <Input
                  id="excel-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="excel-end">End Date</Label>
                <Input
                  id="excel-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              All entries will be exported.
            </div>
          )}

          {selectedRange && mode !== "all" && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <span className="font-medium">Period:</span>{" "}
              {selectedRange.label}
              <br />
              <span className="text-muted-foreground text-xs">
                {selectedRange.start} → {selectedRange.end}
              </span>
            </div>
          )}

          <Button
            onClick={handleExport}
            disabled={!isReady || exporting}
            className="w-full"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/components/export-excel-dialog.tsx
git commit -m "feat: add ExportExcelDialog component with date range picker"
```

---

### Task 4: Wire ExportExcelDialog into sidebar and App

**Files:**
- Modify: `src/client/components/sidebar.tsx`
- Modify: `src/client/App.tsx`

- [ ] **Step 1: Add Export Excel button to sidebar**

In `src/client/components/sidebar.tsx`:

1. Add `FileSpreadsheet` to the lucide-react import:
```typescript
import {
  CalendarDays,
  Table2,
  BookOpen,
  Settings,
  FileText,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
```

2. Add `onExportExcel` prop to the component:
```typescript
export function Sidebar({
  onGeneratePdf,
  onExportExcel,
}: {
  onGeneratePdf?: () => void;
  onExportExcel?: () => void;
}) {
```

3. Add the Export Excel button after the Generate PDF button (after line 65):
```tsx
{/* Export Excel */}
<button
  onClick={onExportExcel}
  className={cn(
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    "text-muted-foreground hover:bg-muted hover:text-foreground"
  )}
>
  <FileSpreadsheet className="h-4 w-4" />
  Export Excel
</button>
```

- [ ] **Step 2: Wire dialog into App.tsx**

In `src/client/App.tsx`:

1. Add import:
```typescript
import { ExportExcelDialog } from "@/components/export-excel-dialog";
```

2. Add state for the dialog (after line 13):
```typescript
const [excelDialogOpen, setExcelDialogOpen] = useState(false);
```

3. Pass prop to Sidebar (update line 19):
```tsx
<Sidebar
  onGeneratePdf={() => setPdfDialogOpen(true)}
  onExportExcel={() => setExcelDialogOpen(true)}
/>
```

4. Add the dialog component (after the GeneratePdfDialog, before Toaster):
```tsx
<ExportExcelDialog
  open={excelDialogOpen}
  onOpenChange={setExcelDialogOpen}
/>
```

- [ ] **Step 3: Verify the app builds without errors**

Run: `bun run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/client/components/sidebar.tsx src/client/App.tsx
git commit -m "feat: wire ExportExcelDialog into sidebar and app"
```

---

### Task 5: Improve AI system prompt

**Files:**
- Modify: `src/server/ai.ts:4-22`

- [ ] **Step 1: Update the SYSTEM_PROMPT_TEMPLATE**

Replace the entire `SYSTEM_PROMPT_TEMPLATE` string in `src/server/ai.ts` (lines 4-22) with:

```typescript
const SYSTEM_PROMPT_TEMPLATE = `You are an AI writing assistant for AWAfiler, a work accomplishment filing system.

## User Profile
- Name: {name}
- Position: {position}
- Division: {division}

## Recent Entries (last 30 days, for tone matching)
{recent_entries}

## Reference Documents
{context_documents}

## Instructions
- Write in formal, professional government/bureaucratic tone.
- Use action verbs and measurable outcomes where possible.
- Keep accomplishments concise but descriptive.
- Match the writing style of the user's recent entries.

## Development Pacing Rules
When generating work entries, each entry represents exactly ONE work day of effort. Development work must follow a natural, gradual progression through these phases:

1. Requirements gathering / planning
2. Environment setup / configuration
3. Development / implementation (may span multiple days)
4. Code review / refinement
5. Testing (unit testing, integration testing, user acceptance testing)
6. Bug fixes and adjustments (may span multiple days)
7. Deployment / rollout
8. Documentation / handover

CRITICAL: Never skip phases. Do not jump from "testing" on one day to "deployment" the next. Each day's accomplishment should be a logical continuation of the previous day's work. A realistic project takes weeks — not days. Spread work across multiple entries per phase when appropriate.

## Style Matching
Analyze the user's recent entries (provided above) and match their writing style:
- Sentence structure (short concise sentences vs. longer descriptive ones)
- Level of detail (brief summaries vs. thorough descriptions)
- Technical depth (heavy jargon vs. accessible language)
- Common phrases, formatting patterns, and recurring vocabulary
- Tone balance (formal vs. approachable)

Generated entries should be indistinguishable from the user's own writing.
`;
```

- [ ] **Step 2: Commit**

```bash
git add src/server/ai.ts
git commit -m "feat: improve AI prompt with development pacing rules and style matching"
```

---

### Task 6: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `bun run dev`
Expected: Server starts without errors.

- [ ] **Step 2: Test Excel export**

1. Open the app in a browser
2. Click "Export Excel" in the sidebar
3. Verify the dialog opens with three mode buttons: "Select All", "Preset Period", "Custom Range"
4. Test "Select All" — click Export, verify an `.xlsx` file downloads with columns: Date, Work Assignment, Accomplishments
5. Test "Preset Period" — select a period, export, verify file name includes the date range
6. Test "Custom Range" — enter dates, export, verify filtering works
7. Verify empty state — select a date range with no entries, verify error toast appears

- [ ] **Step 3: Test AI prompt improvement**

1. Navigate to the table view or calendar view
2. Use the AI assist feature to generate entries (using "generate-assignment" mode)
3. Verify that generated entries show gradual, incremental progress (not jumping between phases)
4. Verify that the writing style matches the user's existing entries
