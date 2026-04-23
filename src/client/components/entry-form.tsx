import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useEntryMutations } from "@/hooks/use-entries";
import type { Entry } from "@/lib/api";
import { AIAssistButton } from "@/components/ai-assist-button";
import { AIGenerateContextButton } from "@/components/ai-generate-context-button";

interface EntryFormProps {
  open: boolean;
  onClose: () => void;
  entry?: Entry | null;
  defaultDate?: string | null;
}

export function EntryForm({ open, onClose, entry, defaultDate }: EntryFormProps) {
  const { createEntry, updateEntry } = useEntryMutations();
  const formRef = useRef<HTMLFormElement>(null);

  const [date, setDate] = useState("");
  const [workAssignment, setWorkAssignment] = useState("");
  const [accomplishments, setAccomplishments] = useState("");
  const [status, setStatus] = useState<Entry["status"]>("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when entry or defaultDate changes
  useEffect(() => {
    if (entry) {
      setDate(entry.date);
      setWorkAssignment(entry.work_assignment);
      setAccomplishments(entry.accomplishments);
      setStatus(entry.status);
    } else {
      setDate(defaultDate ?? "");
      setWorkAssignment("");
      setAccomplishments("");
      setStatus("draft");
    }
  }, [entry, defaultDate, open]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = {
        date,
        expected_output: accomplishments,
        work_assignment: workAssignment,
        accomplishments,
        duration_days: 1,
        status,
      };
      if (entry) {
        await updateEntry(entry.id, data);
        toast.success("Entry updated");
      } else {
        await createEntry(data);
        toast.success("Entry created");
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save entry";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = () => {
    setStatus((prev) => (prev === "draft" ? "finalized" : "draft"));
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{entry ? "Edit Entry" : "New Entry"}</SheetTitle>
          <SheetDescription>
            {entry ? "Update your work entry details." : "Create a new work entry for the selected date."}
          </SheetDescription>
        </SheetHeader>

        <form ref={formRef} onSubmit={handleSave} className="flex flex-col gap-4 px-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-date">Date</Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Work Assignment */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-work">Work Assignment</Label>
            <Textarea
              id="entry-work"
              value={workAssignment}
              onChange={(e) => setWorkAssignment(e.target.value)}
              placeholder="Describe your assigned tasks..."
              rows={3}
            />
            <AIAssistButton
              mode="expand"
              value={workAssignment}
              onAccept={(text) => setWorkAssignment(text)}
            />
            <AIGenerateContextButton
              onAccept={(wa, acc) => {
                setWorkAssignment(wa);
                setAccomplishments(acc);
              }}
            />
          </div>

          {/* Accomplishments / Expected Output */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-accomplishments">Accomplishment / Expected Output</Label>
            <Textarea
              id="entry-accomplishments"
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              placeholder="What did you accomplish?"
              rows={5}
            />
            <AIAssistButton
              mode="revise"
              value={accomplishments}
              onAccept={(text) => setAccomplishments(text)}
              onAcceptAssignment={(title) => setWorkAssignment(title)}
            />
          </div>

          {/* Error display */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Status Toggle */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Badge
              variant={status === "draft" ? "secondary" : "default"}
              className="cursor-pointer select-none"
              onClick={toggleStatus}
            >
              {status === "draft" ? "Draft" : "Finalized"}
            </Badge>
          </div>
        </form>

        <SheetFooter>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={saving || !date}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
