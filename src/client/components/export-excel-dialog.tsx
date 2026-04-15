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
