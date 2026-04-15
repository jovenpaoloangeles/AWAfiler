import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { CalendarView } from "@/components/calendar-view";
import { TableView } from "@/components/table-view";
import { ContextLibrary } from "@/components/context-library";
import { Settings } from "@/components/settings";
import { GeneratePdfDialog } from "@/components/generate-pdf-dialog";
import { ExportExcelDialog } from "@/components/export-excel-dialog";

function App() {
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);

  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar
          onGeneratePdf={() => setPdfDialogOpen(true)}
          onExportExcel={() => setExcelDialogOpen(true)}
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
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
