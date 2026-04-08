import { Sparkles, Square, Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIStream, type AIMode } from "@/hooks/use-ai-stream";

interface AIGenerateAssignmentButtonProps {
  onAccept: (text: string) => void;
}

export function AIGenerateAssignmentButton({ onAccept }: AIGenerateAssignmentButtonProps) {
  const { text, isStreaming, error, stream, stop, reset } = useAIStream();

  const hasText = text.length > 0;
  const isIdle = !isStreaming && !hasText && !error;
  const isDone = !isStreaming && hasText;

  const handleStart = () => {
    stream("generate-assignment" as AIMode, "");
  };

  const handleAccept = () => {
    onAccept(text);
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

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="text-sm whitespace-pre-wrap min-h-[2rem]">
        {isStreaming && !hasText && (
          <span className="text-muted-foreground animate-pulse">
            Generating...
          </span>
        )}
        {text}
      </div>

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
