import { useState, useCallback } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { CalendarView } from "@/components/calendar-view";
import { TableView } from "@/components/table-view";
import { ContextLibrary } from "@/components/context-library";
import { Settings } from "@/components/settings";
import { GeneratePdfDialog } from "@/components/generate-pdf-dialog";
import { ExportExcelDialog } from "@/components/export-excel-dialog";
import { api } from "@/lib/api";

function App() {
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);

  const handleBackupData = useCallback(() => {
    try {
      const data = api.getRawData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `awa-filer-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create backup");
    }
  }, []);

  const handleRestoreData = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const confirmed = window.confirm(
        "This will replace all your current data (entries, profile, settings, context documents). Are you sure?"
      );
      if (!confirmed) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || data.version !== 1) {
          toast.error("Invalid backup file: unsupported format");
          return;
        }
        api.setRawData(data);
        toast.success("Data restored successfully");
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to restore backup");
      }
    };
    input.click();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <HashRouter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar
            onGeneratePdf={() => setPdfDialogOpen(true)}
            onExportExcel={() => setExcelDialogOpen(true)}
            onBackupData={handleBackupData}
            onRestoreData={handleRestoreData}
          />
          <main className="flex-1 overflow-auto bg-background p-6">
            <Routes>
              <Route path="/" element={<CalendarView />} />
              <Route path="/table" element={<TableView />} />
              <Route path="/context" element={<ContextLibrary />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <GeneratePdfDialog
            open={pdfDialogOpen}
            onOpenChange={setPdfDialogOpen}
          />
          <ExportExcelDialog
            open={excelDialogOpen}
            onOpenChange={setExcelDialogOpen}
          />
          <Toaster />
        </div>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
