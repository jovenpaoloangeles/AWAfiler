import { useCallback, useMemo, useState } from "react";
import { api, type Entry, type EntriesParams } from "@/lib/api";

export function useEntries(params?: EntriesParams) {
  const [revision, setRevision] = useState(0);

  const entries = useMemo(() => {
    // Trigger re-read by depending on revision
    void revision;
    return api.getEntries(params);
  }, [params, revision]);

  const refetch = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const createEntry = useCallback(
    (data: Partial<Entry>) => {
      const entry = api.createEntry(data);
      setRevision((r) => r + 1);
      return entry;
    },
    []
  );

  const updateEntry = useCallback(
    (id: string, data: Partial<Entry>) => {
      const entry = api.updateEntry(id, data);
      setRevision((r) => r + 1);
      return entry;
    },
    []
  );

  const deleteEntry = useCallback((id: string) => {
    api.deleteEntry(id);
    setRevision((r) => r + 1);
  }, []);

  const updateStatus = useCallback(
    (id: string, status: Entry["status"]) => {
      const entry = api.updateEntryStatus(id, status);
      setRevision((r) => r + 1);
      return entry;
    },
    []
  );

  return {
    entries,
    loading: false,
    error: null,
    createEntry,
    updateEntry,
    deleteEntry,
    updateStatus,
    refetch,
  };
}

/**
 * Standalone mutation functions for entries — no fetch on mount.
 */
export function useEntryMutations() {
  const [revision, setRevision] = useState(0);

  const createEntry = useCallback(
    (data: Partial<Entry>) => {
      const entry = api.createEntry(data);
      setRevision((r) => r + 1);
      return entry;
    },
    []
  );

  const updateEntry = useCallback(
    (id: string, data: Partial<Entry>) => {
      const entry = api.updateEntry(id, data);
      setRevision((r) => r + 1);
      return entry;
    },
    []
  );

  return { createEntry, updateEntry };
}
