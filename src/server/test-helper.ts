import { Database } from "bun:sqlite";
import { existsSync, unlinkSync } from "fs";

/**
 * Set a unique temp DATABASE_PATH env var so db.ts creates an isolated
 * test database. Must be called BEFORE any module that imports `db`.
 *
 * IMPORTANT: Because Bun caches ES modules, db.ts is only imported once.
 * All test files share the same database. Only the first call to setupTestDb()
 * actually takes effect for the db module. Subsequent calls update the env var
 * but the db module's connection is already established.
 *
 * Therefore, tests should NOT call setupTestDb() independently. Instead,
 * use a single shared setup. For now, each test file's beforeAll should
 * call this, but only the first one matters for the db module.
 */
export function setupTestDb(): string {
  // Only set if not already set (by a prior test file)
  if (!process.env.__AWAFILER_TEST_DB_PATH) {
    const testDbPath = `/tmp/awafiler-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    process.env.DATABASE_PATH = testDbPath;
    process.env.__AWAFILER_TEST_DB_PATH = testDbPath;
  }
  return process.env.DATABASE_PATH!;
}

/**
 * Remove the temp database file after tests finish.
 */
export function cleanupTestDb(): void {
  const path = process.env.__AWAFILER_TEST_DB_PATH;
  if (path && existsSync(path)) {
    unlinkSync(path);
  }
}

/**
 * Directly open the test database (after it has been created by importing db).
 * Useful for seeding or inspecting data outside the route handlers.
 */
export function openTestDb(): Database {
  return new Database(process.env.DATABASE_PATH!, { strict: true });
}
