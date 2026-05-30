"use client";

import { motion } from "framer-motion";
import { Download, RotateCcw, FileSpreadsheet, MapPin, Calendar, FileText } from "lucide-react";

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
}

interface ReportPreviewProps {
  reportData: ReportData;
  templateType: string;
  onDownload: () => void;
  onReset: () => void;
  isDownloading: boolean;
}

export default function ReportPreview({
  reportData,
  templateType,
  onDownload,
  onReset,
  isDownloading,
}: ReportPreviewProps) {
  // Mapping template titles for the header display
  const templateTitles: Record<string, string> = {
    "laporan-informasi": "LAPORAN INFORMASI RESMI",
    "laporan-harian-khusus": "LAPORAN HARIAN KHUSUS (LHK)",
    "laporan-khusus-3": "LAPORAN KHUSUS - TIPE 3",
  };

  const currentTemplateTitle = templateTitles[templateType] || "DOKUMEN DOKUMENTASI LAPORAN";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glassmorphism rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Pratinjau Laporan Sukses Dibuat
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Dokumen Anda telah siap diunduh dalam format Microsoft Word (.docx).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900 active:scale-95 transition-all w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Generate Ulang</span>
          </button>
          
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all text-xs font-semibold shadow-lg shadow-neutral-950/10 dark:shadow-white/10 w-full sm:w-auto"
          >
            {isDownloading ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isDownloading ? "Mengekspor..." : "Unduh Dokumen (.docx)"}</span>
          </button>
        </div>
      </div>

      {/* Realistic Paper Document Sheet Preview (Light Mode Styling mimics A4 document) */}
      <div className="relative mx-auto rounded-2xl shadow-xl bg-white text-neutral-900 border border-neutral-200/80 p-8 sm:p-12 overflow-hidden select-text">
        {/* Document watermarking/top lines */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-neutral-900" />
        
        {templateType === "laporan-informasi" ? (
          /* High-Fidelity Police Laporan Informasi Preview matching Calibri spacing, font, and sizes */
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
            <div className="border-b border-neutral-300 pb-3 mb-4" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
              <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>POLRI DAERAH JAWA TENGAH</p>
              <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>RESOR KOTA BESAR SEMARANG</p>
              <p className="font-bold uppercase tracking-tight text-neutral-950" style={{ fontSize: "11.5pt" }}>SEKTOR TEMBALANG</p>
              <p className="text-neutral-500 font-sans" style={{ fontSize: "10pt" }}>Jl. Turus Asri no 9 Tembalang Semarang</p>
            </div>

            {/* Document Title Header */}
            <div className="text-center space-y-1 my-6" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
              <p className="font-semibold text-neutral-600 font-sans" style={{ fontSize: "11pt" }}>Nomor :  R  / LI / / /  / Intelkam</p>
              <h2 className="font-bold tracking-wide border-b-2 border-neutral-900 inline-block pb-0.5 text-neutral-950" style={{ fontSize: "14pt" }}>
                LAPORAN – INFORMASI
              </h2>
            </div>

            {/* Bidang and Perihal Metadata Table */}
            <div className="grid grid-cols-[80px_10px_1fr] gap-x-2 gap-y-2 border border-neutral-300 p-4 rounded-xl bg-neutral-50/50 font-sans" style={{ fontSize: "11pt" }}>
              <span className="font-bold text-neutral-500 uppercase tracking-wider self-start pt-0.5" style={{ fontSize: "9.5pt" }}>BIDANG</span>
              <span className="font-semibold text-neutral-400 self-start">:</span>
              <span className="font-bold text-neutral-900 uppercase" style={{ fontFamily: "Calibri, sans-serif" }}>{reportData.bidang}</span>

              <span className="font-bold text-neutral-500 uppercase tracking-wider self-start pt-0.5" style={{ fontSize: "9.5pt" }}>PERIHAL</span>
              <span className="font-semibold text-neutral-400 self-start">:</span>
              <span className="font-bold text-neutral-950 uppercase" style={{ fontFamily: "Calibri, sans-serif", fontSize: "11.5pt", lineHeight: "1.4" }}>{reportData.perihal}</span>
            </div>

            {/* PENDAHULUAN Section */}
            <div className="space-y-3">
              <h3 className="font-bold text-neutral-950 tracking-wide border-b border-neutral-200 pb-1 uppercase" style={{ fontSize: "12pt" }}>
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
                <span className="font-semibold text-neutral-950">{reportData["cara-mendapatkan-informasi"]}</span>

                <span className="text-neutral-500">4. Waktu mendapatkan Informasi</span>
                <span className="text-neutral-400">:</span>
                <span className="font-semibold text-neutral-950">{reportData["waktu-mendapatkan-informasi"]}</span>

                <span className="text-neutral-500">5. Nilai Informasi</span>
                <span className="text-neutral-400">:</span>
                <span className="font-semibold text-neutral-950">A – 1</span>
              </div>
            </div>

            {/* HAL-HAL YANG DILAPORKAN Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-neutral-950 tracking-wide border-b border-neutral-200 pb-1 uppercase" style={{ fontSize: "12pt" }}>
                HAL-HAL YANG DILAPORKAN
              </h3>
              
              <div className="space-y-4 pl-3 text-neutral-900 text-justify">
                <div className="flex items-start space-x-3">
                  <span className="font-bold text-neutral-950">A.</span>
                  <p style={{ textIndent: "0.25in" }}>{reportData.A}</p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="font-bold text-neutral-950">B.</span>
                  <div className="flex-grow whitespace-pre-line" style={{ textIndent: "0.25in" }}>{reportData.B}</div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="font-bold text-neutral-950">C.</span>
                  <div className="flex-grow whitespace-pre-line" style={{ textIndent: "0.25in" }}>{reportData.C}</div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="font-bold text-neutral-950">D.</span>
                  <div className="flex-grow whitespace-pre-line" style={{ textIndent: "0.25in" }}>{reportData.D}</div>
                </div>
              </div>
            </div>

            {/* PENDAPAT PELAPOR Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-neutral-950 tracking-wide border-b border-neutral-200 pb-1 uppercase" style={{ fontSize: "12pt" }}>
                PENDAPAT PELAPOR
              </h3>
              
              <div className="space-y-4 pl-3 text-neutral-900 text-justify">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-neutral-950">A. Analisa</span>
                  </div>
                  <p className="pl-4" style={{ textIndent: "0.25in" }}>{reportData.analisa}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-neutral-950">B. Prediksi</span>
                  </div>
                  <div className="whitespace-pre-line pl-4" style={{ textIndent: "0.25in" }}>{reportData.prediksi}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-neutral-950">C. Langkah-langkah</span>
                  </div>
                  <div className="whitespace-pre-line pl-4" style={{ textIndent: "0.25in" }}>{reportData.langkah}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-neutral-950">D. Rekomendasi</span>
                  </div>
                  <p className="pl-4" style={{ textIndent: "0.25in" }}>{reportData.rekomendasi}</p>
                </div>
              </div>
            </div>

            {/* Semarang date and Pelapor signoff */}
            <div className="pt-8 pl-3 flex justify-between items-start font-sans" style={{ fontSize: "11pt" }}>
              <div className="text-neutral-500 leading-relaxed" style={{ fontSize: "10pt" }}>
                <p className="font-bold uppercase tracking-wider text-neutral-600" style={{ fontSize: "9pt" }}>DISTRIBUSI :</p>
                <p>1. Kasat Intelkam Polrestabes Semarang.</p>
                <p>2. Kapolsek Tembalang.</p>
                <p className="font-mono mt-1" style={{ fontSize: "9pt" }}>Li_TBLG</p>
              </div>
              <div className="text-right space-y-12">
                <div style={{ fontFamily: "Calibri, sans-serif" }}>
                  <p className="text-neutral-800">Semarang , {reportData.tanggal}</p>
                  <p className="font-bold tracking-wide text-neutral-900">Pelapor</p>
                </div>
                <div className="w-32 border-b border-neutral-900 ml-auto" />
              </div>
            </div>
          </div>
        ) : (
          /* Basic Template Layout (Original) */
          <div className="space-y-8 max-w-2xl mx-auto font-serif">
            {/* Header */}
            <div className="text-center pb-6 border-b-2 border-neutral-800 space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 font-sans">
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
                  <p className="font-semibold text-neutral-950">{reportData.tanggal}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-neutral-400">Lokasi / TKP</p>
                  <p className="font-semibold text-neutral-950 truncate max-w-[150px]">{reportData.lokasi}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase text-neutral-400">Perihal / Kejadian</p>
                  <p className="font-semibold text-neutral-950 truncate max-w-[150px]">{reportData.judul}</p>
                </div>
              </div>
            </div>

            {/* Document Title Callout */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-neutral-400 font-sans">Perihal Utama:</p>
              <h2 className="text-base sm:text-lg font-bold text-neutral-950 leading-snug">
                {reportData.judul}
              </h2>
            </div>

            {/* Main Body Section */}
            <div className="space-y-3 leading-relaxed text-sm text-neutral-800 text-justify">
              <h3 className="text-xs font-bold uppercase text-neutral-400 font-sans tracking-wide pb-1 border-b border-neutral-100">
                A. Deskripsi & Rincian Fakta Lapangan
              </h3>
              {reportData.isi_laporan?.split("\n").map((paragraph, idx) => (
                paragraph.trim() && (
                  <p key={idx} className="indent-8 font-serif">
                    {paragraph}
                  </p>
                )
              ))}
            </div>

            {/* Conclusion Section */}
            <div className="space-y-3 leading-relaxed text-sm text-neutral-800 text-justify">
              <h3 className="text-xs font-bold uppercase text-neutral-400 font-sans tracking-wide pb-1 border-b border-neutral-100">
                B. Analisis, Rekomendasi & Kesimpulan
              </h3>
              {reportData.kesimpulan?.split("\n").map((paragraph, idx) => (
                paragraph.trim() && (
                  <p key={idx} className="indent-8 font-serif">
                    {paragraph}
                  </p>
                )
              ))}
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
