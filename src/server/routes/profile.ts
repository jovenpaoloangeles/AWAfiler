import db from "../db";

export async function profileRoutes(req: Request, pathname: string): Promise<Response> {
  const method = req.method;

  // GET /api/profile — return first profile row
  if (method === "GET" && pathname === "/api/profile") {
    const profile = db.query("SELECT * FROM profile WHERE id = 1").get();
    return Response.json(profile);
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

    const profile = db.query("SELECT * FROM profile WHERE id = 1").get();
    return Response.json(profile);
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
