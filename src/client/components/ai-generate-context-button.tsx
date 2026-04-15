import { Sparkles, Square, Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIStream, type AIMode } from "@/hooks/use-ai-stream";

interface AIGenerateContextButtonProps {
  onAccept: (workAssignment: string, accomplishments: string) => void;
}

function parseGeneratedText(text: string): { workAssignment: string; accomplishments: string } {
  const titleMatch = text.match(/^Title:\s*(.+)/im);
  const descMatch = text.match(/^Description:\s*([\s\S]+)/im);

  const workAssignment = titleMatch ? titleMatch[1].trim() : text.trim();
  const accomplishments = descMatch ? descMatch[1].trim() : "";

  return { workAssignment, accomplishments };
}

export function AIGenerateContextButton({ onAccept }: AIGenerateContextButtonProps) {
  const { text, isStreaming, error, stream, stop, reset } = useAIStream();

  const hasText = text.length > 0;
  const isIdle = !isStreaming && !hasText && !error;
  const isDone = !isStreaming && hasText;

  const handleStart = () => {
    stream("generate-assignment" as AIMode, "");
  };

  const handleAccept = () => {
    const { workAssignment, accomplishments } = parseGeneratedText(text);
    onAccept(workAssignment, accomplishments);
    reset();
  };

  const handleRetry = () => {
    reset();
    handleStart();
  };

  const handleDiscard = () => {
    reset();
  };

  if (isIdle) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={handleStart}
        className="text-muted-foreground"
      >
        <Sparkles />
        Generate from context
      </Button>
    );
  }

  const parsed = parseGeneratedText(text);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      {isStreaming && !hasText && (
        <span className="text-sm text-muted-foreground animate-pulse">Generating...</span>
      )}

      {hasText && (
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Work Assignment</p>
            <p className="whitespace-pre-wrap">{parsed.workAssignment || "—"}</p>
          </div>
          {parsed.accomplishments && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Accomplishments</p>
              <p className="whitespace-pre-wrap">{parsed.accomplishments}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

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
