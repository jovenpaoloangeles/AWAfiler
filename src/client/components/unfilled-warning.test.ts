import { expect, test } from "bun:test";
import { formatUnfilledDates } from "./unfilled-warning";

test("formatUnfilledDates lists short dates, sorted", () => {
  expect(formatUnfilledDates(["2026-12-09", "2026-12-02"])).toBe("Dec 2, Dec 9");
});

test("formatUnfilledDates adds the year only when dates span years", () => {
  expect(formatUnfilledDates(["2027-01-04", "2026-12-28"])).toBe("Dec 28, 2026; Jan 4, 2027");
});
