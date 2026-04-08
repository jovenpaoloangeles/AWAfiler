import db from "../db";
import { nanoid } from "nanoid";

export async function contextDocsRoutes(req: Request, pathname: string): Promise<Response> {
  const method = req.method;

  // GET /api/context-docs — list all documents (exclude content)
  if (method === "GET" && pathname === "/api/context-docs") {
    const docs = db.query("SELECT id, title, type, created_at FROM context_documents ORDER BY created_at DESC").all();
    return Response.json(docs);
  }

  // POST /api/context-docs — create (JSON body or multipart/form-data)
  if (method === "POST" && pathname === "/api/context-docs") {
    const contentType = req.headers.get("content-type") || "";
    let title = "";
    let content = "";
    let type = "reference";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = formData.get("title") as string || "Untitled Document";
      type = (formData.get("type") as string) || "reference";
      const file = formData.get("file") as File | null;
      if (file) {
        const isPdf = file.name?.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
        if (isPdf) {
          content = "(PDF file uploaded — binary content cannot be extracted as text. Please upload a .txt or .md file for full AI context support.)";
        } else {
          content = await file.text();
        }
      }
    } else {
      const body = await req.json();
      title = body.title || "Untitled Document";
      content = body.content || "";
      type = body.type || "reference";
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.query(
      "INSERT INTO context_documents (id, title, content, type, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, title, content, type, now);

    const doc = db.query("SELECT id, title, type, created_at FROM context_documents WHERE id = ?").get(id);
    return Response.json(doc, { status: 201 });
  }

  // Extract :id portion from pathname
  const idPortion = pathname.split("/api/context-docs/")[1];
  if (!idPortion) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // DELETE /api/context-docs/:id
  if (method === "DELETE") {
    const result = db.query("DELETE FROM context_documents WHERE id = ?").run(idPortion);
    if (result.changes === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
