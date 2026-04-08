import db from "../db";
import { nanoid } from "nanoid";

export async function entriesRoutes(req: Request, pathname: string): Promise<Response> {
  const method = req.method;

  // GET /api/entries — list with optional filters
  if (method === "GET" && pathname === "/api/entries") {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const status = url.searchParams.get("status");
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    let query = "SELECT * FROM entries WHERE 1=1";
    const params: unknown[] = [];

    if (month) {
      query += " AND strftime('%Y-%m', date) = ?";
      params.push(month);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (start) {
      query += " AND date >= ?";
      params.push(start);
    }
    if (end) {
      query += " AND date <= ?";
      params.push(end);
    }

    query += " ORDER BY date DESC";

    const entries = db.query(query).all(...params);
    return Response.json(entries);
  }

  // POST /api/entries — create
  if (method === "POST" && pathname === "/api/entries") {
    const body = await req.json();
    const id = nanoid();
    const now = new Date().toISOString();

    db.query(
      `INSERT INTO entries (id, expected_output, work_assignment, date, accomplishments, duration_days, status, ai_generated, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.expected_output || "",
      body.work_assignment || "",
      body.date || new Date().toISOString().split("T")[0],
      body.accomplishments || "",
      body.duration_days ?? 1,
      body.status || "draft",
      body.ai_generated ?? 0,
      now,
      now
    );

    const entry = db.query("SELECT * FROM entries WHERE id = ?").get(id);
    return Response.json(entry, { status: 201 });
  }

  // Extract :id portion from pathname
  const idPortion = pathname.split("/api/entries/")[1];
  if (!idPortion) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Check if this is a status-specific route: /api/entries/:id/status
  const isStatusRoute = idPortion.endsWith("/status");
  const entryId = isStatusRoute ? idPortion.replace("/status", "") : idPortion;

  // PATCH /api/entries/:id/status — update status only
  if (method === "PATCH" && isStatusRoute) {
    const body = await req.json();
    const now = new Date().toISOString();

    const result = db
      .query("UPDATE entries SET status = ?, updated_at = ? WHERE id = ?")
      .run(body.status, now, entryId);

    if (result.changes === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const entry = db.query("SELECT * FROM entries WHERE id = ?").get(entryId);
    return Response.json(entry);
  }

  // GET /api/entries/:id — single entry
  if (method === "GET" && !isStatusRoute) {
    const entry = db.query("SELECT * FROM entries WHERE id = ?").get(entryId);
    if (!entry) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(entry);
  }

  // PUT /api/entries/:id — update (merge with existing values)
  if (method === "PUT" && !isStatusRoute) {
    const body = await req.json();
    const now = new Date().toISOString();

    const existing = db.query("SELECT * FROM entries WHERE id = ?").get(entryId) as Record<string, unknown> | undefined;
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const result = db
      .query(
        `UPDATE entries SET expected_output = ?, work_assignment = ?, date = ?, accomplishments = ?, duration_days = ?, status = ?, ai_generated = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        body.expected_output !== undefined ? body.expected_output : existing.expected_output,
        body.work_assignment !== undefined ? body.work_assignment : existing.work_assignment,
        body.date !== undefined ? body.date : existing.date,
        body.accomplishments !== undefined ? body.accomplishments : existing.accomplishments,
        body.duration_days !== undefined ? body.duration_days : existing.duration_days,
        body.status !== undefined ? body.status : existing.status,
        body.ai_generated !== undefined ? body.ai_generated : existing.ai_generated,
        now,
        entryId
      );

    const entry = db.query("SELECT * FROM entries WHERE id = ?").get(entryId);
    return Response.json(entry);
  }

  // DELETE /api/entries/:id — delete
  if (method === "DELETE" && !isStatusRoute) {
    const result = db.query("DELETE FROM entries WHERE id = ?").run(entryId);
    if (result.changes === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
