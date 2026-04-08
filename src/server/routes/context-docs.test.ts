import { describe, test, expect, beforeAll } from "bun:test";
import { setupTestDb } from "../test-helper";

// Set DATABASE_PATH before any imports that touch db
beforeAll(() => {
  setupTestDb();
});

function createRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, options);
}

describe("Context Docs API routes", () => {
  let contextDocsRoutes: (req: Request, pathname: string) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("./context-docs");
    contextDocsRoutes = mod.contextDocsRoutes;
  });

  test("GET /api/context-docs returns empty array initially", async () => {
    const res = await contextDocsRoutes(
      createRequest("http://localhost/api/context-docs", { method: "GET" }),
      "/api/context-docs"
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  test("POST /api/context-docs creates a document with JSON body", async () => {
    const body = {
      title: "Test Document",
      content: "This is the content of the document.",
      type: "reference",
    };

    const res = await contextDocsRoutes(
      createRequest("http://localhost/api/context-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      "/api/context-docs"
    );

    expect(res.status).toBe(201);
    const doc = (await res.json()) as Record<string, unknown>;
    expect(doc.title).toBe("Test Document");
    expect(doc.type).toBe("reference");
    expect(doc.id).toBeDefined();
    expect(doc.created_at).toBeDefined();
    // Content should NOT be in the response (excluded from listing)
    expect(doc.content).toBeUndefined();
  });

  test("GET /api/context-docs excludes content from listing", async () => {
    // Create a document with content
    await contextDocsRoutes(
      createRequest("http://localhost/api/context-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Content Check Doc",
          content: "Sensitive content that should not appear in listing",
        }),
      }),
      "/api/context-docs"
    );

    const res = await contextDocsRoutes(
      createRequest("http://localhost/api/context-docs", { method: "GET" }),
      "/api/context-docs"
    );
    expect(res.status).toBe(200);
    const docs = (await res.json()) as Record<string, unknown>[];

    // Every doc should have these fields but NOT content
    for (const doc of docs) {
      expect(doc.id).toBeDefined();
      expect(doc.title).toBeDefined();
      expect(doc.type).toBeDefined();
      expect(doc.created_at).toBeDefined();
      expect(doc.content).toBeUndefined();
    }
  });

  test("DELETE /api/context-docs/:id removes the document", async () => {
    // Create a document
    const createRes = await contextDocsRoutes(
      createRequest("http://localhost/api/context-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "To Be Deleted", content: "bye" }),
      }),
      "/api/context-docs"
    );
    const created = (await createRes.json()) as Record<string, unknown>;
    const id = created.id as string;

    // Delete it
    const deleteRes = await contextDocsRoutes(
      createRequest(`http://localhost/api/context-docs/${id}`, { method: "DELETE" }),
      `/api/context-docs/${id}`
    );
    expect(deleteRes.status).toBe(204);

    // Verify it's gone from listing
    const listRes = await contextDocsRoutes(
      createRequest("http://localhost/api/context-docs", { method: "GET" }),
      "/api/context-docs"
    );
    const docs = (await listRes.json()) as Record<string, unknown>[];
    const ids = docs.map((d) => d.id);
    expect(ids).not.toContain(id);
  });

  test("DELETE /api/context-docs/:id returns 404 for non-existent doc", async () => {
    const res = await contextDocsRoutes(
      createRequest("http://localhost/api/context-docs/nonexistent-id", { method: "DELETE" }),
      "/api/context-docs/nonexistent-id"
    );
    expect(res.status).toBe(404);
  });
});
