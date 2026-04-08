import { describe, test, expect, beforeAll } from "bun:test";
import { setupTestDb, openTestDb } from "../test-helper";

// Set DATABASE_PATH before any imports that touch db
beforeAll(() => {
  setupTestDb();
});

function createRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, options);
}

describe("Entries API routes", () => {
  // Lazy-load the route handler so the DATABASE_PATH is set first
  let entriesRoutes: (req: Request, pathname: string) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("./entries");
    entriesRoutes = mod.entriesRoutes;
  });

  test("GET /api/entries returns empty array initially", async () => {
    const res = await entriesRoutes(createRequest("http://localhost/api/entries", { method: "GET" }), "/api/entries");
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  test("POST /api/entries creates an entry with correct fields", async () => {
    const body = {
      expected_output: "Complete report",
      work_assignment: "Write AWA",
      date: "2026-03-15",
      accomplishments: "Finished the report",
      duration_days: 2,
      status: "draft",
      ai_generated: 0,
    };

    const res = await entriesRoutes(
      createRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      "/api/entries"
    );

    expect(res.status).toBe(201);
    const entry = (await res.json()) as Record<string, unknown>;
    expect(entry.expected_output).toBe("Complete report");
    expect(entry.work_assignment).toBe("Write AWA");
    expect(entry.date).toBe("2026-03-15");
    expect(entry.accomplishments).toBe("Finished the report");
    expect(entry.duration_days).toBe(2);
    expect(entry.status).toBe("draft");
    expect(entry.ai_generated).toBe(0);
    expect(entry.id).toBeDefined();
    expect(entry.created_at).toBeDefined();
    expect(entry.updated_at).toBeDefined();
  });

  test("GET /api/entries/:id returns the created entry", async () => {
    // Create an entry first
    const createRes = await entriesRoutes(
      createRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-03-10", work_assignment: "Test task" }),
      }),
      "/api/entries"
    );
    const created = (await createRes.json()) as Record<string, unknown>;
    const id = created.id as string;

    // Fetch by ID
    const res = await entriesRoutes(
      createRequest(`http://localhost/api/entries/${id}`, { method: "GET" }),
      `/api/entries/${id}`
    );
    expect(res.status).toBe(200);
    const entry = (await res.json()) as Record<string, unknown>;
    expect(entry.id).toBe(id);
    expect(entry.work_assignment).toBe("Test task");
    expect(entry.date).toBe("2026-03-10");
  });

  test("GET /api/entries?month=2026-03 filters by month", async () => {
    // Insert entries in different months via direct DB access
    const db = openTestDb();
    db.query(
      `INSERT INTO entries (id, expected_output, work_assignment, date, accomplishments, duration_days, status, ai_generated, created_at, updated_at)
       VALUES ('entry-march', '', '', '2026-03-20', '', 1, 'draft', 0, datetime('now'), datetime('now'))`
    ).run();
    db.query(
      `INSERT INTO entries (id, expected_output, work_assignment, date, accomplishments, duration_days, status, ai_generated, created_at, updated_at)
       VALUES ('entry-april', '', '', '2026-04-01', '', 1, 'draft', 0, datetime('now'), datetime('now'))`
    ).run();
    db.close();

    const res = await entriesRoutes(
      createRequest("http://localhost/api/entries?month=2026-03", { method: "GET" }),
      "/api/entries"
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>[];

    // All returned entries should have a date in 2026-03
    for (const entry of data) {
      expect((entry.date as string).startsWith("2026-03")).toBe(true);
    }
    // Should include the march entry
    const ids = data.map((e) => e.id);
    expect(ids).toContain("entry-march");
    expect(ids).not.toContain("entry-april");
  });

  test("PUT /api/entries/:id updates fields", async () => {
    // Create an entry
    const createRes = await entriesRoutes(
      createRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-01-01", accomplishments: "original" }),
      }),
      "/api/entries"
    );
    const created = (await createRes.json()) as Record<string, unknown>;
    const id = created.id as string;

    // Update it
    const res = await entriesRoutes(
      createRequest(`http://localhost/api/entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accomplishments: "updated text", duration_days: 5 }),
      }),
      `/api/entries/${id}`
    );
    expect(res.status).toBe(200);
    const entry = (await res.json()) as Record<string, unknown>;
    expect(entry.accomplishments).toBe("updated text");
    expect(entry.duration_days).toBe(5);
    // Fields not in the update body should be preserved
    expect(entry.id).toBe(id);
    expect(entry.date).toBe("2026-01-01");
  });

  test("DELETE /api/entries/:id removes the entry", async () => {
    // Create an entry
    const createRes = await entriesRoutes(
      createRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-02-01" }),
      }),
      "/api/entries"
    );
    const created = (await createRes.json()) as Record<string, unknown>;
    const id = created.id as string;

    // Delete it
    const deleteRes = await entriesRoutes(
      createRequest(`http://localhost/api/entries/${id}`, { method: "DELETE" }),
      `/api/entries/${id}`
    );
    expect(deleteRes.status).toBe(204);

    // Verify it's gone
    const getRes = await entriesRoutes(
      createRequest(`http://localhost/api/entries/${id}`, { method: "GET" }),
      `/api/entries/${id}`
    );
    expect(getRes.status).toBe(404);
  });

  test("PATCH /api/entries/:id/status updates status", async () => {
    // Create an entry
    const createRes = await entriesRoutes(
      createRequest("http://localhost/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-01-15", status: "draft" }),
      }),
      "/api/entries"
    );
    const created = (await createRes.json()) as Record<string, unknown>;
    const id = created.id as string;

    // Update status
    const res = await entriesRoutes(
      createRequest(`http://localhost/api/entries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finalized" }),
      }),
      `/api/entries/${id}/status`
    );
    expect(res.status).toBe(200);
    const entry = (await res.json()) as Record<string, unknown>;
    expect(entry.status).toBe("finalized");
    expect(entry.id).toBe(id);
  });

  test("GET /api/entries/:id returns 404 for non-existent entry", async () => {
    const res = await entriesRoutes(
      createRequest("http://localhost/api/entries/nonexistent-id", { method: "GET" }),
      "/api/entries/nonexistent-id"
    );
    expect(res.status).toBe(404);
  });
});
