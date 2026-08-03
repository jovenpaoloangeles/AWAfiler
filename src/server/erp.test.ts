import { describe, test, expect } from "bun:test";
import { payrollPeriod, toEntries, type PassSlip } from "./erp";

const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));
const iso = (d: Date): string => d.toISOString().slice(0, 10);

function slip(start: Date, end: Date, purpose: string[]): PassSlip {
  return { id: "1", start, end, status: "Approved as Official", purpose };
}

describe("payrollPeriod()", () => {
  test("first half of the month covers the 1st to the 15th", () => {
    const [start, end] = payrollPeriod(new Date(2026, 6, 3));
    expect(iso(start)).toBe("2026-07-01");
    expect(iso(end)).toBe("2026-07-15");
  });

  test("the 15th itself still belongs to the first half", () => {
    const [, end] = payrollPeriod(new Date(2026, 6, 15));
    expect(iso(end)).toBe("2026-07-15");
  });

  test("second half runs from the 16th to the end of the month", () => {
    const [start, end] = payrollPeriod(new Date(2026, 6, 20));
    expect(iso(start)).toBe("2026-07-16");
    expect(iso(end)).toBe("2026-07-31");
  });

  test("handles short months and leap years", () => {
    expect(iso(payrollPeriod(new Date(2026, 1, 20))[1])).toBe("2026-02-28");
    expect(iso(payrollPeriod(new Date(2024, 1, 20))[1])).toBe("2024-02-29");
    expect(iso(payrollPeriod(new Date(2026, 3, 20))[1])).toBe("2026-04-30");
  });
});

describe("toEntries()", () => {
  test("expands a multi-day slip into one entry per day", () => {
    const entries = toEntries([slip(utc(2026, 7, 14), utc(2026, 7, 16), ["Site visit"])]);

    expect(entries.map((e) => e.date)).toEqual([
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
    ]);
    expect(entries.every((e) => e.work_assignment === "Site visit")).toBe(true);
  });

  test("a single-day slip yields exactly one entry", () => {
    const entries = toEntries([slip(utc(2026, 7, 14), utc(2026, 7, 14), ["Meeting"])]);
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe("2026-07-14");
  });

  test("merges slips that fall on the same day instead of duplicating rows", () => {
    const entries = toEntries([
      slip(utc(2026, 7, 14), utc(2026, 7, 14), ["Meeting"]),
      slip(utc(2026, 7, 14), utc(2026, 7, 14), ["Site visit"]),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].work_assignment).toBe("Meeting\nSite visit");
  });

  test("deduplicates repeated purposes on a merged day", () => {
    const entries = toEntries([
      slip(utc(2026, 7, 14), utc(2026, 7, 14), ["Meeting"]),
      slip(utc(2026, 7, 14), utc(2026, 7, 14), ["Meeting"]),
    ]);
    expect(entries[0].work_assignment).toBe("Meeting");
  });

  test("sorts entries by date regardless of slip order", () => {
    const entries = toEntries([
      slip(utc(2026, 7, 20), utc(2026, 7, 20), ["Later"]),
      slip(utc(2026, 7, 14), utc(2026, 7, 14), ["Earlier"]),
    ]);
    expect(entries.map((e) => e.date)).toEqual(["2026-07-14", "2026-07-20"]);
  });

  test("produces the Entry shape the client expects", () => {
    const [entry] = toEntries([slip(utc(2026, 7, 14), utc(2026, 7, 14), ["Meeting"])]);

    expect(entry).toEqual({
      date: "2026-07-14",
      work_assignment: "Meeting",
      expected_output: "",
      accomplishments: "",
      duration_days: 1,
    });
  });

  test("does not cross a month boundary incorrectly", () => {
    const entries = toEntries([slip(utc(2026, 7, 30), utc(2026, 8, 2), ["Training"])]);
    expect(entries.map((e) => e.date)).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });

  test("returns nothing for no slips", () => {
    expect(toEntries([])).toEqual([]);
  });
});

// `bun test src/server/erp.test.ts` to run