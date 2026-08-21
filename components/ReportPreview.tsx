"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, RotateCcw, FileSpreadsheet, MapPin, Calendar, FileText, Copy, CheckCircle2 } from "lucide-react";

interface ReportData {
  judul?: string;
  tanggal?: string;
  lokasi?: string;
  isi_laporan?: string;
  kesimpulan?: string;

  // Custom template fields for Laporan Informasi
  bidang?: string;
  perihal?: string;
  "cara-mendapatkan-informasi"?: string;
  "waktu-mendapatkan-informasi"?: string;
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  analisa?: string;
  prediksi?: string;
  langkah?: string;
  rekomendasi?: string;

  // Custom template fields for Laporan Harian
  E?: string;
  F?: string;
  kapolsek_nama?: string;

  // Infosus-specific fields
  perihal_judul?: string;
  fakta_fakta?: string;

  // Edit status flag
  is_edited_formatted?: boolean;

  [key: string]: any;
}

interface ReportPreviewProps {
  reportData: ReportData;
  templateType: string;
  onDownload: () => void;
  onDownloadPdf?: () => void;
  onReset: () => void;
  isDownloading: boolean;
  isDownloadingPdf?: boolean;
  onUpdateReportData?: (updatedData: ReportData) => void;
}

interface AutoResizeTextareaProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

const AutoResizeTextarea = ({
  value,
  onChange,
  className = "",
  style = {},
  placeholder = ""
}: AutoResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`resize-none overflow-hidden bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded outline-none transition-all w-full p-1 ${className}`}
      style={{ ...style, height: "auto" }}
    />
  );
};

