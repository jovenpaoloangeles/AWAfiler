import { useCallback, useEffect, useState } from "react";
import { api, type Entry, type EntriesParams } from "@/lib/api";

export function useEntries(params?: EntriesParams) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize params to a stable key for dependency tracking
  const paramsKey = JSON.stringify(params ?? {});

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEntries(params);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createEntry = useCallback(
    async (data: Partial<Entry>) => {
      const entry = await api.createEntry(data);
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    []
  );

  const updateEntry = useCallback(
    async (id: string, data: Partial<Entry>) => {
      const entry = await api.updateEntry(id, data);
      setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
      return entry;
    },
    []
  );

  const deleteEntry = useCallback(async (id: string) => {
    await api.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: Entry["status"]) => {
      const entry = await api.updateEntryStatus(id, status);
      setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
      return entry;
    },
    []
  );

  return {
    entries,
    loading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    updateStatus,
    refetch,
  };
}

/**
 * Standalone mutation functions for entries — no fetch on mount.
 * Use this in components (e.g. EntryForm) that only need create/update
 * and should not trigger a network request for the full entry list.
 */
export function useEntryMutations() {
  const createEntry = useCallback(
    async (data: Partial<Entry>) => {
      return await api.createEntry(data);
    },
    []
  );

  const updateEntry = useCallback(
    async (id: string, data: Partial<Entry>) => {
      return await api.updateEntry(id, data);
    },
    []
  );

  return { createEntry, updateEntry };
}
