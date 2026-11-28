import { expect, test } from "bun:test";
import type { Entry } from "@/lib/api";
import { buildCalendarCells, getDayBorder } from "./calendar-view";

const e = (status: Entry["status"]) => ({ status }) as Entry;

test("getDayBorder distinguishes planned from finalized", () => {
  expect(getDayBorder([])).toBe("none");
  expect(getDayBorder([e("planned")])).toBe("planned");
  expect(getDayBorder([e("finalized")])).toBe("finalized");
  expect(getDayBorder([e("draft"), e("finalized")])).toBe("mixed");
  expect(getDayBorder([e("planned"), e("finalized")])).toBe("mixed");
});

test("buildCalendarCells spans 42 days including adjacent-month padding", () => {
  const dec = buildCalendarCells(2026, 11);
  expect(dec.length).toBe(42);
  expect(dec[0].dateStr).toBe("2026-11-29");
  expect(dec[41].dateStr).toBe("2027-01-09");
  const nov = buildCalendarCells(2026, 10);
  expect(nov[0].dateStr).toBe("2026-11-01");
  expect(nov[41].dateStr).toBe("2026-12-12");
});
