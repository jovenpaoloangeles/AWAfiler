import { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEntries } from "@/hooks/use-entries";
import { type Entry } from "@/lib/api";
import { EntryForm } from "@/components/entry-form";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatMonthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

type DayBorder = "none" | "draft" | "finalized" | "mixed";

function getDayBorderColor(border: DayBorder): string {
  switch (border) {
    case "draft":
      return "border-l-blue-500";
    case "finalized":
      return "border-l-green-500";
    case "mixed":
      return "border-l-blue-500";
    default:
      return "";
  }
}

function getDayBorder(entries: Entry[]): DayBorder {
  if (entries.length === 0) return "none";
  const hasDraft = entries.some((e) => e.status === "draft");
  const hasFinalized = entries.some((e) => e.status !== "draft");
  if (hasDraft && hasFinalized) return "mixed";
  if (hasDraft) return "draft";
  return "finalized";
}

export function CalendarView() {
  const today = new Date();
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [formOpen, setFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  const monthParam = formatMonthParam(viewYear, viewMonth);
  const { entries, loading, refetch } = useEntries({ month: monthParam });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) || [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [entries]);

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, []);

  const handleDayClick = useCallback(
    (dateStr: string) => {
      const dayEntries = entriesByDate.get(dateStr);
      if (dayEntries && dayEntries.length > 0) {
        setSelectedEntry(dayEntries[0]);
        setDefaultDate(null);
      } else {
        setSelectedEntry(null);
        setDefaultDate(dateStr);
      }
      setFormOpen(true);
    },
    [entriesByDate]
  );

  const handleNewEntry = useCallback(() => {
    const now = new Date();
    setSelectedEntry(null);
    setDefaultDate(formatDateStr(now.getFullYear(), now.getMonth(), now.getDate()));
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setSelectedEntry(null);
    setDefaultDate(null);
    refetch();
  }, [refetch]);

  // Build calendar grid cells
  const calendarCells = useMemo(() => {
    const cells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevDaysInMonth - i;
      cells.push({
        day,
        dateStr: formatDateStr(prevYear, prevMonth, day),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        dateStr: formatDateStr(viewYear, viewMonth, day),
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill 6 rows (42 cells)
    const remaining = 42 - cells.length;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let day = 1; day <= remaining; day++) {
      cells.push({
        day,
        dateStr: formatDateStr(nextYear, nextMonth, day),
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek]);

  const isToday = (dateStr: string) => dateStr === todayStr;

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-1 rounded-full bg-blue-500" />
                Draft
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-1 rounded-full bg-green-500" />
                Finalized
              </div>
            </div>
            <Button size="sm" onClick={handleNewEntry}>
              <Plus className="size-4" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading entries...</span>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-border">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {calendarCells.map((cell, idx) => {
                    const dayEntries = entriesByDate.get(cell.dateStr) || [];
                    const border = getDayBorder(dayEntries);
                    const isTodayCell = isToday(cell.dateStr);
                    const borderColor = getDayBorderColor(border);

                    return (
                      <div
                        key={idx}
                        className={`
                          group relative min-h-[100px] border-b border-r border-border p-1
                          ${!cell.isCurrentMonth ? "bg-muted/30" : ""}
                          ${borderColor ? `border-l-2 ${borderColor}` : ""}
                          cursor-pointer transition-colors hover:bg-muted/50
                        `}
                        onClick={() => handleDayClick(cell.dateStr)}
                      >
                        <div
                          className={`
                            flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                            ${isTodayCell ? "bg-primary text-primary-foreground" : ""}
                            ${!cell.isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"}
                          `}
                        >
                          {cell.day}
                        </div>

                        {/* Entry summaries */}
                        <div className="mt-0.5 space-y-0.5">
                          {dayEntries.slice(0, 2).map((entry) => (
                            <Tooltip key={entry.id}>
                              <TooltipTrigger>
                                <div
                                  className={`
                                    truncate rounded px-1 py-0.5 text-[11px] leading-tight
                                    ${entry.status === "draft"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    }
                                  `}
                                >
                                  {entry.work_assignment}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="text-xs">
                                  <div className="font-medium">{entry.work_assignment}</div>
                                  <Badge
                                    variant={
                                      entry.status === "draft"
                                        ? "secondary"
                                        : "default"
                                    }
                                    className="mt-1"
                                  >
                                    {entry.status}
                                  </Badge>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {dayEntries.length > 2 && (
                            <div className="px-1 text-[10px] text-muted-foreground">
                              +{dayEntries.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Entry Form Dialog */}
        <EntryForm
          open={formOpen}
          onClose={handleFormClose}
          entry={selectedEntry}
          defaultDate={defaultDate}
        />
      </div>
    </TooltipProvider>
  );
}