export default function ReportPreview({
  reportData,
  templateType,
  onDownload,
  onDownloadPdf,
  onReset,
  isDownloading,
  isDownloadingPdf = false,
  onUpdateReportData,
}: ReportPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleFieldChange = (key: string, value: any) => {
    if (onUpdateReportData) {
      onUpdateReportData({
        ...reportData,
        [key]: value,
      });
    }
  };

  const handleKegiatanChange = (index: number, key: string, value: any) => {
    if (onUpdateReportData) {
      const list = [...(reportData.kegiatan_list || [])];
      list[index] = {
        ...list[index],
        [key]: value,
      };
      onUpdateReportData({
        ...reportData,
        kegiatan_list: list,
      });
    }
  };

  const getDisplayIsiLaporan = () => {
    if (reportData.isi_laporan) {
      return reportData.isi_laporan;
    }
    // Backward compatibility helper to combine old A, B, C, D fields
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
    return parts.join("\n\n");
  };

  // Mapping template titles for the header display
  const templateTitles: Record<string, string> = {
    "laporan-informasi": "LAPORAN INFORMASI RESMI",
    "laporan-kegiatan": "LAPORAN KEGIATAN POLSEK TEMBALANG",
    "laporan-harian-khusus": "LAPORAN HARIAN KHUSUS (LHK)",
    "laporan-khusus-3": "LAPORAN KHUSUS - TIPE 3",
    "laporan-harian": "LAPORAN HARIAN SITUASI KAMTIBMAS",
    "infosus": "INFORMASI KHUSUS (INFOSUS)",
  };

  const currentTemplateTitle = templateTitles[templateType] || "DOKUMEN DOKUMENTASI LAPORAN";

  const stripPrefix = (text: string | undefined, prefix: string) => {
    if (!text) return "";
    const trimmed = text.trim();
    const regex = new RegExp(`^${prefix}\\s*`, "i");
    return trimmed.replace(regex, "");
  };

  const getPlainReportText = () => {
    if (templateType === "laporan-harian") {
      return reportData.isi_laporan || "";
    }

    if (templateType === "infosus") {
      return `POLRI DAERAH JAWA TENGAH
RESOR KOTA BESAR SEMARANG
SEKTOR TEMBALANG
Jl. Turus Asri No. 9, Semarang 50245
======================================

Nomor : R / INFOSUS / / / Ren.4.1.1. / / Intelkam

INFORMASI KHUSUS
----------------
TANGGAL : ${reportData.tanggal || ""}

PERIHAL  : ${reportData.perihal || ""}

FAKTA – FAKTA :
${reportData.fakta_fakta || ""}

CATATAN :

Analisa
${reportData.analisa || ""}

Prediksi
${reportData.prediksi || ""}

Langkah - langkah kepolisian :
${reportData.langkah || ""}

Rekomendasi :
${reportData.rekomendasi || ""}

Semarang, ${reportData.tanggal || ""}
UNIT INTELKAM

Authentikasi :.......................

Distribusi :
1. Kapolsek Tembalang.
2. Kasatintelkam Polrestabes Semarang.`;
    }

    if (templateType === "laporan-informasi") {
      let mainBody = "";
      if (reportData.isi_laporan) {
        mainBody = reportData.isi_laporan;
      } else {
        const cleanA = stripPrefix(reportData.A, "A\\.");
        const cleanB = stripPrefix(reportData.B, "B\\.");
        const cleanC = stripPrefix(reportData.C, "C\\.");
        const cleanD = stripPrefix(reportData.D, "D\\.");
        const cleanE = stripPrefix(reportData.E, "E\\.");
        const cleanF = stripPrefix(reportData.F, "F\\.");

        const parts = [];
        if (cleanA) parts.push(`A. ${cleanA}`);
        if (cleanB) parts.push(`B. ${cleanB}`);
        if (cleanC) parts.push(`C. ${cleanC}`);
        if (cleanD) parts.push(`D. ${cleanD}`);
        if (cleanE) parts.push(`E. ${cleanE}`);
        if (cleanF) parts.push(`F. ${cleanF}`);
        mainBody = parts.join("\n\n");
      }

      return `POLRI DAERAH JAWA TENGAH
RESOR KOTA BESAR SEMARANG
SEKTOR TEMBALANG
Jl. Turus Asri no 9 Tembalang Semarang
======================================

Nomor : R / LI / / / / Intelkam

LAPORAN - INFORMASI
-------------------
BIDANG                      : ${reportData.bidang || ""}
PERIHAL                     : ${reportData.perihal || ""}

I. PENDAHULUAN
   1. Sumber Informasi          : Pelapor
   2. Hubungan dengan Sasaran   : -
   3. Cara Mendapatkan Info     : ${reportData["cara-mendapatkan-informasi"] || ""}
   4. Waktu Mendapatkan Info    : ${reportData["waktu-mendapatkan-informasi"] || ""}
   5. Nilai Informasi           : A - 1

II. HAL-HAL YANG DILAPORKAN
${mainBody}

III. PENDAPAT PELAPOR
   A. Analisa
      ${reportData.analisa || ""}

   B. Prediksi
      ${reportData.prediksi || ""}

   C. Langkah-langkah Antisipasi / Penanganan
      ${reportData.langkah || ""}

   D. Rekomendasi
      ${reportData.rekomendasi || ""}

Semarang, ${reportData.tanggal || ""}
PELAPOR`;
    }

    if (templateType === "laporan-harian-khusus") {
      let mainBody = reportData.isi_laporan || "";
      if (!mainBody) {
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
        mainBody = parts.join("\n\n");
      }

      return `KEPOLISIAN NEGARA REPUBLIK INDONESIA
DAERAH JAWA TENGAH
RESOR KOTA BESAR SEMARANG
SEKTOR TEMBALANG
Jalan Turus Asri No. 9 Tembalang Semarang
Nomor : R / LHK / / / / Intelkam

LAPORAN HARIAN KHUSUS

TENTANG

${(reportData.judul || "").toUpperCase()}

======================================

COPY KE :			DARI  :		COPIES

Semarang, ${reportData.tanggal || ""}
KEPOLISIAN NEGARA REPUBLIK INDONESIA
DAERAH JAWA TENGAH
RESOR KOTA BESAR SEMARANG
SEKTOR TEMBALANG
Jalan Turus Asri No. 9 Tembalang Semarang
Nomor : R / LHK / / / / Intelkam

LAPORAN HARIAN KHUSUS

Tanggal     :   ${reportData.tanggal || ""}
Bidang      :   ${reportData.bidang || ""}
Perihal     :   ${reportData.perihal || ""}

I. FAKTA – FAKTA :

${mainBody}

II. CATATAN :

Analisis
${reportData.analisa || ""}

Prediksi Intelijen
${reportData.prediksi || ""}

Langkah – Langkah
${reportData.langkah || ""}

Rekomendasi
${reportData.rekomendasi || ""}

Semarang, ${reportData.tanggal || ""}
Unit IK

Authentikasi :.......................

Distribusi:

Kasatintelkam Polrestabes Semarang
Kapolsek Tembalang`;
    }

    let mainBody = "";
    if (reportData.isi_laporan) {
      mainBody = reportData.isi_laporan;
    } else {
      const cleanA = stripPrefix(reportData.A, "A\\.");
      const cleanB = stripPrefix(reportData.B, "B\\.");
      const cleanC = stripPrefix(reportData.C, "C\\.");
      const cleanD = stripPrefix(reportData.D, "D\\.");
      const cleanE = stripPrefix(reportData.E, "E\\.");
      const cleanF = stripPrefix(reportData.F, "F\\.");

      const parts = [];
      if (cleanA) parts.push(`A. ${cleanA}`);
      if (cleanB) parts.push(`B. ${cleanB}`);
      if (cleanC) parts.push(`C. ${cleanC}`);
      if (cleanD) parts.push(`D. ${cleanD}`);
      if (cleanE) parts.push(`E. ${cleanE}`);
      if (cleanF) parts.push(`F. ${cleanF}`);
      mainBody = parts.join("\n\n");
    }

    const kapolsekNama = reportData.kapolsek_nama || "KOMPOL KRISTIYASTUTI HANDAYANI, S.H., M.H.";

    let perihal = reportData.perihal || "";
    if (templateType === "laporan-kegiatan" && /^laporan\s+kegiatan/i.test(perihal.trim())) {
      perihal = perihal.trim().replace(/^laporan\s+/i, "");
    }

    return `POLRESTABES SEMARANG
POLSEK TEMBALANG
=======================

Kepada Yth.
*KAPOLRESTABES SEMARANG*

Dari :
*KAPOLSEK TEMBALANG*

Perihal : *${perihal}*

Dilaporkan dengan hormat kepada Ka bahwa :

${mainBody}


*DUMP*

Kapolsek Tembalang
*${kapolsekNama}*

Tembusan:

1. Waka Polrestabes Semarang.
2. KabagOps Polrestabes Semarang.
3. KasatIntelkam Polrestabes Semarang.`;
  };

  const plainTextVal = reportData.is_edited_formatted
    ? (reportData.isi_laporan || "")
    : getPlainReportText();

  const handlePlainTextChange = (newVal: string) => {
    if (onUpdateReportData) {
      onUpdateReportData({
        ...reportData,
        isi_laporan: newVal,
        is_edited_formatted: true
      });
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(plainTextVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin teks:", err);
    }
  };

  const handleTextDownload = () => {
    const text = plainTextVal;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `laporan-${templateType === "laporan-harian" ? "harian" : "kegiatan"}-${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isLaporanKegiatan = templateType === "laporan-kegiatan" || templateType === "laporan-harian";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glassmorphism rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40 bg-white/40 dark:bg-neutral-900/35">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Pratinjau Laporan Sukses Dibuat (Dapat Diedit Langsung)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isLaporanKegiatan
                ? "Silakan edit teks di dalam kotak pratinjau sebelum menyalin atau mengunduh."
                : "Silakan sunting teks di bawah. Hasil edit akan langsung diterapkan saat diunduh."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 active:scale-95 transition-all w-full sm:w-auto shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Generate Ulang</span>
          </button>

          {isLaporanKegiatan ? (
            <>
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-accent text-white hover:opacity-90 active:scale-95 transition-all text-xs font-semibold shadow-lg shadow-accent/20 w-full sm:w-auto font-bold"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Laporan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTextDownload}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 active:scale-95 transition-all w-full sm:w-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Teks (.txt)</span>
              </button>
            </>
          ) : (
            <>
              {onDownloadPdf && (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  disabled={isDownloadingPdf || isDownloading}
                  className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-red-200/80 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100/80 dark:hover:bg-red-900/60 active:scale-95 disabled:opacity-50 transition-all text-xs font-bold w-full sm:w-auto shadow-sm"
                >
                  {isDownloadingPdf ? (
                    <span className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  )}
                  <span>{isDownloadingPdf ? "Membuat PDF..." : "Unduh PDF (.pdf)"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDownload}
                disabled={isDownloading || isDownloadingPdf}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-accent text-white hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all text-xs font-semibold shadow-lg shadow-accent/20 w-full sm:w-auto font-bold"
              >
                {isDownloading ? (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isDownloading ? "Mengekspor..." : "Unduh Word (.docx)"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Realistic Paper Document Sheet Preview (Light Mode Styling mimics A4 document) */}
      <div className="realistic-paper relative mx-auto rounded-2xl shadow-xl bg-white text-neutral-900 border border-neutral-200/80 p-8 sm:p-12 overflow-hidden select-text">
        {/* Document watermarking/top lines */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-accent" />

        {templateType === "laporan-informasi" || templateType === "laporan-harian-khusus" || templateType === "infosus" || templateType === "laporan-harian-intelijen" || templateType === "rencana-kegiatan" ? (
          /* High-Fidelity Police Laporan Informasi / LHK Preview matching Calibri spacing, font, and sizes */
          <div
            className="space-y-6 max-w-2xl mx-auto text-neutral-900 select-text"
            style={{
              fontFamily: "Calibri, 'Helvetica Neue', Arial, sans-serif",
              fontSize: "11.5pt",
              lineHeight: "1.5",
              textAlign: "justify"
            }}
          >
            {/* Top Sub-header (POLRI) */}
            {templateType === "rencana-kegiatan" ? (
              <div className="border-b border-neutral-300 pb-3 mb-4" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>POLRI DAERAH JAWA TENGAH</p>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>RESOR KOTA BESAR SEMARANG</p>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>SEKTOR TEMBALANG</p>
              </div>
            ) : templateType === "laporan-harian-intelijen" ? (
              <div className="border-b border-neutral-300 pb-3 mb-4" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>POLRI DAERAH JAWA TENGAH</p>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>RESOR KOTA BESAR SEMARANG</p>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>POLSEK TEMMBALANG</p>
                <p className="text-neutral-500 font-sans" style={{ fontSize: "10pt" }}>Jl. Turus Asri No. 9 Tembalang Semarang</p>
              </div>
            ) : (
              <div className="border-b border-neutral-300 pb-3 mb-4" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>POLRI DAERAH JAWA TENGAH</p>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>RESOR KOTA BESAR SEMARANG</p>
                <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>SEKTOR TEMBALANG</p>
                <p className="text-neutral-500 font-sans" style={{ fontSize: "10pt" }}>Jl. Turus Asri no 9 Tembalang Semarang</p>
              </div>
            )}

            {/* Document Title Header */}
            {templateType === "rencana-kegiatan" ? (
              <div className="text-center space-y-3 my-6" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                <h2 className="font-bold tracking-wider inline-block text-neutral-955 uppercase" style={{ fontSize: "13pt" }}>
                  RENCANA KEGIATAN ANGGOTA UNIT INTELKAM
                </h2>
                <div className="flex items-center">
                  <span className="font-bold text-neutral-900 uppercase whitespace-nowrap" style={{ fontSize: "11pt" }}>
                    HARI / TANGGAL :&nbsp;
                  </span>
                  <input
                    type="text"
                    value={reportData.hari_tanggal || ""}
                    onChange={(e) => handleFieldChange("hari_tanggal", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-bold text-neutral-900 uppercase w-full"
                    style={{ fontSize: "11pt" }}
                  />
                </div>
              </div>
            ) : templateType === "laporan-harian-intelijen" ? (
              <div className="space-y-4 font-sans">
                <div className="flex items-center text-left font-semibold text-neutral-800" style={{ fontSize: "11pt" }}>
                  <span className="whitespace-nowrap">Nomor:&nbsp;</span>
                  <input
                    type="text"
                    value={reportData.nomor_laporan || ""}
                    onChange={(e) => handleFieldChange("nomor_laporan", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-800 w-full"
                  />
                </div>
                <div className="text-center my-6">
                  <h2 className="font-bold tracking-wide text-neutral-955 uppercase underline inline-block pb-0.5" style={{ fontSize: "14pt" }}>
                    LAPORAN HARIAN INTELIJEN
                  </h2>
                  <div className="flex items-center justify-center font-semibold text-neutral-700 text-center" style={{ fontSize: "11pt" }}>
                    <span>Hari&nbsp;</span>
                    <input
                      type="text"
                      value={reportData.hari || ""}
                      onChange={(e) => handleFieldChange("hari", e.target.value)}
                      className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-700 text-center w-24"
                    />
                    <span>,&nbsp;tanggal&nbsp;</span>
                    <input
                      type="text"
                      value={reportData.tanggal || ""}
                      onChange={(e) => handleFieldChange("tanggal", e.target.value)}
                      className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-700 text-center w-48"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-1 my-6" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                {templateType === "laporan-harian-khusus" ? (
                  <>
                    <p className="font-semibold text-neutral-600 font-sans" style={{ fontSize: "11pt" }}>Nomor : R / LHK / / / / Intelkam</p>
                    <h2 className="font-bold tracking-wide border-b-2 border-neutral-900 inline-block pb-0.5 text-neutral-955" style={{ fontSize: "14pt" }}>
                      LAPORAN HARIAN KHUSUS
                    </h2>
                  </>
                ) : templateType === "infosus" ? (
                  <>
                    <p className="font-semibold text-neutral-600 font-sans" style={{ fontSize: "11pt" }}>Nomor : R / INFOSUS / / / Ren.4.1.1. / / Intelkam</p>
                    <h2 className="font-bold tracking-wide border-b-2 border-neutral-900 inline-block pb-0.5 text-neutral-955" style={{ fontSize: "14pt" }}>
                      INFORMASI KHUSUS
                    </h2>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-neutral-600 font-sans" style={{ fontSize: "11pt" }}>Nomor :  R  / LI / / /  / Intelkam</p>
                    <h2 className="font-bold tracking-wide border-b-2 border-neutral-900 inline-block pb-0.5 text-neutral-955" style={{ fontSize: "14pt" }}>
                      LAPORAN – INFORMASI
                    </h2>
                  </>
                )}
              </div>
            )}

            {/* Metadata Table (For standard templates) */}
            {templateType !== "rencana-kegiatan" && templateType !== "laporan-harian-intelijen" && (
              templateType === "infosus" ? (
                <div className="grid grid-cols-[80px_10px_1fr] gap-x-2 gap-y-2 border border-neutral-300 p-4 rounded-xl bg-neutral-50/50 font-sans" style={{ fontSize: "11pt" }}>
                  <span className="font-bold text-neutral-500 uppercase tracking-wider self-start pt-0.5" style={{ fontSize: "9.5pt" }}>TANGGAL</span>
                  <span className="font-semibold text-neutral-400 self-start">:</span>
                  <input
                    type="text"
                    value={reportData.tanggal || ""}
                    onChange={(e) => handleFieldChange("tanggal", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-bold text-neutral-900 w-full"
                    style={{ fontFamily: "Calibri, sans-serif" }}
                  />

                  <span className="font-bold text-neutral-500 uppercase tracking-wider self-start pt-0.5" style={{ fontSize: "9.5pt" }}>PERIHAL</span>
                  <span className="font-semibold text-neutral-400 self-start">:</span>
                  <input
                    type="text"
                    value={reportData.perihal || ""}
                    onChange={(e) => handleFieldChange("perihal", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-bold text-neutral-955 w-full"
                    style={{ fontFamily: "Calibri, sans-serif", fontSize: "11.5pt", lineHeight: "1.4" }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-[80px_10px_1fr] gap-x-2 gap-y-2 border border-neutral-300 p-4 rounded-xl bg-neutral-50/50 font-sans" style={{ fontSize: "11pt" }}>
                  <span className="font-bold text-neutral-500 uppercase tracking-wider self-start pt-0.5" style={{ fontSize: "9.5pt" }}>BIDANG</span>
                  <span className="font-semibold text-neutral-400 self-start">:</span>
                  <input
                    type="text"
                    value={reportData.bidang || ""}
                    onChange={(e) => handleFieldChange("bidang", e.target.value.toUpperCase())}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-bold text-neutral-900 uppercase w-full"
                    style={{ fontFamily: "Calibri, sans-serif" }}
                  />

                  <span className="font-bold text-neutral-500 uppercase tracking-wider self-start pt-0.5" style={{ fontSize: "9.5pt" }}>PERIHAL</span>
                  <span className="font-semibold text-neutral-400 self-start">:</span>
                  <input
                    type="text"
                    value={reportData.perihal || ""}
                    onChange={(e) => handleFieldChange("perihal", e.target.value.toUpperCase())}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-bold text-neutral-955 uppercase w-full"
                    style={{ fontFamily: "Calibri, sans-serif", fontSize: "11.5pt", lineHeight: "1.4" }}
                  />
                </div>
              )
            )}

            {/* LHI Body Content */}
            {templateType === "laporan-harian-intelijen" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-neutral-955 tracking-wide border-b border-neutral-200 pb-1 uppercase text-left" style={{ fontSize: "12pt" }}>
                    PENDAHULUAN
                  </h3>
                  <div className="space-y-3 pl-3 mt-2 text-justify font-sans" style={{ fontSize: "11pt" }}>
                    <div className="flex flex-col space-y-1">
                      <strong>Bidang Politik:</strong>
                      <AutoResizeTextarea
                        value={reportData.pendahuluan_politik || ""}
                        onChange={(val) => handleFieldChange("pendahuluan_politik", val)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <strong>Bidang Sosial Budaya:</strong>
                      <AutoResizeTextarea
                        value={reportData.pendahuluan_sosbud || ""}
                        onChange={(val) => handleFieldChange("pendahuluan_sosbud", val)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <strong>Bidang Ekonomi:</strong>
                      <AutoResizeTextarea
                        value={reportData.pendahuluan_ekonomi || ""}
                        onChange={(val) => handleFieldChange("pendahuluan_ekonomi", val)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <strong>Bidang Keamanan:</strong>
                      <AutoResizeTextarea
                        value={reportData.pendahuluan_keamanan || ""}
                        onChange={(val) => handleFieldChange("pendahuluan_keamanan", val)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-neutral-955 tracking-wide border-b border-neutral-200 pb-1 uppercase text-left" style={{ fontSize: "12pt" }}>
                    FAKTA-FAKTA
                  </h3>
                  <div className="space-y-4 pl-3 mt-2 font-sans" style={{ fontSize: "11pt" }}>
                    <div>
                      <p className="font-bold text-neutral-900 uppercase text-left">Aspek Sosial</p>
                      <div className="pl-4 space-y-3 text-justify">
                        <div className="flex flex-col space-y-1">
                          <strong>1. Sosial Politik:</strong>
                          <AutoResizeTextarea
                            value={reportData.fakta_sosial_politik || ""}
                            onChange={(val) => handleFieldChange("fakta_sosial_politik", val)}
                          />
                        </div>
                        <div className="space-y-2">
                          <p><strong>2. Sosial Ekonomi:</strong></p>
                          <AutoResizeTextarea
                            value={reportData.fakta_sosial_ekonomi_intro || ""}
                            onChange={(val) => handleFieldChange("fakta_sosial_ekonomi_intro", val)}
                            placeholder="Pengantar sosial ekonomi..."
                          />
                          
                          <table className="w-full border-collapse border border-neutral-300 my-4 text-[10pt] font-sans">
                            <thead>
                              <tr className="bg-neutral-100 text-neutral-900 font-bold">
                                <th className="border border-neutral-300 p-1.5 text-center">NO</th>
                                <th className="border border-neutral-300 p-1.5 text-left">NAMA BARANG</th>
                                <th className="border border-neutral-300 p-1.5 text-right">KEMARIN</th>
                                <th className="border border-neutral-300 p-1.5 text-right">HARI INI</th>
                                <th className="border border-neutral-300 p-1.5 text-center">NAIK/TURUN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
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
                                { no: "13", name: "Gas LPG 3 Kg", key: "lpg" }
                              ].map((item, idx) => (
                                <tr key={idx} className="hover:bg-neutral-50/50">
                                  <td className="border border-neutral-300 p-1 text-center font-bold">{item.no}</td>
                                  <td className="border border-neutral-300 p-1">{item.name}</td>
                                  <td className="border border-neutral-300 p-1 text-right">
                                    <input
                                      type="text"
                                      value={reportData[`${item.key}_kemarin`] || ""}
                                      onChange={(e) => handleFieldChange(`${item.key}_kemarin`, e.target.value)}
                                      className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-right w-full"
                                    />
                                  </td>
                                  <td className="border border-neutral-300 p-1 text-right">
                                    <input
                                      type="text"
                                      value={reportData[`${item.key}_hari_ini`] || ""}
                                      onChange={(e) => handleFieldChange(`${item.key}_hari_ini`, e.target.value)}
                                      className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-right w-full"
                                    />
                                  </td>
                                  <td className="border border-neutral-300 p-1 text-center">
                                    <input
                                      type="text"
                                      value={reportData[`${item.key}_selisih`] || ""}
                                      onChange={(e) => handleFieldChange(`${item.key}_selisih`, e.target.value)}
                                      className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-center w-full font-semibold"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <strong>3. Sosial Budaya:</strong>
                          <AutoResizeTextarea
                            value={reportData.fakta_sosial_budaya || ""}
                            onChange={(val) => handleFieldChange("fakta_sosial_budaya", val)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-neutral-900 uppercase text-left">Aspek Keamanan</p>
                      <div className="pl-4 space-y-3 text-justify">
                        <p><strong>1. Keamanan Umum:</strong></p>
                        <div className="pl-4 flex flex-col space-y-1">
                          <span>a. Kriminalitas:</span>
                          <AutoResizeTextarea
                            value={reportData.kriminalitas_text || ""}
                            onChange={(val) => handleFieldChange("kriminalitas_text", val)}
                          />
                        </div>
                        <div className="pl-4 flex flex-col space-y-1">
                          <span>b. Laka Lantas:</span>
                          <AutoResizeTextarea
                            value={reportData.laka_lantas_text || ""}
                            onChange={(val) => handleFieldChange("laka_lantas_text", val)}
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <strong>2. Keamanan Khusus:</strong>
                          <AutoResizeTextarea
                            value={reportData.tahanan_text || ""}
                            onChange={(val) => handleFieldChange("tahanan_text", val)}
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <strong>3. Bencana Alam:</strong>
                          <AutoResizeTextarea
                            value={reportData.bencana_alam_text || ""}
                            onChange={(val) => handleFieldChange("bencana_alam_text", val)}
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <strong>4. Pengamanan VVIP/VIP:</strong>
                          <AutoResizeTextarea
                            value={reportData.vvip_text || ""}
                            onChange={(val) => handleFieldChange("vvip_text", val)}
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <strong>5. Lain-lain:</strong>
                          <AutoResizeTextarea
                            value={reportData.lain_lain_text || ""}
                            onChange={(val) => handleFieldChange("lain_lain_text", val)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rencana Kegiatan Body Content */}
            {templateType === "rencana-kegiatan" && (
              <div className="space-y-6">
                <table className="w-full border-collapse border border-neutral-300 my-4 text-[10.5pt] font-sans">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-900 font-bold">
                      <th className="border border-neutral-300 p-2 text-center" style={{ width: "40px" }}>NO</th>
                      <th className="border border-neutral-300 p-2 text-left" style={{ width: "220px" }}>WAKTU / LOKASI</th>
                      <th className="border border-neutral-300 p-2 text-left">KEGIATAN</th>
                      <th className="border border-neutral-300 p-2 text-left">HASIL YANG INGIN DICAPAI</th>
                      <th className="border border-neutral-300 p-2 text-center" style={{ width: "60px" }}>KET</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.kegiatan_list || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-50/50">
                        <td className="border border-neutral-300 p-2 text-center font-bold">
                          <input
                            type="text"
                            value={item.no || ""}
                            onChange={(e) => handleKegiatanChange(idx, "no", e.target.value)}
                            className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-center w-full font-bold"
                          />
                        </td>
                        <td className="border border-neutral-300 p-2">
                          <AutoResizeTextarea
                            value={item.waktu_lokasi || ""}
                            onChange={(val) => handleKegiatanChange(idx, "waktu_lokasi", val)}
                            className="w-full"
                          />
                        </td>
                        <td className="border border-neutral-300 p-2">
                          <AutoResizeTextarea
                            value={item.kegiatan || ""}
                            onChange={(val) => handleKegiatanChange(idx, "kegiatan", val)}
                            className="w-full"
                          />
                        </td>
                        <td className="border border-neutral-300 p-2">
                          <AutoResizeTextarea
                            value={item.hasil || ""}
                            onChange={(val) => handleKegiatanChange(idx, "hasil", val)}
                            className="w-full"
                          />
                        </td>
                        <td className="border border-neutral-300 p-2 text-center">
                          <input
                            type="text"
                            value={item.ket || ""}
                            onChange={(e) => handleKegiatanChange(idx, "ket", e.target.value)}
                            className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-center w-full"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PENDAHULUAN Section (Only for Laporan Informasi) */}
            {templateType === "laporan-informasi" && (
              <div className="space-y-3">
                <h3 className="font-bold text-neutral-955 tracking-wide border-b border-neutral-200 pb-1 uppercase" style={{ fontSize: "12pt" }}>
                  PENDAHULUAN
                </h3>
                <div className="grid grid-cols-[180px_10px_1fr] gap-x-2 gap-y-1.5 pl-3 font-sans text-neutral-800" style={{ fontSize: "11pt", fontFamily: "Calibri, sans-serif" }}>
                  <span className="text-neutral-500">1. Sumber Informasi</span>
                  <span className="text-neutral-400">:</span>
                  <span className="font-semibold text-neutral-950">Pelapor.</span>

                  <span className="text-neutral-500">2. Hubungan Sumber dengan sasaran</span>
                  <span className="text-neutral-400">:</span>
                  <span className="font-semibold text-neutral-950">-</span>

                  <span className="text-neutral-500">3. Cara mendapatkan Informasi</span>
                  <span className="text-neutral-400">:</span>
                  <input
                    type="text"
                    value={reportData["cara-mendapatkan-informasi"] || ""}
                    onChange={(e) => handleFieldChange("cara-mendapatkan-informasi", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-950 w-full"
                  />

                  <span className="text-neutral-500">4. Waktu mendapatkan Informasi</span>
                  <span className="text-neutral-400">:</span>
                  <input
                    type="text"
                    value={reportData["waktu-mendapatkan-informasi"] || ""}
                    onChange={(e) => handleFieldChange("waktu-mendapatkan-informasi", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-950 w-full"
                  />

                  <span className="text-neutral-500">5. Nilai Informasi</span>
                  <span className="text-neutral-400">:</span>
                  <span className="font-semibold text-neutral-950">A – 1</span>
                </div>
              </div>
            )}

            {/* HAL-HAL YANG DILAPORKAN / FAKTA-FAKTA Section */}
            {templateType !== "rencana-kegiatan" && templateType !== "laporan-harian-intelijen" && (
              <div className="space-y-4">
                <h3 className="font-bold text-neutral-955 tracking-wide border-b border-neutral-200 pb-1 uppercase" style={{ fontSize: "12pt" }}>
                  {templateType === "laporan-harian-khusus" ? "I. FAKTA – FAKTA :" : templateType === "infosus" ? "FAKTA – FAKTA :" : "HAL-HAL YANG DILAPORKAN"}
                </h3>

                <div className="pl-3 text-justify leading-relaxed">
                  {templateType === "infosus" ? (
                    <AutoResizeTextarea
                      value={reportData.fakta_fakta || ""}
                      onChange={(val) => handleFieldChange("fakta_fakta", val)}
                      className="font-serif"
                      style={{ textIndent: "0.25in" }}
                    />
                  ) : reportData.isi_laporan ? (
                    <AutoResizeTextarea
                      value={reportData.isi_laporan || ""}
                      onChange={(val) => handleFieldChange("isi_laporan", val)}
                      className="font-serif"
                      style={{ textIndent: "0.25in" }}
                    />
                  ) : (
                    <div className="space-y-3 font-serif">
                      {["A", "B", "C", "D", "E", "F"].map((letter) => {
                        const val = reportData[letter];
                        if (val === undefined || val === null) return null;
                        return (
                          <div key={letter} className="flex items-start space-x-1.5 w-full">
                            <span className="font-bold whitespace-nowrap pt-0.5">{letter}.</span>
                            <AutoResizeTextarea
                              value={stripPrefix(val, `${letter}\\\\.`)}
                              onChange={(newVal) => handleFieldChange(letter, `${letter}. ${newVal}`)}
                              className="w-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PENDAPAT PELAPOR / CATATAN Section */}
            {templateType !== "rencana-kegiatan" && templateType !== "laporan-harian-intelijen" && (
              <div className="space-y-4">
                <h3 className="font-bold text-neutral-955 tracking-wide border-b border-neutral-200 pb-1 uppercase" style={{ fontSize: "12pt" }}>
                  {templateType === "laporan-harian-khusus" ? "II. CATATAN :" : templateType === "infosus" ? "CATATAN :" : "PENDAPAT PELAPOR"}
                </h3>

                <div className="space-y-4 pl-3 text-neutral-900 text-justify">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-neutral-955">
                        {templateType === "laporan-harian-khusus" ? "Analisis" : templateType === "infosus" ? "Analisa" : "A. Analisa"}
                      </span>
                    </div>
                    <div className="pl-4">
                      <AutoResizeTextarea
                        value={reportData.analisa || ""}
                        onChange={(val) => handleFieldChange("analisa", val)}
                        className="font-sans text-[11pt]"
                        style={{ textIndent: "0.25in" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-neutral-955">
                        {templateType === "laporan-harian-khusus" ? "Prediksi Intelijen" : templateType === "infosus" ? "Prediksi" : "B. Prediksi"}
                      </span>
                    </div>
                    <div className="pl-4">
                      <AutoResizeTextarea
                        value={reportData.prediksi || ""}
                        onChange={(val) => handleFieldChange("prediksi", val)}
                        className="font-sans text-[11pt]"
                        style={{ textIndent: "0.25in" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-neutral-955">
                        {templateType === "laporan-harian-khusus" ? "Langkah – Langkah" : templateType === "infosus" ? "Langkah - langkah kepolisian :" : "C. Langkah-langkah"}
                      </span>
                    </div>
                    <div className="pl-4">
                      <AutoResizeTextarea
                        value={reportData.langkah || ""}
                        onChange={(val) => handleFieldChange("langkah", val)}
                        className="font-sans text-[11pt]"
                        style={{ textIndent: "0.25in" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-neutral-955">
                        {templateType === "laporan-harian-khusus" ? "Rekomendasi" : templateType === "infosus" ? "Rekomendasi :" : "D. Rekomendasi"}
                      </span>
                    </div>
                    <div className="pl-4">
                      <AutoResizeTextarea
                        value={reportData.rekomendasi || ""}
                        onChange={(val) => handleFieldChange("rekomendasi", val)}
                        className="font-sans text-[11pt]"
                        style={{ textIndent: "0.25in" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Semarang date and Pelapor/Sat intelkam signoff */}
            <div className="pt-8 pl-3 flex justify-between items-start font-sans" style={{ fontSize: "11pt" }}>
              {templateType === "rencana-kegiatan" ? (
                <>
                  <div></div>
                  <div className="text-center space-y-12">
                    <div style={{ fontFamily: "Calibri, sans-serif" }}>
                      <div className="flex items-center justify-end">
                        <span>Semarang,&nbsp;</span>
                        <input
                          type="text"
                          value={reportData.tanggal_ttd || ""}
                          onChange={(e) => handleFieldChange("tanggal_ttd", e.target.value)}
                          className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-left w-36 font-semibold"
                        />
                      </div>
                      <input
                        type="text"
                        value={reportData.jabatan_ttd || ""}
                        onChange={(e) => handleFieldChange("jabatan_ttd", e.target.value)}
                        className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-center font-bold tracking-wide text-neutral-955 w-full"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={reportData.nama_ttd || ""}
                        onChange={(e) => handleFieldChange("nama_ttd", e.target.value)}
                        className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-center font-bold underline text-neutral-955 leading-none w-full"
                      />
                      <input
                        type="text"
                        value={reportData.pangkat_nrp_ttd || ""}
                        onChange={(e) => handleFieldChange("pangkat_nrp_ttd", e.target.value)}
                        className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-center text-neutral-700 text-xs w-full font-semibold"
                      />
                    </div>
                  </div>
                </>
              ) : templateType === "laporan-harian-intelijen" ? (
                <>
                  <div className="text-neutral-500 leading-relaxed text-left font-semibold" style={{ fontSize: "10pt" }}>
                    <p className="mb-2">Autentikasi :.......................</p>
                    <p className="font-bold uppercase tracking-wider text-neutral-600 mt-2" style={{ fontSize: "9pt" }}>Distribusi:</p>
                    <p>1. Sat Intelkam Polrestabes Semarang</p>
                    <p>2. Kapolsek Tembalang</p>
                  </div>
                  <div className="text-center space-y-12">
                    <div style={{ fontFamily: "Calibri, sans-serif" }}>
                      <div className="flex items-center justify-end">
                        <span>Semarang,&nbsp;</span>
                        <input
                          type="text"
                          value={reportData.tanggal_ttd || ""}
                          onChange={(e) => handleFieldChange("tanggal_ttd", e.target.value)}
                          className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-left w-36 font-semibold"
                        />
                      </div>
                      <p className="font-bold tracking-wide text-neutral-955">UNIT INTELKAM</p>
                    </div>
                  </div>
                </>
              ) : templateType === "laporan-harian-khusus" || templateType === "infosus" ? (
                <>
                  <div className="text-neutral-500 leading-relaxed font-semibold" style={{ fontSize: "10pt" }}>
                    <p className="mb-2">Authentikasi :.......................</p>
                    <p className="font-bold uppercase tracking-wider text-neutral-600 mt-2" style={{ fontSize: "9pt" }}>Distribusi:</p>
                    {templateType === "infosus" ? (
                      <>
                        <p>1. Kapolsek Tembalang.</p>
                        <p>2. Kasatintelkam Polrestabes Semarang.</p>
                      </>
                    ) : (
                      <>
                        <p>Kasatintelkam Polrestabes Semarang</p>
                        <p>Kapolsek Tembalang</p>
                      </>
                    )}
                  </div>
                  <div className="text-right space-y-12">
                    <div style={{ fontFamily: "Calibri, sans-serif" }}>
                      <div className="flex items-center justify-end font-semibold">
                        <span>Semarang ,&nbsp;</span>
                        <input
                          type="text"
                          value={reportData.tanggal || ""}
                          onChange={(e) => handleFieldChange("tanggal", e.target.value)}
                          className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-left w-36 font-semibold"
                        />
                      </div>
                      <p className="font-bold tracking-wide text-neutral-900">{templateType === "infosus" ? "UNIT INTELKAM" : "Unit IK"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-neutral-500 leading-relaxed font-semibold" style={{ fontSize: "10pt" }}>
                    <p className="font-bold uppercase tracking-wider text-neutral-600" style={{ fontSize: "9pt" }}>DISTRIBUSI :</p>
                    <p>1. Kasat Intelkam Polrestabes Semarang.</p>
                    <p>2. Kapolsek Tembalang.</p>
                    <p className="italic mt-1" style={{ fontSize: "9pt" }}>LI Cengli</p>
                  </div>
                  <div className="text-right space-y-12">
                    <div style={{ fontFamily: "Calibri, sans-serif" }}>
                      <div className="flex items-center justify-end font-semibold">
                        <span>Semarang ,&nbsp;</span>
                        <input
                          type="text"
                          value={reportData.tanggal || ""}
                          onChange={(e) => handleFieldChange("tanggal", e.target.value)}
                          className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-left w-36 font-semibold"
                        />
                      </div>
                      <p className="font-bold tracking-wide text-neutral-900">Pelapor</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : isLaporanKegiatan ? (
          /* Sleek Mono Space Plain Text Preview with Copy to Clipboard Integration */
          <div className="space-y-6 max-w-2xl mx-auto text-neutral-900 select-text">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-sans">Pratinjau Teks (WhatsApp / Telegram) - Silakan Sunting Langsung</span>
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-[11px] font-bold text-accent transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Laporan</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-2xl border border-neutral-200/40 dark:border-purple-950/40 bg-neutral-950 p-6 sm:p-8 font-mono text-xs leading-relaxed overflow-x-auto text-purple-300 dark:text-purple-300 shadow-xl shadow-purple-500/5 select-text">
              <textarea
                value={plainTextVal}
                onChange={(e) => handlePlainTextChange(e.target.value)}
                className="w-full min-h-[400px] bg-transparent text-purple-300 font-mono text-[11.5px] border border-transparent hover:border-purple-900/50 focus:border-purple-700/50 rounded outline-none p-2 resize-y whitespace-pre-wrap leading-relaxed select-text"
              />
            </div>
          </div>
        ) : (
          /* Basic Template Layout (Original) */
          <div className="space-y-8 max-w-2xl mx-auto font-serif">
            {/* Header */}
            <div className="text-center pb-6 border-b-2 border-neutral-800 space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-955 font-sans">
                {currentTemplateTitle}
              </h1>
              <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-neutral-500 font-sans">
                AI REPORT GENERATOR SYSTEM • DOKUMEN RESMI
              </p>
            </div>

            {/* Meta Information Sheet */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans text-neutral-600 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-neutral-400">Tanggal Laporan</p>
                  <input
                    type="text"
                    value={reportData.tanggal || ""}
                    onChange={(e) => handleFieldChange("tanggal", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-950 truncate max-w-[150px]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-neutral-400">Lokasi / TKP</p>
                  <input
                    type="text"
                    value={reportData.lokasi || ""}
                    onChange={(e) => handleFieldChange("lokasi", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-955 truncate max-w-[150px]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-neutral-400">Perihal / Kejadian</p>
                  <input
                    type="text"
                    value={reportData.judul || ""}
                    onChange={(e) => handleFieldChange("judul", e.target.value)}
                    className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all font-semibold text-neutral-955 truncate max-w-[150px]"
                  />
                </div>
              </div>
            </div>

            {/* Document Title Callout */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-neutral-400 font-sans">Perihal Utama:</p>
              <input
                type="text"
                value={reportData.judul || ""}
                onChange={(e) => handleFieldChange("judul", e.target.value)}
                className="bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent hover:bg-neutral-50/50 focus:bg-neutral-50/50 rounded px-1 outline-none transition-all text-base sm:text-lg font-bold text-neutral-955 leading-snug w-full"
              />
            </div>

            {/* Main Body Section */}
            <div className="space-y-3 leading-relaxed text-sm text-neutral-800 text-justify">
              <h3 className="text-xs font-bold uppercase text-neutral-400 font-sans tracking-wide pb-1 border-b border-neutral-100">
                A. Deskripsi & Rincian Fakta Lapangan
              </h3>
              <AutoResizeTextarea
                value={reportData.isi_laporan || ""}
                onChange={(val) => handleFieldChange("isi_laporan", val)}
                className="font-serif indent-8 w-full"
              />
            </div>

            {/* Conclusion Section */}
            <div className="space-y-3 leading-relaxed text-sm text-neutral-800 text-justify">
              <h3 className="text-xs font-bold uppercase text-neutral-400 font-sans tracking-wide pb-1 border-b border-neutral-100">
                B. Analisis, Rekomendasi & Kesimpulan
              </h3>
              <AutoResizeTextarea
                value={reportData.kesimpulan || ""}
                onChange={(val) => handleFieldChange("kesimpulan", val)}
                className="font-serif indent-8 w-full"
              />
            </div>

            {/* Signature/Signoff area */}
            <div className="pt-12 flex justify-between items-end font-sans text-xs text-neutral-500">
              <div>
                <p>Dokumentasi Digital AI</p>
                <p className="text-[10px] text-neutral-400">ID Sesi: {Date.now().toString().slice(-6)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-neutral-800">SISTEM AI GENERATOR</p>
                <p className="italic text-[10px] text-neutral-400">Terverifikasi Secara Elektronik</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
