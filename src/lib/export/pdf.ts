/**
 * PDF export — captures the report view DOM node and outputs a
 * multi-page PDF that mirrors the on-screen layout pixel-for-pixel.
 *
 * Strategy: html-to-image renders a high-DPI PNG of the target
 * element, then jsPDF slices that image into pages at the correct
 * aspect ratio. The result is a faithful, branded PDF without a
 * separate "print stylesheet" or template.
 *
 * Usage:
 *
 *     import { exportReportPdf } from "@/lib/export/pdf";
 *     await exportReportPdf(containerRef.current!, "Whale-042-report");
 */

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export interface ExportOptions {
  /** Filename without extension. */
  name?: string;
  /** Pixel ratio for the raster capture (default 2). */
  pixelRatio?: number;
}

/**
 * Capture `element` as a high-DPI PNG, paginate into a PDF, and
 * trigger a browser download. Returns the blob URL in case the
 * caller wants to revoke it manually.
 *
 * Never throws to the UI — resolves to `null` on any failure.
 */
export async function exportReportPdf(
  element: HTMLElement,
  options: ExportOptions = {},
): Promise<string | null> {
  const { name = "oracle-report", pixelRatio = 2 } = options;

  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio,
      backgroundColor: "#05060a", // Oracle obsidian bg
      filter: (node: HTMLElement) => {
        // Skip buttons, inputs, and interactive controls.
        if (node.tagName === "BUTTON" || node.tagName === "INPUT") return false;
        if (node.getAttribute?.("data-export-skip") === "true") return false;
        return true;
      },
    });

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    const pxWidth = img.naturalWidth;
    const pxHeight = img.naturalHeight;

    // A4-ish landscape proportions.
    const pdfWidth = 210; // mm
    const pdfHeight = (pxHeight * pdfWidth) / pxWidth;

    const pageHeight = 297; // mm — A4 page height
    const totalPages = Math.ceil(pdfHeight / pageHeight);

    const doc = new jsPDF({
      orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
      unit: "mm",
      format: "a4",
    });

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();
      doc.addImage(
        dataUrl,
        "PNG",
        0,
        -page * pageHeight,
        pdfWidth,
        pdfHeight,
      );
    }

    doc.save(`${name}.pdf`);
    return URL.createObjectURL(doc.output("blob"));
  } catch (err) {
    console.error("[exportReportPdf] failed:", err);
    return null;
  }
}
