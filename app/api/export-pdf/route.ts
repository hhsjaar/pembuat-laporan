import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import fs from "fs";
import { generatePdfHtml } from "@/lib/generatePdfHtml";

export const runtime = "nodejs";

const findChromeExecutable = (): string => {
  const customBin = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (customBin && fs.existsSync(customBin)) {
    return customBin;
  }

  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(macChrome)) {
    return macChrome;
  }

  const macChromium = "/Applications/Chromium.app/Contents/MacOS/Chromium";
  if (fs.existsSync(macChromium)) {
    return macChromium;
  }

  const linuxPaths = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];

  for (const p of linuxPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Default fallback to mac standard path
  return macChrome;
};

const parseIndonesianDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const clean = dateStr.replace(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\s]+/i, "").trim();
  const months: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
  };
  const parts = clean.split(/[\s-]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = months[parts[1].toLowerCase()];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year < 100 ? 2000 + year : year, month, day);
    }
  }
  return null;
};

const getExportFilename = (type: string, reportData?: any): string => {
  let dateObj: Date | null = null;

  if (reportData) {
    if (type === "rencana-kegiatan" && reportData.hari_tanggal) {
      dateObj = parseIndonesianDate(reportData.hari_tanggal);
    } else if (type === "laporan-harian-intelijen" && reportData.tanggal) {
      dateObj = parseIndonesianDate(reportData.tanggal);
    }
  }

  if (!dateObj) {
    const baseDate = new Date();
    if (type === "rencana-kegiatan") {
      dateObj = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      dateObj = baseDate;
    }
  }

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = String(dateObj.getFullYear()).slice(-2);

  if (type === "rencana-kegiatan") {
    return `REN-${day}${month}${year}.pdf`;
  }
  if (type === "laporan-harian-intelijen") {
    return `LAPHAR-${day}${month}${year}.pdf`;
  }

  const sanitize = (text?: string) => {
    if (!text) return "tanpa-perihal";
    return text.replace(/[\/\\:\*\?"<>\|]/g, "_").trim();
  };

  if (type === "laporan-informasi") {
    const perihal = reportData?.perihal || reportData?.judul || "tanpa-perihal";
    return `LI-${sanitize(perihal)}.pdf`;
  }
  if (type === "laporan-harian-khusus") {
    const perihal = reportData?.perihal || reportData?.judul || "tanpa-perihal";
    return `LAPHARSUS-${sanitize(perihal)}.pdf`;
  }
  if (type === "infosus") {
    const perihal = reportData?.perihal || reportData?.judul || "tanpa-perihal";
    return `INFOSUS-${sanitize(perihal)}.pdf`;
  }

  return `${type}-${Date.now()}.pdf`;
};

export async function POST(req: NextRequest) {
  let browser: any = null;
  try {
    const { templateType, reportData } = await req.json();

    if (!templateType || !reportData) {
      return NextResponse.json(
        { error: "Parameter templateType dan reportData diperlukan." },
        { status: 400 }
      );
    }

    const htmlContent = generatePdfHtml(templateType, reportData);
    const executablePath = findChromeExecutable();

    if (!fs.existsSync(executablePath)) {
      return NextResponse.json(
        { error: `Executable Chrome tidak ditemukan di server pada: ${executablePath}` },
        { status: 500 }
      );
    }

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "18mm",
        bottom: "18mm",
        left: "18mm",
        right: "18mm",
      },
    });

    await browser.close();
    browser = null;

    const filename = getExportFilename(templateType, reportData);

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Content-Length", pdfBuffer.length.toString());

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error("Error closing puppeteer browser:", err);
      }
    }
    console.error("Export PDF API Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengekspor laporan ke format PDF." },
      { status: 500 }
    );
  }
}
