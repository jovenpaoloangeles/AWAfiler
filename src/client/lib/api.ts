const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Entry {
  id: string;
  expected_output: string;
  work_assignment: string;
  date: string;
  accomplishments: string;
  duration_days: number;
  status: "draft" | "finalized";
  ai_generated: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  name: string;
  position: string;
  division: string;
  approver_name: string | null;
  approver_title: string | null;
  created_at: string;
}

export interface ContextDoc {
  id: string;
  title: string;
  type: string;
  created_at: string;
}

export interface EntriesParams {
  month?: string;
  start?: string;
  end?: string;
  status?: string;
}

export const api = {
  getEntries: (params?: EntriesParams) => {
    const search = new URLSearchParams();
    if (params?.month) search.set("month", params.month);
    if (params?.start) search.set("start", params.start);
    if (params?.end) search.set("end", params.end);
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return request<Entry[]>(`/entries${qs ? `?${qs}` : ""}`);
  },
  getEntry: (id: string) => request<Entry>(`/entries/${id}`),
  createEntry: (data: Partial<Entry>) =>
    request<Entry>("/entries", { method: "POST", body: JSON.stringify(data) }),
  updateEntry: (id: string, data: Partial<Entry>) =>
    request<Entry>(`/entries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEntry: (id: string) => request<void>(`/entries/${id}`, { method: "DELETE" }),
  updateEntryStatus: (id: string, status: Entry["status"]) =>
    request<Entry>(`/entries/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getProfile: () => request<Profile>("/profile"),
  updateProfile: (data: Partial<Profile>) =>
    request<Profile>("/profile", { method: "PUT", body: JSON.stringify(data) }),
  getContextDocs: () => request<ContextDoc[]>("/context-docs"),
  uploadContextDoc: (formData: FormData) =>
    fetch(`${API_BASE}/context-docs`, { method: "POST", body: formData }).then((r) => {
      if (!r.ok) throw new Error("Upload failed");
      return r.json() as Promise<ContextDoc>;
    }),
  deleteContextDoc: (id: string) => request<void>(`/context-docs/${id}`, { method: "DELETE" }),
};
