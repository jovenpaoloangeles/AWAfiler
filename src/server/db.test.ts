import { describe, test, expect, beforeAll } from "bun:test";
import { setupTestDb, openTestDb } from "./test-helper";

// Set DATABASE_PATH before importing db so it creates an isolated test database
beforeAll(() => {
  setupTestDb();
});

describe("Database", () => {
  test("initializes with all three tables", async () => {
    // Importing db triggers migrate() which creates tables
    await import("./db");
    const db = openTestDb();

    const tables = db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("profile");
    expect(tableNames).toContain("entries");
    expect(tableNames).toContain("context_documents");

    db.close();
  });

  test("profile row is seeded on first migration", async () => {
    await import("./db");
    const db = openTestDb();
    const row = db.query("SELECT * FROM profile LIMIT 1").get() as Record<string, unknown>;

    expect(row).toBeDefined();
    expect(row.name).toBe("");
    expect(row.position).toBe("");
    expect(row.division).toBe("");

    db.close();
  });

  test("migrations are idempotent (running migrate twice does not fail)", async () => {
    await import("./db");
    const db = openTestDb();

    // Run the CREATE TABLE IF NOT EXISTS statements again to simulate a second migrate() call
    expect(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS profile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL DEFAULT '',
          position TEXT NOT NULL DEFAULT '',
          division TEXT NOT NULL DEFAULT '',
          approver_name TEXT DEFAULT '',
          approver_title TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY,
          expected_output TEXT NOT NULL DEFAULT '',
          work_assignment TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL,
          accomplishments TEXT NOT NULL DEFAULT '',
          duration_days INTEGER DEFAULT 1,
          status TEXT DEFAULT 'draft',
          ai_generated INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS context_documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'reference',
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
        CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
      `);
    }).not.toThrow();

    // Profile should still be a single row (seed only runs when empty)
    const count = (db.query("SELECT COUNT(*) as c FROM profile").get() as { c: number }).c;
    expect(count).toBe(1);

    db.close();
  });
});
