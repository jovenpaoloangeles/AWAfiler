import { describe, test, expect } from "bun:test";
import { cn } from "./utils";

describe("cn() utility", () => {
  test("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn("text-red-500", "bg-blue-200")).toBe("text-red-500 bg-blue-200");
    expect(cn("px-4", "py-2", "text-sm")).toBe("px-4 py-2 text-sm");
  });

  test("handles conditional classes with falsy values", () => {
    expect(cn("base", false && "hidden")).toBe("base");
    expect(cn("base", null && "hidden")).toBe("base");
    expect(cn("base", undefined && "hidden")).toBe("base");
    expect(cn("base", 0 && "hidden")).toBe("base");
    expect(cn("base", "" && "hidden")).toBe("base");
  });

  test("handles conditional classes with truthy values", () => {
    expect(cn("base", true && "active")).toBe("base active");
    expect(cn("base", "condition" && "active")).toBe("base active");
  });

  test("deduplicates tailwind classes using twMerge", () => {
    // twMerge should resolve conflicting Tailwind classes
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  test("handles empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });
});
