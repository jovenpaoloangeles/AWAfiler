export interface ErpEntry {
  date: string;
  work_assignment: string;
  expected_output: string;
  accomplishments: string;
  duration_days: number;
}

export interface ErpSyncResult {
  period: { start: string; end: string };
  entries: ErpEntry[];
}

export async function fetchPassSlips(
  username: string,
  password: string,
): Promise<ErpSyncResult> {
  const res = await fetch("/api/erp/pass-slips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `ERP sync failed (${res.status})`);
  }
  return res.json();
}
