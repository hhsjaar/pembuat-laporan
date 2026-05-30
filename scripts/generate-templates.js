const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require("docx");
const fs = require("fs");
const path = require("path");

const templatesDir = path.join(__dirname, "..", "templates");

// Ensure templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

function createLaporanInformasi() {
  return new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: "LAPORAN INFORMASI RESMI",
              bold: true,
              size: 28,
              font: "Arial",
              color: "111111",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "HARI / TANGGAL : ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: "{{tanggal}}", size: 20, font: "Arial" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "LOKASI KEJADIAN : ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: "{{lokasi}}", size: 20, font: "Arial" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "PERIHAL : ", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: "{{judul}}", size: 20, font: "Arial" }),
          ],
        }),
        // Divider
        new Paragraph({
          spacing: { after: 240 },
          border: {
            bottom: {
              color: "CCCCCC",
              space: 1,
              value: BorderStyle.SINGLE,
              size: 6,
            },
          },
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "A. DESKRIPSI DAN RINCIAN INFORMASI", bold: true, size: 22, font: "Arial", color: "333333" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "{{isi_laporan}}", size: 20, font: "Arial" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "B. KESIMPULAN DAN TINDAK LANJUT", bold: true, size: 22, font: "Arial", color: "333333" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "{{kesimpulan}}", size: 20, font: "Arial" }),
          ],
        }),
        new Paragraph({
          spacing: { before: 400 },
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Dibuat secara otomatis oleh AI Report Generator", italic: true, size: 16, font: "Arial", color: "777777" }),
          ],
        }),
      ],
    }],
  });
}

function createLaporanHarianKhusus() {
  return new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: "LAPORAN HARIAN KHUSUS (LHK)",
              bold: true,
              size: 28,
              font: "Georgia",
              color: "000000",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "WAKTU : ", bold: true, size: 20, font: "Georgia" }),
            new TextRun({ text: "{{tanggal}}", size: 20, font: "Georgia" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "TEMPAT/TKP : ", bold: true, size: 20, font: "Georgia" }),
            new TextRun({ text: "{{lokasi}}", size: 20, font: "Georgia" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "TOPIK UTAMA : ", bold: true, size: 20, font: "Georgia" }),
            new TextRun({ text: "{{judul}}", size: 20, font: "Georgia" }),
          ],
        }),
        // Divider
        new Paragraph({
          spacing: { after: 240 },
          border: {
            bottom: {
              color: "111111",
              space: 1,
              value: BorderStyle.SINGLE,
              size: 12,
            },
          },
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "I. PENDAHULUAN", bold: true, size: 22, font: "Georgia" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: "Laporan harian khusus ini dibuat sebagai bentuk dokumentasi resmi atas situasi di lapangan yang memerlukan perhatian segera dari jajaran pimpinan.",
              italic: true,
              size: 20,
              font: "Georgia",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "II. FAKTA-FAKTA LAPANGAN", bold: true, size: 22, font: "Georgia" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "{{isi_laporan}}", size: 20, font: "Georgia" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "III. ANALISIS & REKOMENDASI KEBIJAKAN", bold: true, size: 22, font: "Georgia" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "{{kesimpulan}}", size: 20, font: "Georgia" }),
          ],
        }),
      ],
    }],
  });
}

function createLaporanKhusus3() {
  return new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: "DOKUMEN DOKUMENTASI LAPORAN KHUSUS - TIPE 3",
              bold: true,
              size: 26,
              font: "Calibri",
              color: "1B365D",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "WAKTU LAPORAN : ", bold: true, size: 20, font: "Calibri", color: "1B365D" }),
            new TextRun({ text: "{{tanggal}}", size: 20, font: "Calibri" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "AREA PENGAWASAN : ", bold: true, size: 20, font: "Calibri", color: "1B365D" }),
            new TextRun({ text: "{{lokasi}}", size: 20, font: "Calibri" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "JUDUL PERISTIWA : ", bold: true, size: 20, font: "Calibri", color: "1B365D" }),
            new TextRun({ text: "{{judul}}", size: 20, font: "Calibri" }),
          ],
        }),
        // Divider
        new Paragraph({
          spacing: { after: 240 },
          border: {
            bottom: {
              color: "1B365D",
              space: 1,
              value: BorderStyle.SINGLE,
              size: 8,
            },
          },
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "A. INTISARI DOKUMENTASI & KRONOLOGI", bold: true, size: 22, font: "Calibri", color: "1B365D" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "{{isi_laporan}}", size: 20, font: "Calibri" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "B. KESIMPULAN STRATEGIS & SOLUSI", bold: true, size: 22, font: "Calibri", color: "1B365D" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "{{kesimpulan}}", size: 20, font: "Calibri" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "C. CATATAN AKHIR & VALIDITAS", bold: true, size: 22, font: "Calibri", color: "1B365D" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: "Laporan ini disusun secara elektronik menggunakan sistem AI Report Generator dan bersifat sah untuk keperluan koordinasi internal.",
              size: 18,
              font: "Calibri",
              color: "555555"
            }),
          ],
        }),
      ],
    }],
  });
}

async function generateAll() {
  console.log("Generating templates...");

  const templateConfigs = [
    { name: "laporan-informasi.docx", doc: createLaporanInformasi() },
    { name: "laporan-harian-khusus.docx", doc: createLaporanHarianKhusus() },
    { name: "laporan-khusus-3.docx", doc: createLaporanKhusus3() }
  ];

  for (const config of templateConfigs) {
    const buffer = await Packer.toBuffer(config.doc);
    const outputPath = path.join(templatesDir, config.name);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Successfully generated template: ${config.name} at ${outputPath}`);
  }

  console.log("All templates generated successfully!");
}

generateAll().catch(err => {
  console.error("Error generating templates:", err);
  process.exit(1);
});
