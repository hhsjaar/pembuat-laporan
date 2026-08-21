export interface ReportData {
  judul?: string;
  tanggal?: string;
  lokasi?: string;
  isi_laporan?: string;
  kesimpulan?: string;

  // Laporan Informasi / LHK fields
  bidang?: string;
  perihal?: string;
  "cara-mendapatkan-informasi"?: string;
  "waktu-mendapatkan-informasi"?: string;
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  E?: string;
  F?: string;
  analisa?: string;
  prediksi?: string;
  langkah?: string;
  rekomendasi?: string;

  // Infosus specific
  perihal_judul?: string;
  fakta_fakta?: string;

  // LHI specific
  nomor_laporan?: string;
  hari?: string;
  pendahuluan_politik?: string;
  pendahuluan_sosbud?: string;
  pendahuluan_ekonomi?: string;
  pendahuluan_keamanan?: string;
  fakta_sosial_politik?: string;
  fakta_sosial_ekonomi_intro?: string;
  fakta_sosial_budaya?: string;
  kriminalitas_text?: string;
  laka_lantas_text?: string;
  bencana_alam_text?: string;
  tahanan_text?: string;
  vvip_text?: string;
  lain_lain_text?: string;

  // Sembako fields for LHI
  [key: string]: any;

  // Rencana Kegiatan specific
  hari_tanggal?: string;
  kegiatan_list?: {
    no?: string | number;
    waktu_lokasi?: string;
    kegiatan?: string;
    hasil?: string;
    ket?: string;
  }[];
  tanggal_ttd?: string;
  jabatan_ttd?: string;
  nama_ttd?: string;
  pangkat_nrp_ttd?: string;
}

const escapeHtml = (text: string | undefined | null): string => {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const formatMultilineText = (text: string | undefined | null, leftIndent: string = "24px"): string => {
  if (!text) return "";
  let normalized = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  normalized = normalized.replace(/([.!?])\s+([0-9]+\.\s+)/g, "$1\n$2");

  const lines = normalized.split("\n");
  const htmlParts: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      htmlParts.push(`<div style="height: 6px;"></div>`);
      continue;
    }

    const listMatch = trimmed.match(/^(([0-9]+|[a-zA-Z])[\.\)])\s+(.*)$/);
    if (listMatch) {
      const numLabel = escapeHtml(listMatch[1]);
      const bodyText = escapeHtml(listMatch[3]);
      htmlParts.push(`
        <div style="display: flex; margin-left: ${leftIndent}; margin-bottom: 4px; text-align: justify;">
          <span style="min-width: 24px; flex-shrink: 0;">${numLabel}</span>
          <span style="flex-grow: 1;">${bodyText}</span>
        </div>
      `);
    } else {
      htmlParts.push(`
        <p style="margin: 0 0 4px 0; margin-left: ${leftIndent}; text-align: justify; text-indent: 0;">
          ${escapeHtml(trimmed)}
        </p>
      `);
    }
  }

  return htmlParts.join("");
};

