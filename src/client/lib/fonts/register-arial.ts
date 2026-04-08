import type { jsPDF } from "jspdf";

import arialNormalUrl from "./arial-normal.ttf";
import arialBoldUrl from "./arial-bold.ttf";
import arialItalicUrl from "./arial-italic.ttf";
import arialBoldItalicUrl from "./arial-bolditalic.ttf";

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function registerArial(doc: jsPDF): Promise<void> {
  const [normal, bold, italic, boldItalic] = await Promise.all([
    fetchAsBase64(arialNormalUrl),
    fetchAsBase64(arialBoldUrl),
    fetchAsBase64(arialItalicUrl),
    fetchAsBase64(arialBoldItalicUrl),
  ]);

  doc.addFileToVFS("Arial-normal.ttf", normal);
  doc.addFont("Arial-normal.ttf", "Arial", "normal");

  doc.addFileToVFS("Arial-bold.ttf", bold);
  doc.addFont("Arial-bold.ttf", "Arial", "bold");

  doc.addFileToVFS("Arial-italic.ttf", italic);
  doc.addFont("Arial-italic.ttf", "Arial", "italic");

  doc.addFileToVFS("Arial-bolditalic.ttf", boldItalic);
  doc.addFont("Arial-bolditalic.ttf", "Arial", "bolditalic");
}
