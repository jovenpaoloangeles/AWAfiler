import { Sparkles, Square, Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIStream, type AIMode } from "@/hooks/use-ai-stream";

interface AIAssistButtonProps {
  value: string;
  onAccept: (text: string) => void;
  onAcceptAssignment?: (assignment: string) => void;
  mode: "revise" | "expand";
}

function parseReviseResponse(text: string): { title: string; bullets: string } {
  const lines = text.split("\n");
  const titleLine = lines.find((l) => l.startsWith("Title:"));
  const title = titleLine ? titleLine.replace(/^Title:\s*/, "").trim() : "";
  const bullets = lines
    .filter((l) => l.trimStart().startsWith("-"))
    .join("\n");
  return { title, bullets };
}

export function AIAssistButton({ value, onAccept, onAcceptAssignment, mode }: AIAssistButtonProps) {
  const { text, isStreaming, error, stream, stop, reset } = useAIStream();

  const hasText = text.length > 0;
  const isIdle = !isStreaming && !hasText && !error;
  const isDone = !isStreaming && hasText;

  const handleStart = () => {
    stream(mode as AIMode, value);
  };

  const handleAccept = () => {
    if (mode === "revise") {
      const { title, bullets } = parseReviseResponse(text);
      onAccept(bullets || text);
      if (title && onAcceptAssignment) onAcceptAssignment(title);
    } else {
      onAccept(text);
    }
    reset();
  };

  const handleRetry = () => {
    reset();
    handleStart();
  };

  const handleDiscard = () => {
    reset();
  };

  // Idle state: show the trigger button
  if (isIdle) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={handleStart}
        disabled={!value.trim()}
        className="text-muted-foreground"
      >
        <Sparkles />
        {mode === "revise" ? "Revise with AI" : "Expand with AI"}
      </Button>
    );
  }

  // Streaming or done: show the panel
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      {/* AI output text */}
      <div className="text-sm whitespace-pre-wrap min-h-[2rem]">
        {isStreaming && !hasText && (
          <span className="text-muted-foreground animate-pulse">
            Generating...
          </span>
        )}
        {text}
      </div>

      {/* Error display */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {isStreaming && (
          <Button type="button" variant="destructive" size="xs" onClick={stop}>
            <Square />
            Stop
          </Button>
        )}

        {isDone && (
          <>
            <Button type="button" size="xs" onClick={handleAccept}>
              <Check />
              Accept
            </Button>
            <Button type="button" variant="outline" size="xs" onClick={handleRetry}>
              <RotateCcw />
              Retry
            </Button>
          </>
        )}

        <Button type="button" variant="ghost" size="xs" onClick={handleDiscard}>
          <X />
          Discard
        </Button>
      </div>
    </div>
  );
}
