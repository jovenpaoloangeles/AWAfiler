import { join, resolve, normalize } from "path";
import { file } from "bun";
import { entriesRoutes } from "./routes/entries";
import { profileRoutes } from "./routes/profile";
import { aiRoutes } from "./routes/ai";
import { contextDocsRoutes } from "./routes/context-docs";

const PORT = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV !== "production";
const distDir = resolve(join(import.meta.dir, "..", "..", "dist"));

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",

  async fetch(req) {
    try {
    const url = new URL(req.url);
    const { pathname } = url;

    // API routes — handled by route modules
    if (pathname.startsWith("/api")) {
      const apiRoutes: Record<string, (req: Request, pathname: string) => Promise<Response>> = {
        "/api/entries": entriesRoutes,
        "/api/profile": profileRoutes,
        "/api/ai": aiRoutes,
        "/api/context-docs": contextDocsRoutes,
      };

      for (const [prefix, handler] of Object.entries(apiRoutes)) {
        if (pathname === prefix || pathname.startsWith(prefix + "/")) {
          return handler(req, pathname);
        }
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Static files in production
    if (!isDev) {
      const resolvedPath = pathname === "/" ? "index.html" : pathname;
      // Reject any path containing ".." to prevent directory traversal
      if (resolvedPath.includes("..")) {
        return new Response("Not found", { status: 404 });
      }
      const filePath = normalize(join(distDir, resolvedPath));
      // Ensure the resolved path stays within distDir
      if (!filePath.startsWith(distDir + "/") && filePath !== distDir) {
        return new Response("Not found", { status: 404 });
      }
      const f = file(filePath);
      if (await f.exists()) {
        return new Response(f);
      }
      // SPA fallback
      return new Response(file(join(distDir, "index.html")));
    }

    // In dev mode, redirect to Vite
    return new Response("Dev mode: use Vite dev server on port 5173", { status: 503 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("Unhandled error:", err);
      return Response.json({ error: message }, { status: 500 });
    }
  },
});

console.log(`Server running on http://localhost:${server.port}`);
