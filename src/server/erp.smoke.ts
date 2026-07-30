/**
 * Manual smoke test — hits the REAL ERP. Not part of `bun test`.
 *
 *   1. Put credentials in .env (already gitignored):
 *        ERP_USERNAME=your.username
 *        ERP_PASSWORD=your-password
 *   2. Start the server:   bun run dev:server
 *   3. Run this:           bun src/server/erp.smoke.ts
 *
 * Pass --direct to skip HTTP and call the ERP module in-process. Use that
 * when you need to see the raw pass slips before they're folded into entries.
 */

import { ErpLoginError, fetchPassSlips, login, payrollPeriod, toEntries } from "./erp";
import type { ErpEntry } from "./erp";

const username = process.env.ERP_USERNAME;
const password = process.env.ERP_PASSWORD;
const SERVER = process.env.ERP_SERVER ?? "http://localhost:3000";
const DIRECT = process.argv.includes("--direct");

interface SyncResult {
  period: { start: string; end: string };
  entries: ErpEntry[];
}

if (!username || !password) {
  console.error("Missing ERP_USERNAME / ERP_PASSWORD.\n");
  console.error("Add them to .env (it is gitignored):");
  console.error("  ERP_USERNAME=your.username");
  console.error("  ERP_PASSWORD=your-password");
  process.exit(1);
}

// ── Transports ──────────────────────────────────────────────

async function viaHttp(): Promise<SyncResult> {
  console.log(`POST ${SERVER}/api/erp/pass-slips\n`);

  let res: Response;
  try {
    res = await fetch(`${SERVER}/api/erp/pass-slips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch (e) {
    console.error(`Could not reach ${SERVER} — is \`bun run dev:server\` running?`);
    console.error(`  ${e}`);
    process.exit(1);
  }

  const body = await res.json();
  if (!res.ok) {
    console.error(`HTTP ${res.status} — ${body.error ?? "unknown error"}`);
    process.exit(1);
  }
  return body as SyncResult;
}

async function viaModule(): Promise<SyncResult> {
  console.log("Calling the ERP module directly (no HTTP layer)\n");

  const session = await login(username!, password!);
  console.log("  login OK");

  const [start, end] = payrollPeriod();
  const slips = await fetchPassSlips(session, start, end);
  console.log(`  ${slips.length} pass slip(s) found\n`);

  for (const slip of slips) {
    const range = `${iso(slip.start)} → ${iso(slip.end)}`;
    console.log(`  #${slip.id}  ${range}  [${slip.status}]`);
    for (const line of slip.purpose) console.log(`      · ${line}`);
    if (slip.purpose.length === 0) console.log("      (no purpose parsed)");
  }
  console.log();

  return {
    period: { start: iso(start), end: iso(end) },
    entries: toEntries(slips),
  };
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

// ── Output ──────────────────────────────────────────────────

function report(result: SyncResult, ms: number): void {
  const { period, entries } = result;

  console.log("─".repeat(60));
  console.log(`Payroll period : ${period.start} → ${period.end}`);
  console.log(`Entries        : ${entries.length}`);
  console.log(`Elapsed        : ${ms}ms`);
  console.log("─".repeat(60));

  if (entries.length === 0) {
    console.log("\nNo entries returned. Either you genuinely have no pass slips");
    console.log("in this period, or the table selector didn't match. Re-run with");
    console.log("--direct to see whether login succeeded and slips were found.");
    return;
  }

  for (const entry of entries) {
    console.log(`\n${entry.date}  (${entry.duration_days} day)`);
    const lines = entry.work_assignment.split("\n").filter(Boolean);
    for (const line of lines) console.log(`  - ${line}`);
    if (lines.length === 0) console.log("  (empty work_assignment)");
  }

  console.log("\n─".repeat(60));
  console.log("Raw JSON:\n");
  console.log(JSON.stringify(result, null, 2));
}

// ── Run ─────────────────────────────────────────────────────

const started = Date.now();
try {
  const result = DIRECT ? await viaModule() : await viaHttp();
  report(result, Date.now() - started);
} catch (e) {
  if (e instanceof ErpLoginError) {
    console.error(`\nLogin rejected: ${e.message}`);
  } else {
    console.error("\nUnexpected failure:", e);
  }
  process.exit(1);
}

// `bun src/server/erp.smoke.ts` runs this