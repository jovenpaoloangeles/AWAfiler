import db from "../db";

export async function profileRoutes(req: Request, pathname: string): Promise<Response> {
  const method = req.method;

  // GET /api/profile — return first profile row (never expose the raw key)
  if (method === "GET" && pathname === "/api/profile") {
    const profile = db.query("SELECT id, name, position, division, approver_name, approver_title, created_at FROM profile WHERE id = 1").get() as Record<string, unknown> | null;
    if (!profile) return Response.json(null);
    const row = db.query("SELECT gemini_api_key FROM profile WHERE id = 1").get() as { gemini_api_key: string | null } | null;
    return Response.json({ ...profile, has_api_key: !!(row?.gemini_api_key || process.env.GEMINI_API_KEY) });
  }

  // PUT /api/profile — update the single profile row
  if (method === "PUT" && pathname === "/api/profile") {
    const body = await req.json();

    db.query(
      `UPDATE profile SET name = ?, position = ?, division = ?, approver_name = ?, approver_title = ? WHERE id = 1`
    ).run(
      body.name ?? "",
      body.position ?? "",
      body.division ?? "",
      body.approver_name ?? null,
      body.approver_title ?? null
    );

    const profile = db.query("SELECT id, name, position, division, approver_name, approver_title, created_at FROM profile WHERE id = 1").get() as Record<string, unknown> | null;
    return Response.json(profile);
  }

  // GET /api/profile/api-key — return whether a key is set
  if (method === "GET" && pathname === "/api/profile/api-key") {
    const row = db.query("SELECT gemini_api_key FROM profile WHERE id = 1").get() as { gemini_api_key: string | null } | null;
    return Response.json({ has_api_key: !!(row?.gemini_api_key || process.env.GEMINI_API_KEY) });
  }

  // PUT /api/profile/api-key — set or clear the API key
  if (method === "PUT" && pathname === "/api/profile/api-key") {
    const body = await req.json();
    const key: string | null = body.gemini_api_key ?? null;
    db.query("UPDATE profile SET gemini_api_key = ? WHERE id = 1").run(key || null);
    return Response.json({ has_api_key: !!(key || process.env.GEMINI_API_KEY) });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
