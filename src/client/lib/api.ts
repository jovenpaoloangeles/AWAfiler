import { nanoid } from "nanoid";

// ── Data model ──────────────────────────────────────────────

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
  has_api_key?: boolean;
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

interface AppData {
  version: 1;
  profile: {
    name: string;
    position: string;
    division: string;
    approver_name: string | null;
    approver_title: string | null;
    gemini_api_key: string | null;
  };
  entries: Entry[];
  context_documents: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    created_at: string;
  }>;
}

const STORAGE_KEY = "awafiler-data";

function createEmptyData(): AppData {
  return {
    version: 1,
    profile: {
      name: "",
      position: "",
      division: "",
      approver_name: null,
      approver_title: null,
      gemini_api_key: null,
    },
    entries: [],
    context_documents: [],
  };
}

function readData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return createEmptyData();
    return parsed as AppData;
  } catch {
    return createEmptyData();
  }
}

function writeData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Entries ─────────────────────────────────────────────────

function filterEntries(entries: Entry[], params?: EntriesParams): Entry[] {
  let result = [...entries];
  if (params?.month) {
    result = result.filter((e) => e.date.startsWith(params.month!));
  }
  if (params?.status) {
    result = result.filter((e) => e.status === params.status);
  }
  if (params?.start) {
    result = result.filter((e) => e.date >= params.start!);
  }
  if (params?.end) {
    result = result.filter((e) => e.date <= params.end!);
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export const api = {
  // Entries
  getEntries: (params?: EntriesParams): Entry[] => {
    const data = readData();
    return filterEntries(data.entries, params);
  },
  getEntry: (id: string): Entry | undefined => {
    const data = readData();
    return data.entries.find((e) => e.id === id);
  },
  createEntry: (body: Partial<Entry>): Entry => {
    const data = readData();
    const now = new Date().toISOString();
    const entry: Entry = {
      id: nanoid(),
      expected_output: body.expected_output || "",
      work_assignment: body.work_assignment || "",
      date: body.date || new Date().toISOString().split("T")[0],
      accomplishments: body.accomplishments || "",
      duration_days: body.duration_days ?? 1,
      status: body.status || "draft",
      ai_generated: body.ai_generated ?? 0,
      created_at: now,
      updated_at: now,
    };
    data.entries.push(entry);
    writeData(data);
    return entry;
  },
  updateEntry: (id: string, body: Partial<Entry>): Entry => {
    const data = readData();
    const idx = data.entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Entry not found");
    const existing = data.entries[idx];
    data.entries[idx] = {
      ...existing,
      expected_output: body.expected_output !== undefined ? body.expected_output : existing.expected_output,
      work_assignment: body.work_assignment !== undefined ? body.work_assignment : existing.work_assignment,
      date: body.date !== undefined ? body.date : existing.date,
      accomplishments: body.accomplishments !== undefined ? body.accomplishments : existing.accomplishments,
      duration_days: body.duration_days !== undefined ? body.duration_days : existing.duration_days,
      status: body.status !== undefined ? body.status : existing.status,
      ai_generated: body.ai_generated !== undefined ? body.ai_generated : existing.ai_generated,
      updated_at: new Date().toISOString(),
    };
    writeData(data);
    return data.entries[idx];
  },
  deleteEntry: (id: string): void => {
    const data = readData();
    const idx = data.entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Entry not found");
    data.entries.splice(idx, 1);
    writeData(data);
  },
  updateEntryStatus: (id: string, status: Entry["status"]): Entry => {
    const data = readData();
    const idx = data.entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Entry not found");
    data.entries[idx].status = status;
    data.entries[idx].updated_at = new Date().toISOString();
    writeData(data);
    return data.entries[idx];
  },

  // Profile
  getProfile: (): Profile => {
    const data = readData();
    return {
      id: 1,
      name: data.profile.name,
      position: data.profile.position,
      division: data.profile.division,
      approver_name: data.profile.approver_name,
      approver_title: data.profile.approver_title,
      created_at: "",
      has_api_key: !!data.profile.gemini_api_key,
    };
  },
  updateProfile: (body: Partial<Profile>): Profile => {
    const data = readData();
    if (body.name !== undefined) data.profile.name = body.name;
    if (body.position !== undefined) data.profile.position = body.position;
    if (body.division !== undefined) data.profile.division = body.division;
    if (body.approver_name !== undefined) data.profile.approver_name = body.approver_name;
    if (body.approver_title !== undefined) data.profile.approver_title = body.approver_title;
    writeData(data);
    return api.getProfile();
  },
  setApiKey: (key: string | null): { has_api_key: boolean } => {
    const data = readData();
    data.profile.gemini_api_key = key || null;
    writeData(data);
    return { has_api_key: !!data.profile.gemini_api_key };
  },

  // Context documents
  getContextDocs: (): ContextDoc[] => {
    const data = readData();
    return data.context_documents
      .map((d) => ({ id: d.id, title: d.title, type: d.type, created_at: d.created_at }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  uploadContextDoc: (metadata: { title: string; content: string; type: string }): ContextDoc => {
    const data = readData();
    const doc = {
      id: nanoid(),
      title: metadata.title,
      content: metadata.content,
      type: metadata.type,
      created_at: new Date().toISOString(),
    };
    data.context_documents.push(doc);
    writeData(data);
    return { id: doc.id, title: doc.title, type: doc.type, created_at: doc.created_at };
  },
  deleteContextDoc: (id: string): void => {
    const data = readData();
    const idx = data.context_documents.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error("Document not found");
    data.context_documents.splice(idx, 1);
    writeData(data);
  },

  // Raw data access (for backup/restore and AI system prompt)
  getRawData: (): AppData => readData(),
  setRawData: (data: AppData): void => writeData(data),
};
