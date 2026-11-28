import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** ["2026-12-09","2026-12-02"] → "Dec 2, Dec 9"; adds years (";"-separated) when the dates span years. */
export function formatUnfilledDates(dates: string[]): string {
  const sorted = [...dates].sort();
  const multiYear = new Set(sorted.map((d) => d.slice(0, 4))).size > 1;
  return sorted
    .map((d) =>
      new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(multiYear && { year: "numeric" }),
      })
    )
    .join(multiYear ? "; " : ", ");
}

export function UnfilledWarning({
  warnings,
  confirmLabel,
  onBack,
  onConfirm,
}: {
  warnings: { unfilled: string[]; holidays: string[] };
  confirmLabel: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <div className="flex gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          {warnings.unfilled.length > 0 && (
            <p>
              <span className="font-medium">{formatUnfilledDates(warnings.unfilled)}</span>{" "}
              {warnings.unfilled.length === 1 ? "has" : "have"} no accomplishments yet. They'll
              appear as rows with only the date and duration.
            </p>
          )}
          {warnings.holidays.length > 0 && (
            <p>
              <span className="font-medium">{formatUnfilledDates(warnings.holidays)}</span>{" "}
              {warnings.holidays.length === 1 ? "is a holiday" : "are holidays"} but{" "}
              {warnings.holidays.length === 1
                ? "has an entry. It'll be exported as a work day."
                : "have entries. They'll be exported as work days."}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onBack}>
          Go back
        </Button>
        <Button size="sm" className="flex-1" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