export function generatePdfHtml(templateType: string, reportData: ReportData): string {
  // Backward compatibility helper for isi_laporan
  let finalIsiLaporan = reportData.isi_laporan;
  if (!finalIsiLaporan && (reportData.A || reportData.B || reportData.C || reportData.D)) {
    const parts = [];
    if (reportData.A) parts.push(reportData.A);
    if (reportData.B) {
      const cleanB = reportData.B.trim();
      parts.push(cleanB.match(/^[B]\./i) ? cleanB : `B. ${cleanB}`);
    }
    if (reportData.C) {
      const cleanC = reportData.C.trim();
      parts.push(cleanC.match(/^[C]\./i) ? cleanC : `C. ${cleanC}`);
    }
    if (reportData.D) {
      const cleanD = reportData.D.trim();
      parts.push(cleanD.match(/^[D]\./i) ? cleanD : `D. ${cleanD}`);
    }
    finalIsiLaporan = parts.join("\n\n");
  }

  const baseStyles = `
    @page {
      size: A4 portrait;
      margin: 18mm 18mm 18mm 18mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    p {
      margin: 0 0 6px 0;
      line-height: 1.35;
    }
    .kop-header {
      width: fit-content;
      text-align: center;
      margin-bottom: 20px;
    }
    .kop-header .line-1 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.2px;
    }
    .kop-header .line-2 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.2px;
    }
    .kop-header .line-3 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      letter-spacing: 0.2px;
    }
    .kop-header .line-addr {
      font-size: 9.5pt;
      font-weight: normal;
      margin: 0;
    }
    .kop-divider {
      border-bottom: 1.5px solid #000000;
      margin-top: 3px;
      width: 100%;
    }
    .doc-title-container {
      text-align: center;
      margin: 15px 0 20px 0;
    }
    .doc-title-main {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      display: inline-block;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 1px;
      margin: 0;
    }
    .doc-subtitle {
      font-size: 11pt;
      font-weight: normal;
      margin-top: 4px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11pt;
    }
    .meta-table td {
      vertical-align: top;
      padding: 2px 0;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    .table-data {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 10pt;
    }
    .table-data th, .table-data td {
      border: 1px solid #000000;
      padding: 5px 6px;
      vertical-align: top;
    }
    .table-data th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .signoff-container {
      margin-top: 24px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
      font-size: 11pt;
    }
    .signoff-left {
      width: 45%;
      font-size: 9.5pt;
      line-height: 1.3;
    }
    .signoff-right {
      width: 45%;
      text-align: center;
      line-height: 1.3;
    }
    .avoid-break {
      page-break-inside: avoid;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 18mm 18mm 18mm 18mm;
      }
      html, body {
        width: 100%;
        margin: 0;
        padding: 0;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: Calibri, 'Segoe UI', Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.35;
      }
      .no-print {
        display: none !important;
      }
      .kop-header,
      .meta-table,
      .section-title {
        page-break-inside: avoid;
        page-break-after: avoid;
      }
      .signoff-container {
        page-break-inside: avoid;
      }
      .table-data {
        page-break-inside: auto;
      }
      .table-data tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      .table-data th, .table-data td {
        border: 1px solid #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .table-data th {
        background-color: #f2f2f2 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .kop-divider {
        border-bottom: 1.5px solid #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .doc-title-main {
        border-bottom: 1.5px solid #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  // 1. LAPORAN INFORMASI
  if (templateType === "laporan-informasi") {
    const tanggal = escapeHtml(reportData.tanggal || "");
    const bidang = escapeHtml(reportData.bidang || "");
    const perihal = escapeHtml(reportData.perihal || "");
    const caraInfo = escapeHtml(reportData["cara-mendapatkan-informasi"] || "-");
    const waktuInfo = escapeHtml(reportData["waktu-mendapatkan-informasi"] || "-");

    return `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Laporan Informasi</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="kop-header">
        <p class="line-1">POLRI DAERAH JAWA TENGAH</p>
        <p class="line-2">RESOR KOTA BESAR SEMARANG</p>
        <p class="line-3">SEKTOR TEMBALANG</p>
        <p class="line-addr">Jl. Turus Asri no 9 Tembalang Semarang</p>
        <div class="kop-divider"></div>
      </div>

      <div class="doc-title-container">
        <p class="doc-subtitle">Nomor : &nbsp;R &nbsp;/ LI / &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ Intelkam</p>
        <h1 class="doc-title-main">LAPORAN – INFORMASI</h1>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 110px; font-weight: bold;">BIDANG</td>
          <td style="width: 15px; text-align: center; font-weight: bold;">:</td>
          <td style="font-weight: bold; text-transform: uppercase;">${bidang}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">PERIHAL</td>
          <td style="text-align: center; font-weight: bold;">:</td>
          <td style="font-weight: bold; text-transform: uppercase; text-align: justify;">${perihal}</td>
        </tr>
      </table>

      <div class="section-title">PENDAHULUAN</div>
      <table class="meta-table" style="margin-left: 12px; width: calc(100% - 12px);">
        <tr>
          <td style="width: 220px;">1. Sumber Informasi</td>
          <td style="width: 15px; text-align: center;">:</td>
          <td>Pelapor.</td>
        </tr>
        <tr>
          <td>2. Hubungan Sumber dgn Sasaran</td>
          <td style="text-align: center;">:</td>
          <td>-</td>
        </tr>
        <tr>
          <td>3. Cara mendapatkan Informasi</td>
          <td style="text-align: center;">:</td>
          <td>${caraInfo}</td>
        </tr>
        <tr>
          <td>4. Waktu mendapatkan Informasi</td>
          <td style="text-align: center;">:</td>
          <td>${waktuInfo}</td>
        </tr>
        <tr>
          <td>5. Nilai Informasi</td>
          <td style="text-align: center;">:</td>
          <td>A – 1</td>
        </tr>
      </table>

      <div class="section-title">HAL-HAL YANG DILAPORKAN</div>
      <div style="text-align: justify; margin-bottom: 14px;">
        ${formatMultilineText(finalIsiLaporan, "12px")}
      </div>

      <div class="section-title">PENDAPAT PELAPOR</div>
      <div style="margin-left: 12px; margin-bottom: 14px;">
        <p style="font-weight: bold; margin-bottom: 2px;">A. Analisa :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.analisa, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">B. Prediksi :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.prediksi, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">C. Langkah-langkah :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.langkah, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">D. Rekomendasi :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.rekomendasi, "20px")}</div>
      </div>

      <div class="signoff-container">
        <div class="signoff-left">
          <p style="font-weight: bold; margin-bottom: 2px;">DISTRIBUSI :</p>
          <p style="margin: 0;">1. Kasat Intelkam Polrestabes Semarang.</p>
          <p style="margin: 0;">2. Kapolsek Tembalang.</p>
          <p style="font-style: italic; margin-top: 6px; font-size: 9pt;">LI Cengli</p>
        </div>
        <div class="signoff-right">
          <p style="margin-bottom: 2px;">Semarang , &nbsp;&nbsp;&nbsp;&nbsp;${tanggal}</p>
          <p style="font-weight: bold; margin-bottom: 60px;">Pelapor</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // 2. LAPORAN HARIAN KHUSUS (LHK)
  if (templateType === "laporan-harian-khusus") {
    const tanggal = escapeHtml(reportData.tanggal || "");
    const judul = escapeHtml(reportData.judul || reportData.perihal || "");
    const bidang = escapeHtml(reportData.bidang || "");
    const perihal = escapeHtml(reportData.perihal || "");

    return `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Laporan Harian Khusus</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="kop-header">
        <p class="line-1">KEPOLISIAN NEGARA REPUBLIK INDONESIA</p>
        <p class="line-2">DAERAH JAWA TENGAH</p>
        <p class="line-2">RESOR KOTA BESAR SEMARANG</p>
        <p class="line-3">SEKTOR TEMBALANG</p>
        <p class="line-addr">Jalan Turus Asri No. 9 Tembalang Semarang</p>
        <div class="kop-divider"></div>
      </div>

      <div class="doc-title-container">
        <p class="doc-subtitle">Nomor : R / LHK / &nbsp;&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;&nbsp; / Intelkam</p>
        <h1 class="doc-title-main">LAPORAN HARIAN KHUSUS</h1>
        <p style="font-weight: bold; margin-top: 4px; text-transform: uppercase;">TENTANG<br>${judul}</p>
      </div>

      ${bidang || perihal ? `
      <table class="meta-table">
        ${bidang ? `
        <tr>
          <td style="width: 110px; font-weight: bold;">BIDANG</td>
          <td style="width: 15px; text-align: center; font-weight: bold;">:</td>
          <td style="font-weight: bold; text-transform: uppercase;">${bidang}</td>
        </tr>` : ""}
        ${perihal ? `
        <tr>
          <td style="font-weight: bold;">PERIHAL</td>
          <td style="text-align: center; font-weight: bold;">:</td>
          <td style="font-weight: bold; text-transform: uppercase; text-align: justify;">${perihal}</td>
        </tr>` : ""}
      </table>` : ""}

      <div class="section-title">I. PERISTIWA / FAKTA-FAKTA :</div>
      <div style="text-align: justify; margin-bottom: 14px;">
        ${formatMultilineText(finalIsiLaporan, "12px")}
      </div>

      <div class="section-title">II. PENDAPAT / CATATAN :</div>
      <div style="margin-left: 12px; margin-bottom: 14px;">
        <p style="font-weight: bold; margin-bottom: 2px;">Analisis :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.analisa, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">Prediksi Intelijen :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.prediksi, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">Langkah – Langkah :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.langkah, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">Rekomendasi :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.rekomendasi, "20px")}</div>
      </div>

      <div class="signoff-container">
        <div class="signoff-left">
          <p style="margin: 0;">Authentikasi : .......................</p>
          <p style="font-weight: bold; margin-top: 8px; margin-bottom: 2px;">Distribusi:</p>
          <p style="margin: 0;">Kasatintelkam Polrestabes Semarang</p>
          <p style="margin: 0;">Kapolsek Tembalang</p>
        </div>
        <div class="signoff-right">
          <p style="margin-bottom: 2px;">Semarang , &nbsp;&nbsp;&nbsp;&nbsp;${tanggal}</p>
          <p style="font-weight: bold; margin-bottom: 60px;">Unit IK</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // 3. INFORMASI KHUSUS (INFOSUS)
  if (templateType === "infosus") {
    const tanggal = escapeHtml(reportData.tanggal || "");
    const perihalJudul = escapeHtml(reportData.perihal_judul || reportData.perihal || "");
    const perihal = escapeHtml(reportData.perihal || "");
    const faktaFakta = reportData.fakta_fakta || finalIsiLaporan;

    return `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Informasi Khusus</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="kop-header">
        <p class="line-1">POLRI DAERAH JAWA TENGAH</p>
        <p class="line-2">RESOR KOTA BESAR SEMARANG</p>
        <p class="line-3">SEKTOR TEMBALANG</p>
        <p class="line-addr">Jalan Turus Asri No. 9, Semarang 50245</p>
        <div class="kop-divider"></div>
      </div>

      <div class="doc-title-container">
        <p class="doc-subtitle">Nomor: R / INFOSUS / &nbsp;&nbsp;&nbsp;&nbsp; / IV / Ren.4.1.1. / 2026 / Intelkam</p>
        <h1 class="doc-title-main">INFORMASI KHUSUS</h1>
        <p style="font-weight: bold; margin-top: 4px; text-transform: uppercase;">TENTANG<br>${perihalJudul}</p>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 100px; font-weight: bold;">TANGGAL</td>
          <td style="width: 15px; text-align: center; font-weight: bold;">:</td>
          <td style="font-weight: bold;">${tanggal}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">PERIHAL</td>
          <td style="text-align: center; font-weight: bold;">:</td>
          <td style="font-weight: bold; text-align: justify;">${perihal}</td>
        </tr>
      </table>

      <div class="section-title">FAKTA – FAKTA :</div>
      <div style="text-align: justify; margin-bottom: 14px;">
        ${formatMultilineText(faktaFakta, "12px")}
      </div>

      <div class="section-title">CATATAN :</div>
      <div style="margin-left: 12px; margin-bottom: 14px;">
        <p style="font-weight: bold; margin-bottom: 2px;">Analisa :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.analisa, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">Prediksi :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.prediksi, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">Langkah - langkah kepolisian :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.langkah, "20px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">Rekomendasi :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.rekomendasi, "20px")}</div>
      </div>

      <div class="signoff-container">
        <div class="signoff-left">
          <p style="margin: 0;">Authentikasi : .......................</p>
          <p style="font-weight: bold; margin-top: 8px; margin-bottom: 2px;">Distribusi:</p>
          <p style="margin: 0;">1. Kapolsek Tembalang.</p>
          <p style="margin: 0;">2. Kasatintelkam Polrestabes Semarang.</p>
        </div>
        <div class="signoff-right">
          <p style="margin-bottom: 2px;">Semarang, &nbsp;&nbsp;&nbsp;&nbsp;${tanggal}</p>
          <p style="font-weight: bold; margin-bottom: 60px;">UNIT INTELKAM</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // 4. LAPORAN HARIAN INTELIJEN (LAPHAR / LHI)
  if (templateType === "laporan-harian-intelijen") {
    const nomorLaporan = escapeHtml(reportData.nomor_laporan || "R/LHI/ / /REN.4.1.1./2026/Intelkam");
    const hari = escapeHtml(reportData.hari || "");
    const tanggal = escapeHtml(reportData.tanggal || "");
    const tanggalTtd = escapeHtml(reportData.tanggal_ttd || reportData.tanggal || "");

    const sembakoItems = [
      { no: "1", name: "Beras Medium", key: "beras" },
      { no: "2", name: "Kedelai", key: "kedelai" },
      { no: "3", name: "Cabai Merah Besar", key: "cabai_merah" },
      { no: "", name: "Rawit Merah", key: "cabai_rawit" },
      { no: "", name: "Cabai Tampar", key: "cabai_tampar" },
      { no: "4", name: "Bawang Merah", key: "bawang_merah" },
      { no: "", name: "Bawang Putih", key: "bawang_putih" },
      { no: "5", name: "Jagung", key: "jagung" },
      { no: "6", name: "Gula Pasir", key: "gula" },
      { no: "7", name: "Minyak Goreng", key: "minyak" },
      { no: "8", name: "Tepung Terigu", key: "terigu" },
      { no: "9", name: "Daging Sapi Lokal", key: "daging_sapi" },
      { no: "10", name: "Daging Ayam Ras", key: "daging_ayam" },
      { no: "11", name: "Telur Ayam Ras", key: "telur" },
      { no: "12", name: "Garam", key: "garam" },
      { no: "13", name: "Gas LPG 3 Kg", key: "lpg" },
    ];

    const sembakoRowsHtml = sembakoItems.map(item => {
      const kemarin = escapeHtml(reportData[`${item.key}_kemarin`] || "");
      const hariIni = escapeHtml(reportData[`${item.key}_hari_ini`] || "");
      const selisih = escapeHtml(reportData[`${item.key}_selisih`] || "-");
      return `
        <tr>
          <td style="text-align: center; font-weight: ${item.no ? 'bold' : 'normal'};">${item.no}</td>
          <td>${item.name}</td>
          <td style="text-align: right;">${kemarin}</td>
          <td style="text-align: right;">${hariIni}</td>
          <td style="text-align: center; font-weight: bold;">${selisih}</td>
        </tr>
      `;
    }).join("");

    return `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Laporan Harian Intelijen</title>
      <style>
        ${baseStyles}
        body {
          font-family: 'Arial Narrow', Arial, sans-serif;
          font-size: 11pt;
        }
      </style>
    </head>
    <body>
      <div class="kop-header">
        <p class="line-1">POLRI DAERAH JAWA TENGAH</p>
        <p class="line-2">RESOR KOTA BESAR SEMARANG</p>
        <p class="line-3">POLSEK TEMMBALANG</p>
        <p class="line-addr">Jl. Turus Asri No. 9 Tembalang Semarang</p>
        <div class="kop-divider"></div>
      </div>

      <div style="margin-bottom: 8px;">
        <span>Nomor: ${nomorLaporan}</span>
      </div>

      <div class="doc-title-container" style="margin: 10px 0 16px 0;">
        <h1 class="doc-title-main">LAPORAN HARIAN INTELIJEN</h1>
        <p class="doc-subtitle" style="font-weight: bold; margin-top: 4px;">Hari ${hari}, Tanggal ${tanggal}</p>
      </div>

      <div class="section-title">I. PENDAHULUAN</div>
      <div style="margin-left: 12px; margin-bottom: 12px;">
        <p style="font-weight: bold; margin-bottom: 2px;">A. Perkembangan Lingkungan Strategis</p>
        <div style="margin-left: 12px;">
          <p style="font-weight: bold; margin-bottom: 2px;">1. Bidang Politik :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.pendahuluan_politik, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">2. Bidang Sosial Budaya :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.pendahuluan_sosbud, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">3. Bidang Ekonomi :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.pendahuluan_ekonomi, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">4. Bidang Keamanan :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.pendahuluan_keamanan, "16px")}</div>
        </div>
      </div>

      <div class="section-title">II. HASIL PENYELIDIKAN, PENGAMANAN DAN PENGGALANGAN</div>
      <div style="margin-left: 12px; margin-bottom: 12px;">
        <p style="font-weight: bold; margin-bottom: 2px;">A. Bidang Sosial Politik :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.fakta_sosial_politik, "16px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">B. Bidang Sosial Ekonomi :</p>
        <div style="margin-bottom: 6px;">${formatMultilineText(reportData.fakta_sosial_ekonomi_intro, "16px")}</div>
        
        <table class="table-data" style="margin-left: 16px; width: calc(100% - 16px);">
          <thead>
            <tr>
              <th style="width: 35px;">NO</th>
              <th>NAMA BARANG</th>
              <th style="width: 120px;">KEMARIN</th>
              <th style="width: 120px;">HARI INI</th>
              <th style="width: 90px;">NAIK/TURUN</th>
            </tr>
          </thead>
          <tbody>
            ${sembakoRowsHtml}
          </tbody>
        </table>

        <p style="font-weight: bold; margin-bottom: 2px;">C. Bidang Sosial Budaya :</p>
        <div style="margin-bottom: 8px;">${formatMultilineText(reportData.fakta_sosial_budaya, "16px")}</div>

        <p style="font-weight: bold; margin-bottom: 2px;">D. Bidang Keamanan :</p>
        <div style="margin-left: 12px;">
          <p style="font-weight: bold; margin-bottom: 2px;">1. Kriminalitas :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.kriminalitas_text, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">2. Laka Lantas :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.laka_lantas_text, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">3. Tahanan :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.tahanan_text, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">4. Bencana Alam :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.bencana_alam_text, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">5. Pengamanan VVIP/VIP :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.vvip_text, "16px")}</div>

          <p style="font-weight: bold; margin-bottom: 2px;">6. Lain-lain :</p>
          <div style="margin-bottom: 6px;">${formatMultilineText(reportData.lain_lain_text, "16px")}</div>
        </div>
      </div>

      <div class="section-title">III. PENUTUP</div>
      <p style="margin-left: 12px; margin-bottom: 16px; text-align: justify;">
        Demikian Laporan Harian Intelijen ini dibuat sebagai bahan masukan dan pertimbangan pimpinan dalam mengambil langkah kebijakan lebih lanjut.
      </p>

      <div class="signoff-container">
        <div class="signoff-left">
          <p style="margin: 0;">Autentikasi : .......................</p>
          <p style="font-weight: bold; margin-top: 8px; margin-bottom: 2px;">Distribusi:</p>
          <p style="margin: 0;">1. Sat Intelkam Polrestabes Semarang</p>
          <p style="margin: 0;">2. Kapolsek Tembalang</p>
        </div>
        <div class="signoff-right">
          <p style="margin-bottom: 2px;">Semarang, &nbsp;&nbsp;&nbsp;&nbsp;${tanggalTtd}</p>
          <p style="font-weight: bold; margin: 0;">a.n. KAPOLSEK TEMBALANG</p>
          <p style="font-weight: bold; margin-bottom: 60px;">PS. KANIT INTELKAM</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // 5. RENCANA KEGIATAN (REN)
  if (templateType === "rencana-kegiatan") {
    const hariTanggal = escapeHtml(reportData.hari_tanggal || "");
    const tanggalTtd = escapeHtml(reportData.tanggal_ttd || reportData.hari_tanggal || "");
    const jabatanTtd = escapeHtml(reportData.jabatan_ttd || "PS. KANIT INTELKAM");
    const namaTtd = escapeHtml(reportData.nama_ttd || "YUDHA M.P.");
    const pangkatNrpTtd = escapeHtml(reportData.pangkat_nrp_ttd || "AIPTU NRP 79040182");

    const kegiatanRowsHtml = (reportData.kegiatan_list || []).map((item, idx) => {
      const no = escapeHtml(String(item.no || idx + 1));
      const waktuLokasi = formatMultilineText(item.waktu_lokasi, "0px");
      const kegiatan = formatMultilineText(item.kegiatan, "0px");
      const hasil = formatMultilineText(item.hasil, "0px");
      const ket = escapeHtml(item.ket || "");
      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${no}</td>
          <td>${waktuLokasi}</td>
          <td>${kegiatan}</td>
          <td>${hasil}</td>
          <td style="text-align: center;">${ket}</td>
        </tr>
      `;
    }).join("");

    return `<!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Rencana Kegiatan</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="kop-header">
        <p class="line-1">POLRI DAERAH JAWA TENGAH</p>
        <p class="line-2">RESOR KOTA BESAR SEMARANG</p>
        <p class="line-3">SEKTOR TEMBALANG</p>
        <div class="kop-divider"></div>
      </div>

      <div class="doc-title-container">
        <h1 class="doc-title-main" style="border-bottom: none; font-size: 13pt;">RENCANA KEGIATAN ANGGOTA UNIT INTELKAM</h1>
        <p style="font-weight: bold; margin-top: 6px; text-transform: uppercase; font-size: 11pt;">
          HARI / TANGGAL : ${hariTanggal}
        </p>
      </div>

      <table class="table-data" style="margin-top: 14px;">
        <thead>
          <tr>
            <th style="width: 35px;">NO</th>
            <th style="width: 180px;">WAKTU / LOKASI</th>
            <th>KEGIATAN</th>
            <th>HASIL YANG INGIN DICAPAI</th>
            <th style="width: 60px;">KET</th>
          </tr>
        </thead>
        <tbody>
          ${kegiatanRowsHtml}
        </tbody>
      </table>

      <div class="signoff-container">
        <div class="signoff-left"></div>
        <div class="signoff-right">
          <p style="margin-bottom: 2px;">Semarang, &nbsp;&nbsp;&nbsp;&nbsp;${tanggalTtd}</p>
          <p style="font-weight: bold; margin-bottom: 60px;">${jabatanTtd}</p>
          <p style="font-weight: bold; text-decoration: underline; margin-bottom: 0;">${namaTtd}</p>
          <p style="font-size: 9.5pt; margin-top: 2px;">${pangkatNrpTtd}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Fallback generic police report layout
  return `<!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="utf-8">
    <title>Laporan</title>
    <style>${baseStyles}</style>
  </head>
  <body>
    <div class="doc-title-container">
      <h1 class="doc-title-main">${escapeHtml(reportData.judul || "DOKUMEN LAPORAN")}</h1>
      <p class="doc-subtitle">Tanggal: ${escapeHtml(reportData.tanggal || "")}</p>
    </div>
    <div style="text-align: justify; margin-top: 20px;">
      ${formatMultilineText(finalIsiLaporan || reportData.kesimpulan, "0px")}
    </div>
  </body>
  </html>`;
}
