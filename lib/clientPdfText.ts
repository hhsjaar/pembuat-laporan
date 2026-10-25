// Ekstraksi teks PDF di browser agar ukuran berkas tidak dibatasi limit request body Vercel (~4.5MB).
// Hanya teks hasil ekstraksi yang dikirim ke server.

export const MAX_PDF_SIZE_MB = 30;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

export async function extractPdfText(file: File): Promise<string> {
  // Import dinamis: pdfjs-dist butuh API browser dan tidak boleh dimuat saat SSR.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;

  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        text += item.hasEOL ? "\n" : " ";
      }
      pages.push(text.trim());
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy();
  }
}
