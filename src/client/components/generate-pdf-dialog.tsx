import { useState, useMemo, useCallback } from "react";
import { FileDown, Loader2, Calendar } from "lucide-react";
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
import { generatePdf } from "@/lib/generate-pdf";

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

    // First half: 1-15
    options.push({
      label: `${monthName} 1-15, ${year}`,
      value: `${year}-${mm}-first`,
      start: `${year}-${mm}-01`,
      end: `${year}-${mm}-15`,
    });

    // Second half: 16-end
    options.push({
      label: `${monthName} 16-${daysInMonth}, ${year}`,
      value: `${year}-${mm}-second`,
      start: `${year}-${mm}-16`,
      end: `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`,
    });
  }

  // Sort descending (most recent first)
  options.sort((a, b) => b.start.localeCompare(a.start));
  return options;
}

function formatPeriodLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");

  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}-${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()} - ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

export function GeneratePdfDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const presets = useMemo(() => buildPresets(), []);

  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [generating, setGenerating] = useState(false);

  const selectedRange = useMemo(() => {
    if (mode === "preset") {
      const preset = presets.find((p) => p.value === selectedPreset);
      return preset ? { start: preset.start, end: preset.end, label: preset.label } : null;
    }
    if (customStart && customEnd) {
      return {
        start: customStart,
        end: customEnd,
        label: formatPeriodLabel(customStart, customEnd),
      };
    }
    return null;
  }, [mode, selectedPreset, customStart, customEnd, presets]);

  const handleGenerate = useCallback(async () => {
    if (!selectedRange) return;

    setGenerating(true);
    try {
      const [entries, profile] = await Promise.all([
        api.getEntries({ start: selectedRange.start, end: selectedRange.end }),
        api.getProfile(),
      ]);

      if (entries.length === 0) {
        toast.error("No entries found for the selected period.");
        return;
      }

      await generatePdf(entries, profile, selectedRange.label);
      toast.success("PDF generated successfully!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }, [selectedRange, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Generate PDF Report</SheetTitle>
          <SheetDescription>
            Select a covered period to generate your AWA accomplishment report.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
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
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pdf-start">Start Date</Label>
                <Input
                  id="pdf-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pdf-end">End Date</Label>
                <Input
                  id="pdf-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {selectedRange && (
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
            onClick={handleGenerate}
            disabled={!selectedRange || generating}
            className="w-full"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            {generating ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
