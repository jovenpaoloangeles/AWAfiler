import { join, normalize, resolve } from "path";
import { ErpLoginError, fetchPassSlips, login, payrollPeriod, toEntries } from "./erp";

const PORT = Number(process.env.PORT) || 3000;
const IS_DEV = process.env.NODE_ENV !== "production";
const DIST = resolve(join(import.meta.dir, "..", "..", "dist"));

// Dev only: Vite serves the app from its own origin, so the browser needs
// permission to call us. In production Bun serves both from one origin and
// none of this applies.
const ALLOWED = new Set(["http://localhost:5173"]);

function cors(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handlePassSlips(
  req: Request,
  headers: Record<string, string>,
): Promise<Response> {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return Response.json(
        { error: "ERP username and password are required" },
        { status: 400, headers },
      );
    }

    const session = await login(username, password);
    const [start, end] = payrollPeriod();
    const slips = await fetchPassSlips(session, start, end);

    return Response.json(
      {
        period: {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        },
        entries: toEntries(slips),
      },
      { headers },
    );
  } catch (e) {
    const status = e instanceof ErpLoginError ? 401 : 502;
    const error = e instanceof ErpLoginError ? e.message : `ERP unreachable: ${e}`;
    return Response.json({ error }, { status, headers });
  }
}

async function serveStatic(pathname: string): Promise<Response> {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = normalize(join(DIST, relative));

  // Never let a crafted path escape dist/.
  if (filePath !== DIST && !filePath.startsWith(DIST + "/")) {
    return new Response("Not found", { status: 404 });
  }

  const asset = Bun.file(filePath);
  if (await asset.exists()) return new Response(asset);

  // The app uses HashRouter, so any unknown path just gets the shell.
  return new Response(Bun.file(join(DIST, "index.html")));
}

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const headers = cors(req.headers.get("origin"));

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

    if (pathname === "/api/erp/pass-slips" && req.method === "POST") {
      return handlePassSlips(req, headers);
    }

    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404, headers });
    }

    if (IS_DEV) {
      return new Response("Dev mode — the app is served by Vite on :5173", {
        status: 503,
      });
    }

    return serveStatic(pathname);
  },
});

console.log(
  `AWAfiler ${IS_DEV ? "API (dev)" : "server"} listening on http://localhost:${PORT}`,
);
