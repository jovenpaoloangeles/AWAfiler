import { useCallback, useRef, useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { api } from "@/lib/api";

export type AIMode = "revise" | "expand" | "generate" | "generate-assignment" | "expand-assignment";

interface UseAIStreamReturn {
  text: string;
  isStreaming: boolean;
  error: string | null;
  stream: (mode: AIMode, input: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

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

## Development Pacing Rules
When generating work entries, each entry represents exactly ONE work day of effort. Development work must follow a natural, gradual progression through these phases:

1. Requirements gathering / planning
2. Environment setup / configuration
3. Development / implementation (may span multiple days)
4. Code review / refinement
5. Testing (unit testing, integration testing, user acceptance testing)
6. Bug fixes and adjustments (may span multiple days)
7. Deployment / rollout
8. Documentation / handover

CRITICAL: Never skip phases. Do not jump from "testing" on one day to "deployment" the next. Each day's accomplishment should be a logical continuation of the previous day's work. A realistic project takes weeks — not days. Spread work across multiple entries per phase when appropriate.

## Style Matching
Analyze the user's recent entries (provided above) and match their writing style:
- Sentence structure (short concise sentences vs. longer descriptive ones)
- Level of detail (brief summaries vs. thorough descriptions)
- Technical depth (heavy jargon vs. accessible language)
- Common phrases, formatting patterns, and recurring vocabulary
- Tone balance (formal vs. approachable)

Generated entries should be indistinguishable from the user's own writing.
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

  "generate-assignment": `Generate a realistic work entry for the user based on their role, recent work, and context documents.

Look at the user's recent entries to understand their ongoing projects and suggest a logical next task.

Format your response EXACTLY as:
Title: [brief work assignment title]
Description: [1-2 sentences in third person past tense describing what was accomplished]

The Description should read like an accomplishment statement — what the person did/completed, not what they plan to do. Match the writing style of their recent entries.

Context:
{input}`,

  "expand-assignment": `Expand this brief work assignment idea into a fuller description with clear expected outputs. Keep it professional but concise — avoid fluff.

Brief assignment:
{input}`,
};

function buildSystemPrompt(): string {
  const data = api.getRawData();
  const { profile } = data;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentEntries = data.entries
    .filter((e) => e.date >= dateStr)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  let recentEntriesText = "No recent entries found.";
  if (recentEntries.length > 0) {
    recentEntriesText = recentEntries
      .map((e) => `[${e.date}] Assignment: ${e.work_assignment}\nAccomplishment: ${e.accomplishments}`)
      .join("\n\n");
  }

  let contextDocsText = "No reference documents.";
  if (data.context_documents.length > 0) {
    contextDocsText = data.context_documents
      .map((d) => `--- ${d.title} ---\n${d.content}`)
      .join("\n\n");
  }

  return SYSTEM_PROMPT_TEMPLATE
    .replace("{name}", profile.name || "Unknown")
    .replace("{position}", profile.position || "Unknown")
    .replace("{division}", profile.division || "Unknown")
    .replace("{recent_entries}", recentEntriesText)
    .replace("{context_documents}", contextDocsText);
}

function buildUserPrompt(mode: string, input: string): string {
  const template = USER_PROMPTS[mode];
  if (!template) throw new Error(`Invalid AI mode: ${mode}`);
  return template.replace("{input}", input);
}

export function useAIStream(): UseAIStreamReturn {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setText("");
    setError(null);
  }, [stop]);

  const stream = useCallback(
    async (mode: AIMode, input: string) => {
      stop();
      setText("");
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const data = api.getRawData();
        const apiKey = data.profile.gemini_api_key;
        if (!apiKey) {
          throw new Error("Gemini API key is not configured. Set it in Settings.");
        }

        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = buildSystemPrompt();
        const userPrompt = buildUserPrompt(mode, input);

        const response = await ai.models.generateContentStream({
          model: "gemini-3.1-flash-lite-preview",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
          },
        });

        let accumulated = "";
        for await (const chunk of response) {
          if (controller.signal.aborted) break;
          const chunkText = chunk.text;
          if (chunkText) {
            accumulated += chunkText;
            setText(accumulated);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Stream failed";
        setError(message);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [stop]
  );

  return { text, isStreaming, error, stream, stop, reset };
}
