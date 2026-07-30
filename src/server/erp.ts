import { parse } from "node-html-parser";

const BASE = "https://erp.asti.dost.gov.ph/index.php";
const LOGIN_URL = `${BASE}?r=site/login`;
const INDEX_URL = `${BASE}?r=pmis/passSlip/passSlip/index`;
const VIEW_URL = `${BASE}?r=pmis/passSlip/passSlip/view&id=`;

const BASE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: LOGIN_URL,
};

const KEPT_STATUSES = new Set(["Approved as Official", "Pending for Approval"]);

const PURPOSE_RE =
  /for="BasePassSlip_purpose"[^>]*>Purpose of Business<\/label>[\s\S]*?form-control-static">([\s\S]*?)<\/div>/;

export class ErpLoginError extends Error {}

export interface ErpEntry {
  date: string;
  work_assignment: string;
  expected_output: string;
  accomplishments: string;
  duration_days: number;
}

// ── Session ─────────────────────────────────────────────────
// Bun's fetch has no cookie jar and drops Set-Cookie from intermediate
// redirect hops, so we follow redirects by hand and keep cookies ourselves.
// This is what requests.Session did for free.

class ErpSession {
  private cookies = new Map<string, string>();

  async request(url: string, init: RequestInit = {}): Promise<Response> {
    let target = url;
    let options = init;

    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(target, {
        ...options,
        redirect: "manual",
        headers: { ...BASE_HEADERS, ...options.headers, ...this.cookieHeader() },
        // The ERP certificate is server-side and not available to us.
        // Equivalent to requests' verify=False.
        tls: { rejectUnauthorized: false },
      } as RequestInit);

      this.storeCookies(res);

      const location = res.headers.get("location");
      if (![301, 302, 303, 307, 308].includes(res.status) || !location) return res;

      target = new URL(location, target).toString();
      options = { method: "GET" }; // don't replay the POST body
    }
    throw new Error("Too many redirects from ERP");
  }

  async text(url: string, params?: Record<string, string>): Promise<string> {
    const full = params ? `${url}&${new URLSearchParams(params)}` : url;
    return (await this.request(full)).text();
  }

  private cookieHeader(): Record<string, string> {
    if (this.cookies.size === 0) return {};
    const jar = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    return { Cookie: jar };
  }

  private storeCookies(res: Response): void {
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
}

export async function login(username: string, password: string): Promise<ErpSession> {
  const session = new ErpSession();

  await session.request(LOGIN_URL); // establish the session cookie

  const res = await session.request(LOGIN_URL, {
    method: "POST",
    body: new URLSearchParams({
      "LoginForm[username]": username,
      "LoginForm[password]": password,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  // Yii re-renders the login form with HTTP 200 on bad credentials, so the
  // status code proves nothing — check whether the form is still there.
  const body = await res.text();
  if (!res.ok || body.includes('name="LoginForm[password]"')) {
    throw new ErpLoginError("ERP login failed — check username and password");
  }
  return session;
}

// ── Scraping ────────────────────────────────────────────────

export interface PassSlip {
  id: string;
  start: Date;
  end: Date;
  status: string;
  purpose: string[];
}

export async function fetchPassSlips(
  session: ErpSession,
  start: Date,
  end: Date,
): Promise<PassSlip[]> {
  const html = await session.text(INDEX_URL, {
    "BasePassSlip[start_date]": toISO(start),
    "BasePassSlip[end_date]": toISO(end),
  });

  const tbody = parse(html).querySelector("tbody");
  if (!tbody) return [];

  const slips: PassSlip[] = [];
  for (const row of tbody.querySelectorAll("tr")) {
    const cells = row.querySelectorAll("td").map((td) => td.text.trim());
    const href = row.querySelector("a.view")?.getAttribute("href") ?? "";
    const id = /id=(\d+)/.exec(href)?.[1];

    if (!id || cells.length < 7 || !KEPT_STATUSES.has(cells[6])) continue;

    slips.push({
      id,
      start: parseErpDate(cells[0]),
      end: parseErpDate(cells[1]),
      status: cells[6],
      purpose: await fetchPurpose(session, id),
    });
  }
  return slips;
}

async function fetchPurpose(session: ErpSession, id: string): Promise<string[]> {
  const match = PURPOSE_RE.exec(await session.text(VIEW_URL + id));
  if (!match) return [];

  // Purposes are bullet lists using "- " as the separator.
  return match[1]
    .trim()
    .replace(/\r?\n/g, " ")
    .split(/(?:^|\s)-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Dates & shaping ─────────────────────────────────────────

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "July 14, 2026" -> Date (UTC, so no timezone drift on the day boundary) */
function parseErpDate(value: string): Date {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(value.trim());
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (!m || month < 0) throw new Error(`Unrecognized ERP date: "${value}"`);
  return new Date(Date.UTC(Number(m[3]), month, Number(m[2])));
}

const toISO = (d: Date): string => d.toISOString().slice(0, 10);

/** Current half-month payroll window. */
export function payrollPeriod(today = new Date()): [Date, Date] {
  const [y, m, day] = [today.getFullYear(), today.getMonth(), today.getDate()];
  if (day <= 15) return [new Date(Date.UTC(y, m, 1)), new Date(Date.UTC(y, m, 15))];
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return [new Date(Date.UTC(y, m, 16)), new Date(Date.UTC(y, m, last))];
}

/**
 * Expand each slip across its date range, merging slips that share a day.
 * Output matches the Entry shape in src/client/lib/api.ts.
 */
export function toEntries(slips: PassSlip[]): ErpEntry[] {
  const byDate = new Map<string, string[]>();

  for (const slip of slips) {
    for (
      let cursor = new Date(slip.start);
      cursor <= slip.end;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const key = toISO(cursor);
      byDate.set(key, [...(byDate.get(key) ?? []), ...slip.purpose]);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, purposes]) => ({
      date,
      work_assignment: [...new Set(purposes)].join("\n"),
      expected_output: "",
      accomplishments: "",
      duration_days: 1,
    }));
}
