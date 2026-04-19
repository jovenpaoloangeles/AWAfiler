import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useEntries } from "@/hooks/use-entries";
import { type Entry } from "@/lib/api";
import { EntryForm } from "@/components/entry-form";

function getMonthParam(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CopyButton({ entry }: { entry: Entry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = [
      `Date: ${entry.date}`,
      `Expected Output: ${entry.expected_output}`,
      `Work Assignment: ${entry.work_assignment}`,
      `Accomplishments: ${entry.accomplishments}`,
      `Days: ${entry.duration_days}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [entry]);

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy entry">
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}

export function TableView() {
  const [month, setMonth] = useState(getMonthParam);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const { entries, loading, deleteEntry, updateStatus, refetch } = useEntries({
    month,
  });

  // Re-fetch when month changes
  useEffect(() => {
    refetch();
  }, [month, refetch]);

  const handleEdit = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteEntry(id);
        toast.success("Entry deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete entry");
      }
    },
    [deleteEntry]
  );

  const handleToggleStatus = useCallback(
    async (entry: Entry) => {
      const newStatus: Entry["status"] =
        entry.status === "draft" ? "finalized" : "draft";
      try {
        await updateStatus(entry.id, newStatus);
        toast.success(`Entry ${newStatus}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    },
    [updateStatus]
  );

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingEntry(null);
    refetch();
  }, [refetch]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Table View</h1>
          <p className="text-sm text-muted-foreground">
            Browse and manage all entries.
          </p>
        </div>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading entries...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">
            No entries found for {month}. Create one from the Calendar view.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Date</TableHead>
                <TableHead>Work Assignment</TableHead>
                <TableHead className="max-w-xs">Accomplishments</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatDate(entry.date)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.work_assignment}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal break-words">
                    {entry.accomplishments}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={entry.status === "draft" ? "secondary" : "default"}
                      className="cursor-pointer select-none"
                      onClick={() => handleToggleStatus(entry)}
                    >
                      {entry.status === "draft" ? "Draft" : "Finalized"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(entry)}
                        aria-label="Edit entry"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <CopyButton entry={entry} />
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Delete entry"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Entry Form Dialog */}
      <EntryForm
        open={formOpen}
        onClose={handleFormClose}
        entry={editingEntry}
      />
    </div>
  );
}
