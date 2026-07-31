import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { fetchPassSlips } from "@/lib/erp/client";

interface ErpSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ErpSyncDialog({ open, onOpenChange }: ErpSyncDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // The password exists only while this sheet is open — opening reloads the
  // stored username, closing drops the password on the floor.
  useEffect(() => {
    if (open) {
      setUsername(api.getProfile().erp_username);
    } else {
      setPassword("");
      setShowPassword(false);
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSyncing(true);

      try {
        const { entries, period } = await fetchPassSlips(username, password);

        if (entries.length === 0) {
          toast.info(`No pass slips found for ${period.start} to ${period.end}.`);
          setSyncing(false);
          return;
        }

        const { created, updated } = api.upsertErpEntries(entries);
        setPassword("");
        toast.success(`Synced ${created} new and ${updated} updated entries.`);

        // Keep the spinner up so the toast lands before the reload takes over.
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ERP sync failed", {
          duration: 10_000,
        });
        setSyncing(false);
      }

    },
    [username, password],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Sync from ERP</SheetTitle>
          <SheetDescription>
            Fetches your approved and pending pass slips for the current payroll
            period and writes them in as drafts.
          </SheetDescription>
        </SheetHeader>

        {!username ? (
          <div className="px-4 text-sm text-muted-foreground">
            Set your ERP username in Settings before syncing.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="erp-sync-username">ERP Username</Label>
              <Input id="erp-sync-username" value={username} readOnly disabled />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="erp-sync-password">ERP Password</Label>
              <div className="relative">
                <Input
                  id="erp-sync-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your ERP password"
                  autoComplete="current-password"
                  autoFocus
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Never stored — held in memory for this sync only.
              </p>
            </div>

            <Button type="submit" disabled={syncing || !password.trim()}>
              {syncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {syncing ? "Syncing..." : "Sync ERP"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
