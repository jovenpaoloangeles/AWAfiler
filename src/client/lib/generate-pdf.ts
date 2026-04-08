import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Entry, Profile } from "./api";
import { registerArial } from "./fonts/register-arial";

function formatDateForPdf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function generatePdf(
  entries: Entry[],
  profile: Profile,
  coveredPeriodLabel: string
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 72; // 2.54cm = 1 inch = 72pt
  const marginLeft = margin;
  const marginRight = margin;
  let y = margin;

  // --- Register Arial font ---
  await registerArial(doc);

  // --- Header ---
  doc.setFont("Arial", "bold");
  doc.setFontSize(14);
  doc.text("DEPARTMENT OF SCIENCE AND TECHNOLOGY", pageWidth / 2, y, {
    align: "center",
  });
  y += 18;

  doc.setFont("Arial", "italic");
  doc.setFontSize(14);
  doc.text("Advanced Science and Technology Institute", pageWidth / 2, y, {
    align: "center",
  });
  y += 30;

  // --- Title ---
  doc.setFont("Arial", "bold");
  doc.setFontSize(14);
  doc.text(
    "INDIVIDUAL WORK FROM HOME ACCOMPLISHMENT REPORT",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 18;

  doc.setFont("Arial", "normal");
  doc.setFontSize(14);
  doc.text(`Covered Period: ${coveredPeriodLabel}`, pageWidth / 2, y, {
    align: "center",
  });
  y += 24;

  // --- Profile Info ---
  doc.setFont("Arial", "bold");
  doc.setFontSize(12);
  const lineHeight = 16;

  doc.text(`Name: ${profile.name}`, marginLeft, y);
  y += lineHeight;
  doc.text(`Position: ${profile.position}`, marginLeft, y);
  y += lineHeight;
  doc.text(`Division: ${profile.division}`, marginLeft, y);
  y += 25;

  // --- Sort entries by date ---
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // --- Calculate total duration ---
  const totalDays = sorted.reduce((sum, e) => sum + (e.duration_days || 1), 0);
  const durationLabel = `${totalDays} Day${totalDays !== 1 ? "s" : ""}`;

  // --- Build table body ---
  const body: (string | { content: string; rowSpan?: number; styles?: Record<string, unknown> })[][] =
    sorted.map((entry, i) => {
      const row: (string | { content: string; rowSpan?: number; styles?: Record<string, unknown> })[] = [];

      if (i === 0) {
        row.push({
          content: durationLabel,
          rowSpan: sorted.length,
          styles: { valign: "middle", halign: "center", fontStyle: "bold" },
        });
      }

      row.push(entry.work_assignment);
      row.push(formatDateForPdf(entry.date));
      row.push(entry.accomplishments);

      return row;
    });

  // --- Table ---
  const tableWidth = pageWidth - marginLeft - marginRight;
  const colDuration = tableWidth * 0.12;
  const colWork = tableWidth * 0.25;
  const colDate = tableWidth * 0.13;
  const colAccomp = tableWidth * 0.50;

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    theme: "grid",
    styles: {
      fontSize: 12,
      cellPadding: 6,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      font: "Arial",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    head: [
      [
        {
          content: "EXPECTED OUTPUT",
          colSpan: 2,
          styles: { halign: "center" },
        },
        {
          content: "ACTUAL ACCOMPLISHMENTS",
          colSpan: 2,
          styles: { halign: "center" },
        },
      ],
      [
        { content: "DURATION", styles: { halign: "center" } },
        { content: "WORK ASSIGNMENT", styles: { halign: "center" } },
        { content: "DATE", styles: { halign: "center" } },
        {
          content: "ACCOMPLISHMENTS/\nUPDATES",
          styles: { halign: "center" },
        },
      ],
    ],
    body,
    columnStyles: {
      0: { cellWidth: colDuration, halign: "center", valign: "middle" },
      1: { cellWidth: colWork },
      2: { cellWidth: colDate, halign: "center", fontStyle: "bold" },
      3: { cellWidth: colAccomp },
    },
  });

  // --- Signature Section ---
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 40;

  const sigLeftX = marginLeft;
  const sigRightX = pageWidth / 2 + 20;

  doc.setFont("Arial", "normal");
  doc.setFontSize(12);

  doc.text("Prepared by:", sigLeftX, finalY);
  doc.text("Approved by:", sigRightX, finalY);

  const sigNameY = finalY + 40;

  doc.setFont("Arial", "bold");
  doc.setFontSize(12);
  doc.text(profile.name.toUpperCase(), sigLeftX, sigNameY);
  doc.text(
    (profile.approver_name || "").toUpperCase(),
    sigRightX,
    sigNameY
  );

  const sigTitleY = sigNameY + 14;
  doc.setFont("Arial", "italic");
  doc.setFontSize(12);
  doc.text(profile.position, sigLeftX, sigTitleY);
  doc.text(profile.approver_title || "", sigRightX, sigTitleY);

  // --- Save ---
  const safePeriod = coveredPeriodLabel.replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "_");
  doc.save(`AWA_Report_${safePeriod}.pdf`);
}
