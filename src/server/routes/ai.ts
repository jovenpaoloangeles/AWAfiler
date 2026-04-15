import { streamAI, hasApiKey } from "../ai";

const VALID_MODES = new Set(["revise", "expand", "generate", "generate-assignment", "expand-assignment"]);

export async function aiRoutes(req: Request, pathname: string): Promise<Response> {
  const method = req.method;

  // All AI routes are POST
  if (method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Check for API key (env var or DB)
  if (!hasApiKey()) {
    return Response.json({ error: "Gemini API key is not configured. Set it in Settings or via the GEMINI_API_KEY environment variable." }, { status: 500 });
  }

  // Extract mode from pathname: /api/ai/revise, /api/ai/expand, /api/ai/generate
  const mode = pathname.split("/api/ai/")[1];
  if (!mode || !VALID_MODES.has(mode)) {
    return Response.json({ error: "Invalid AI mode. Use: revise, expand, generate, generate-assignment, or expand-assignment" }, { status: 400 });
  }

  const body = await req.json();
  const input = body.input || body.text || "";

  if (!input.trim() && mode !== "generate" && mode !== "generate-assignment") {
    return Response.json({ error: "Input text is required" }, { status: 400 });
  }

  // Stream the response as SSE
  const encoder = new TextEncoder();
  let aborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamAI({ mode, input })) {
          if (aborted) break;
          const data = JSON.stringify({ text: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        if (!aborted) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      } catch (error) {
        if (!aborted) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          const data = JSON.stringify({ error: errMsg });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      aborted = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
