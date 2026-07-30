import { ErpLoginError, fetchPassSlips, login, payrollPeriod, toEntries } from "./erp";

const PORT = Number(process.env.PORT) || 3000;

// Only needed if you call the server directly instead of through the Vite
// proxy. Explicit origins — "*" is invalid alongside credentialed requests.
const ALLOWED = new Set(["http://localhost:5173", "http://localhost:3456"]);

function cors(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const headers = cors(req.headers.get("origin"));

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

    if (pathname !== "/api/erp/pass-slips" || req.method !== "POST") {
      return Response.json({ error: "Not found" }, { status: 404, headers });
    }

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
          period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
          entries: toEntries(slips),
        },
        { headers },
      );
    } catch (e) {
      const status = e instanceof ErpLoginError ? 401 : 502;
      const error = e instanceof ErpLoginError ? e.message : `ERP unreachable: ${e}`;
      return Response.json({ error }, { status, headers });
    }
  },
});

console.log(`ERP bridge listening on http://localhost:${PORT}`);
