import { GoogleGenAI } from "@google/genai";
import db from "./db";

const SYSTEM_PROMPT_TEMPLATE = `You are an AI writing assistant for AWAfiler, a work accomplishment filing system.

## User Profile
- Name: {name}
- Position: {position}
- Division: {division}

## Recent Entries (last 30 days, for tone matching)
{recent_entries}

## Reference Documents
{context_documents}

## Instructions
- Write in formal, professional government/bureaucratic tone.
- Use action verbs and measurable outcomes where possible.
- Keep accomplishments concise but descriptive.
- Match the writing style of the user's recent entries.
`;

const USER_PROMPTS: Record<string, string> = {
  revise: `Revise this rough note into a formal accomplishment paragraph. Third person, past tense, concise. Keep the facts — just fix the language. Avoid fluff.

Rough note:
{input}`,

  expand: `Expand this brief note into a fuller work assignment description. Keep it concise and factual — avoid fluff. Just add necessary detail about what the work entails.

Brief note:
{input}`,

  generate: `Generate a concise, factual accomplishment paragraph based on the work assignment and expected output below. Write in third person, past tense. Be direct — what was actually done/completed. Avoid fluff, buzzwords, and overly elaborate language. Match the style of the user's recent entries.

{input}

If both fields are empty, infer from recent work patterns. Output ONLY the accomplishment text — no intro, no explanations.`,

  "generate-assignment": `Generate a concise work assignment title and brief description based on the user's role, recent work, and context documents. The assignment should be realistic and relevant.

Look at the user's recent entries to understand their ongoing projects and suggest a logical next task.

Format as:
Title: [brief title]
Description: [1-2 sentence description of expected outputs]

Context:
{input}`,

  "expand-assignment": `Expand this brief work assignment idea into a fuller description with clear expected outputs. Keep it professional but concise — avoid fluff.

Brief assignment:
{input}`,
};

function buildSystemPrompt(): string {
  const profile = db.query("SELECT * FROM profile WHERE id = 1").get() as Record<string, string> | undefined;
  const name = profile?.name || "Unknown";
  const position = profile?.position || "Unknown";
  const division = profile?.division || "Unknown";

  // Get recent entries (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentEntries = db
    .query("SELECT date, work_assignment, accomplishments FROM entries WHERE date >= ? ORDER BY date DESC LIMIT 10")
    .all(dateStr) as Array<Record<string, string>>;

  let recentEntriesText = "No recent entries found.";
  if (recentEntries.length > 0) {
    recentEntriesText = recentEntries
      .map((e) => `[${e.date}] Assignment: ${e.work_assignment}\nAccomplishment: ${e.accomplishments}`)
      .join("\n\n");
  }

  // Get all context documents
  const contextDocs = db.query("SELECT title, content FROM context_documents").all() as Array<Record<string, string>>;

  let contextDocsText = "No reference documents.";
  if (contextDocs.length > 0) {
    contextDocsText = contextDocs.map((d) => `--- ${d.title} ---\n${d.content}`).join("\n\n");
  }

  return SYSTEM_PROMPT_TEMPLATE
    .replace("{name}", name)
    .replace("{position}", position)
    .replace("{division}", division)
    .replace("{recent_entries}", recentEntriesText)
    .replace("{context_documents}", contextDocsText);
}

function buildUserPrompt(mode: string, input: string): string {
  const template = USER_PROMPTS[mode];
  if (!template) {
    throw new Error(`Invalid AI mode: ${mode}`);
  }
  return template.replace("{input}", input);
}

function getApiKey(): string | null {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const row = db.query("SELECT gemini_api_key FROM profile WHERE id = 1").get() as { gemini_api_key: string | null } | null;
  return row?.gemini_api_key ?? null;
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export async function* streamAI(request: { mode: string; input: string }): AsyncGenerator<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Set it in Settings or via the GEMINI_API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(request.mode, request.input);

  const response = await ai.models.generateContentStream({
    model: modelName,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
    },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}
