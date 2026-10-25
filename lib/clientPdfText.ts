// Ekstraksi teks PDF di browser agar ukuran berkas tidak dibatasi limit request body Vercel (~4.5MB).
// Hanya teks hasil ekstraksi yang dikirim ke server.

export const MAX_PDF_SIZE_MB = 200;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

// Batas teks yang dikirim ke server/AI: menjaga request di bawah limit body Vercel dan konteks model.
export const MAX_PDF_TEXT_CHARS = 400_000;

export interface PdfTextResult {
  text: string;
  truncated: boolean;
  totalPages: number;
  extractedPages: number;
}

export async function extractPdfText(
  file: File,
  onProgress?: (page: number, totalPages: number) => void
): Promise<PdfTextResult> {
  // Import dinamis: pdfjs-dist butuh API browser dan tidak boleh dimuat saat SSR.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  // Blob URL: pdf.js membaca berkas bertahap (range request) tanpa menyalin seluruh isinya ke memori JS.
  const blobUrl = URL.createObjectURL(file);
  const task = pdfjs.getDocument({ url: blobUrl });

  try {
    const doc = await task.promise;
    const pages: string[] = [];
    let length = 0;
    let truncated = false;
    let extractedPages = 0;

    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.(i, doc.numPages);
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        text += item.hasEOL ? "\n" : " ";
      }
      text = text.trim();
      page.cleanup();
      extractedPages = i;

      if (length + text.length > MAX_PDF_TEXT_CHARS) {
        pages.push(text.slice(0, Math.max(0, MAX_PDF_TEXT_CHARS - length)));
        truncated = true;
        break;
      }
      pages.push(text);
      length += text.length + 2;
    }

    return { text: pages.join("\n\n"), truncated, totalPages: doc.numPages, extractedPages };
  } finally {
    await task.destroy();
    URL.revokeObjectURL(blobUrl);
  }
}
