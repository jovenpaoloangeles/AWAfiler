import * as XLSX from "xlsx";
import type { Entry } from "./api";

export function exportToExcel(entries: Entry[], start?: string, end?: string): void {
  // Sort entries by date ascending
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build worksheet data with only the 3 required columns
  const data = sorted.map((entry) => ({
    Date: entry.date,
    "Work Assignment": entry.work_assignment,
    Accomplishments: entry.accomplishments,
  }));

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 14 }, // Date
    { wch: 40 }, // Work Assignment
    { wch: 60 }, // Accomplishments
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Entries");

  // Generate filename
  const today = new Date().toISOString().split("T")[0];
  let filename: string;
  if (start && end) {
    filename = `AWAfiler_Entries_${start}_to_${end}.xlsx`;
  } else {
    filename = `AWAfiler_All_Entries_${today}.xlsx`;
  }

  // Trigger download
  XLSX.writeFile(wb, filename);
}