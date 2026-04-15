import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";

const dbPath = process.env.DATABASE_PATH || "./data/awafiler.db";

mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath, { strict: true });
db.run("PRAGMA journal_mode = WAL;");

export function migrate() {
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

  // Add gemini_api_key column if not present (idempotent)
  const cols = db.query("PRAGMA table_info(profile)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "gemini_api_key")) {
    db.run("ALTER TABLE profile ADD COLUMN gemini_api_key TEXT DEFAULT NULL");
  }

  // Seed profile row if empty
  const profile = db.query("SELECT id FROM profile LIMIT 1").get();
  if (!profile) {
    db.query("INSERT INTO profile (name, position, division) VALUES ('', '', '')").run();
  }
}

// Auto-migrate on import
migrate();

export default db;
