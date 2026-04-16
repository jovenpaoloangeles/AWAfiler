import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Upload, Trash2, BookOpen, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { api, type ContextDoc } from "@/lib/api";

export function ContextLibrary() {
  const [docs, setDocs] = useState<ContextDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("reference");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getContextDocs();
      setDocs(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const content = await file.text();
        const newDoc = api.uploadContextDoc({
          title: file.name,
          content,
          type: docType,
        });
        setDocs((prev) => [newDoc, ...prev]);
        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload document");
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [docType]
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.deleteContextDoc(id);
      setDocs((prev) => prev.filter((doc) => doc.id !== id));
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Context Library</h1>
        <p className="text-sm text-muted-foreground">
          Upload and manage reference documents for AI context.
        </p>
      </div>

      {/* Upload Section */}
      <div className="flex items-center gap-3">
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reference">Reference</SelectItem>
            <SelectItem value="past_report">Past Report</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleUploadClick} disabled={uploading}>
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Document List */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading documents...
          </span>
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <FileText className="size-12 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              No documents yet
            </p>
            <p className="text-sm text-muted-foreground/70">
              Upload reference documents or past reports to provide context for
              AI assistance.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-auto">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              {doc.type === "past_report" ? (
                <BookOpen className="size-5 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(doc.created_at)}
                </p>
              </div>
              <Badge
                variant={doc.type === "past_report" ? "default" : "secondary"}
              >
                {doc.type === "past_report" ? "Past Report" : "Reference"}
              </Badge>
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={() => handleDelete(doc.id)}
                aria-label="Delete document"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
