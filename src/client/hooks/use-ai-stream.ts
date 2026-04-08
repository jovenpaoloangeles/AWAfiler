import { useCallback, useRef, useState } from "react";

const API_BASE = "/api";

export type AIMode = "revise" | "expand" | "generate" | "generate-assignment" | "expand-assignment";

interface UseAIStreamReturn {
  text: string;
  isStreaming: boolean;
  error: string | null;
  stream: (mode: AIMode, input: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
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
      // Abort any in-flight request
      stop();
      setText("");
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/ai/${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(body.error || `Request failed: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = ""; // Line buffer for SSE chunk boundary handling

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Append chunk to buffer and process complete lines
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const payload = trimmed.slice(6); // Remove "data: " prefix

            if (payload === "[DONE]") continue;

            let parsed: { text?: string; error?: string };
            try {
              parsed = JSON.parse(payload);
            } catch {
              // Ignore non-JSON lines (e.g., [DONE])
              continue;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setText(accumulated);
            }
          }
        }

        // Process any remaining data in the buffer after stream ends
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ")) {
            const payload = trimmed.slice(6);
            if (payload !== "[DONE]") {
              try {
                const parsed = JSON.parse(payload);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  accumulated += parsed.text;
                  setText(accumulated);
                }
              } catch (err) {
                if (!(err instanceof Error && err.message === "Stream failed")) {
                  // Ignore non-JSON leftover
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled - not an error
          return;
        }
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
