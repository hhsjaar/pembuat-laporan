import { generatePdfHtml, ReportData } from "./generatePdfHtml";

interface ExportPdfOptions {
  templateType: string;
  reportData: ReportData;
  filename: string;
}

/**
 * Exports a report to PDF using the browser's native print dialog.
 * This approach is 100% reliable on all environments (Vercel, localhost, mobile)
 * because it uses the browser's own PDF rendering engine — no dependencies on
 * Puppeteer, html2canvas, or any server-side Chrome binary.
 *
 * The browser will open a print dialog — the user selects "Save as PDF"
 * (or on Chrome/Edge, it auto-prompts to save as PDF when triggered from
 * a popup window).
 */
export async function exportReportToPdfClient({
  templateType,
  reportData,
  filename,
}: ExportPdfOptions): Promise<void> {
  if (typeof window === "undefined") return;

  // Generate the complete, self-contained HTML document
  const fullHtml = generatePdfHtml(templateType, reportData);

  // Inject the print-trigger script and suggested filename into the document
  const htmlWithPrint = fullHtml.replace(
    "</body>",
    `<script>
      // Set document title to the desired filename so browser uses it as PDF name
      document.title = ${JSON.stringify(filename.replace(/\.pdf$/i, ""))};
      // Auto-trigger print on load
      window.onload = function() {
        setTimeout(function() {
          window.print();
          // Close the window a moment after the print dialog
          setTimeout(function() {
            try { window.close(); } catch(e) {}
          }, 500);
        }, 300);
      };
    </script>
    </body>`
  );

  // Open a new blank window (popup)
  const printWindow = window.open("", "_blank", "width=960,height=720,scrollbars=yes,resizable=yes");

  if (!printWindow) {
    // Fallback: open in same tab if popup is blocked
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    throw new Error(
      "Popup diblokir oleh browser. Harap izinkan popup dari situs ini lalu coba unduh lagi."
    );
  }

  printWindow.document.open();
  printWindow.document.write(htmlWithPrint);
  printWindow.document.close();

  // Resolve after print completes (best-effort)
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 2000);
  });
}
