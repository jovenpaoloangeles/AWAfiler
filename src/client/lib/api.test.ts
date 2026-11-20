import { beforeEach, describe, expect, test } from "bun:test";
import { api, isUnfilled, nextStatus, statusAfterSave } from "./api";

// bun has no localStorage; api.ts only needs getItem/setItem.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
});

describe("leave dates", () => {
  test("missing leave_dates in stored data reads as []", () => {
    localStorage.setItem(
      "awafiler-data",
      JSON.stringify({ version: 1, profile: {}, entries: [], context_documents: [] })
    );
    expect(api.getLeaveDates()).toEqual([]);
    api.addLeaveDate("2026-12-21");
    expect(api.getLeaveDates()).toEqual(["2026-12-21"]);
  });

  test("addLeaveDate dedupes and getLeaveDates sorts", () => {
    api.addLeaveDate("2026-12-22");
    api.addLeaveDate("2026-12-21");
    api.addLeaveDate("2026-12-22");
    expect(api.getLeaveDates()).toEqual(["2026-12-21", "2026-12-22"]);
  });

  test("removeLeaveDate removes, and is a no-op when absent", () => {
    api.addLeaveDate("2026-12-21");
    api.removeLeaveDate("2026-12-21");
    expect(() => api.removeLeaveDate("2026-12-25")).not.toThrow();
    expect(api.getLeaveDates()).toEqual([]);
  });

  test("leave dates never appear in getEntries", () => {
    api.addLeaveDate("2026-12-21");
    expect(api.getEntries({ start: "2026-12-01", end: "2026-12-31" })).toEqual([]);
  });
});

describe("planned entries", () => {
  test("isUnfilled treats whitespace as blank", () => {
    const e = api.createEntry({ date: "2026-12-02", status: "planned", accomplishments: "  \n " });
    expect(isUnfilled(e)).toBe(true);
    expect(isUnfilled({ ...e, accomplishments: "Did X" })).toBe(false);
  });

  test("statusAfterSave", () => {
    expect(statusAfterSave("planned", "")).toBe("planned");
    expect(statusAfterSave("planned", "   ")).toBe("planned");
    expect(statusAfterSave("planned", "Did X")).toBe("draft");
    expect(statusAfterSave("finalized", "Did X")).toBe("finalized");
    expect(statusAfterSave("draft", "")).toBe("draft");
  });

  test("ERP sync keeps a blank planned entry planned", () => {
    api.createEntry({ date: "2026-12-02", status: "planned" });
    api.upsertErpEntries([{ date: "2026-12-02", work_assignment: "Pass slip work" }]);
    const [e] = api.getEntries({ start: "2026-12-02", end: "2026-12-02" });
    expect(e.status).toBe("planned");
    expect(e.work_assignment).toBe("Pass slip work");
  });
});

test("nextStatus: planned → draft → finalized → draft", () => {
  expect(nextStatus("planned")).toBe("draft");
  expect(nextStatus("draft")).toBe("finalized");
  expect(nextStatus("finalized")).toBe("draft");
});
