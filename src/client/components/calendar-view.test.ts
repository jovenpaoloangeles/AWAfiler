import { expect, test } from "bun:test";
import type { Entry } from "@/lib/api";
import { getDayBorder } from "./calendar-view";

const e = (status: Entry["status"]) => ({ status }) as Entry;

test("getDayBorder distinguishes planned from finalized", () => {
  expect(getDayBorder([])).toBe("none");
  expect(getDayBorder([e("planned")])).toBe("planned");
  expect(getDayBorder([e("finalized")])).toBe("finalized");
  expect(getDayBorder([e("draft"), e("finalized")])).toBe("mixed");
  expect(getDayBorder([e("planned"), e("finalized")])).toBe("mixed");
});
