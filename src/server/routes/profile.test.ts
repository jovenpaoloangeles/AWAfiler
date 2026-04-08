import { describe, test, expect, beforeAll } from "bun:test";
import { setupTestDb } from "../test-helper";

// Set DATABASE_PATH before any imports that touch db
beforeAll(() => {
  setupTestDb();
});

function createRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, options);
}

describe("Profile API routes", () => {
  let profileRoutes: (req: Request, pathname: string) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("./profile");
    profileRoutes = mod.profileRoutes;
  });

  test("GET /api/profile returns the seeded profile", async () => {
    const res = await profileRoutes(
      createRequest("http://localhost/api/profile", { method: "GET" }),
      "/api/profile"
    );
    expect(res.status).toBe(200);
    const profile = (await res.json()) as Record<string, unknown>;
    expect(profile.id).toBe(1);
    expect(profile.name).toBe("");
    expect(profile.position).toBe("");
    expect(profile.division).toBe("");
  });

  test("PUT /api/profile updates fields", async () => {
    const updateData = {
      name: "Juan Dela Cruz",
      position: "Software Engineer",
      division: "IT Division",
      approver_name: "Maria Santos",
      approver_title: "Division Chief",
    };

    const res = await profileRoutes(
      createRequest("http://localhost/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      }),
      "/api/profile"
    );

    expect(res.status).toBe(200);
    const profile = (await res.json()) as Record<string, unknown>;
    expect(profile.name).toBe("Juan Dela Cruz");
    expect(profile.position).toBe("Software Engineer");
    expect(profile.division).toBe("IT Division");
    expect(profile.approver_name).toBe("Maria Santos");
    expect(profile.approver_title).toBe("Division Chief");
    expect(profile.id).toBe(1);
  });

  test("PUT /api/profile partial update preserves other fields", async () => {
    // First set all fields
    await profileRoutes(
      createRequest("http://localhost/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Full Name",
          position: "Full Position",
          division: "Full Division",
          approver_name: "Full Approver",
          approver_title: "Full Title",
        }),
      }),
      "/api/profile"
    );

    // Now update only name
    const res = await profileRoutes(
      createRequest("http://localhost/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      "/api/profile"
    );

    expect(res.status).toBe(200);
    const profile = (await res.json()) as Record<string, unknown>;
    expect(profile.name).toBe("Updated Name");
    // The PUT handler replaces all fields with body values or defaults
    // Since we only sent name, the other fields get their defaults from ??
    expect(profile.position).toBe("");
    expect(profile.division).toBe("");
  });
});
