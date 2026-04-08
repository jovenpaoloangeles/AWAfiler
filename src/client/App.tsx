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

function AIAssistPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">AI Assist</h1>
        <p className="mt-2 text-muted-foreground">
          Revise, expand, or generate entries with AI assistance.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar onGeneratePdf={() => setPdfDialogOpen(true)} />
          <main className="flex-1 overflow-auto bg-background p-6">
            <Routes>
              <Route path="/" element={<CalendarView />} />
              <Route path="/table" element={<TableView />} />
              <Route path="/ai" element={<AIAssistPlaceholder />} />
              <Route path="/context" element={<ContextLibrary />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <GeneratePdfDialog
            open={pdfDialogOpen}
            onOpenChange={setPdfDialogOpen}
          />
          <Toaster />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
