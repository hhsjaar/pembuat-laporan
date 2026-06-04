"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Sun, Moon, AlertCircle, FileText, ChevronRight, X, Volume2, Image as ImageIcon, PenTool, History, Check, Download, Copy, Clock, Search, Trash2, Eye } from "lucide-react";
import TemplateSelector, { TemplateType } from "./TemplateSelector";
import ImageUploader from "./ImageUploader";
import AudioUploader from "./AudioUploader";
import PdfUploader from "./PdfUploader";
import ProcessingModal, { ProcessingStep, StepId } from "./ProcessingModal";
import ReportPreview from "./ReportPreview";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const INITIAL_STEPS: ProcessingStep[] = [
  {
    id: "transcribe",
    label: "Transkripsi Rekaman Suara",
    description: "Mengonversi rekaman suara/audio menjadi teks bahasa baku melalui AI Whisper.",
    status: "idle",
  },
  {
    id: "parse-pdf",
    label: "Ekstraksi Panduan Acara (PDF)",
    description: "Membaca dan mengekstrak teks aturan/panduan dari berkas PDF acara.",
    status: "idle",
  },
  {
    id: "analyze-image",
    label: "Analisa Gambar Dokumen & Rundown",
    description: "Mengekstrak jadwal, rincian detail, latar belakang, dan susunan dari seluruh gambar dokumen.",
    status: "idle",
  },
  {
    id: "generate-report",
    label: "Formulasi Narasi Laporan AI",
    description: "Menggabungkan semua data ke dalam narasi dinas resmi formal bahasa Indonesia.",
    status: "idle",
  },
  {
    id: "export-docx",
    label: "Penyusunan Dokumen Word",
    description: "Menyuntikkan data hasil formulasi AI ke dalam berkas template .docx resmi.",
    status: "idle",
  },
];

const getIndoDayName = (date: Date): string => {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[date.getDay()];
};

const getIndoFormattedDate = (date: Date): string => {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function Dashboard() {
  // Theme state (system default fallback to light mode)
  const [darkMode, setDarkMode] = useState(false);

  // Form input states
  const [templateType, setTemplateType] = useState<TemplateType>("laporan-informasi");
  const [images, setImages] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [userInput, setUserInput] = useState("");

  // History tab states
  const [activeTab, setActiveTab] = useState<"generator" | "history">("generator");
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [isCopiedHistoryId, setIsCopiedHistoryId] = useState<string | null>(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    // Check configuration
    import("@/lib/supabase").then(({ isSupabaseConfigured }) => {
      setSupabaseConfigured(isSupabaseConfigured());
    });
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      } else {
        console.warn("Gagal mengambil riwayat laporan.");
      }
    } catch (err) {
      console.error("Gagal fetch riwayat:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/history?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("Laporan berhasil dihapus dari riwayat.", "success");
        setHistoryList(prev => prev.filter(item => item.id !== id));
      } else {
        addToast("Gagal menghapus laporan dari riwayat.", "error");
      }
    } catch (err) {
      console.error("Gagal menghapus item:", err);
      addToast("Terjadi kesalahan saat menghapus laporan.", "error");
    }
  };

  const handleCopyHistoryContent = (item: any) => {
    navigator.clipboard.writeText(item.content);
    setIsCopiedHistoryId(item.id);
    addToast("Isi laporan disalin ke papan klip!", "success");
    setTimeout(() => setIsCopiedHistoryId(null), 2000);
  };

  const handleDownloadHistoryTxt = (item: any) => {
    try {
      const element = document.createElement("a");
      const file = new Blob([item.content], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      const filename = `${item.template_type}-${item.id.slice(0, 8)}.txt`;
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      addToast("Berkas teks (.txt) berhasil diunduh!", "success");
    } catch (err) {
      console.error(err);
      addToast("Gagal mengunduh berkas teks.", "error");
    }
  };

  const handleDownloadHistoryDocx = async (item: any) => {
    const rawReport = item.meta_data?.raw_report;
    if (item.template_type !== "laporan-informasi" || !rawReport) {
      handleDownloadHistoryTxt(item);
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: item.template_type,
          reportData: rawReport,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengemas berkas Word dari riwayat.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${item.template_type}-${item.id.slice(0, 8)}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast("Berkas Microsoft Word (.docx) berhasil diunduh!", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Gagal mengunduh berkas Word.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const saveReportToHistory = async (report: any, type: string) => {
    try {
      let title = "";
      let body = "";
      let kapolsek = report.kapolsek_nama || "KOMPOL KRISTIYASTUTI HANDAYANI, S.H., M.H.";

      if (type === "laporan-informasi") {
        title = report.perihal || "LAPORAN INFORMASI";
        if (report.isi_laporan) {
          body = report.isi_laporan;
        } else {
          const parts = [];
          if (report.A) parts.push(`A. ${report.A}`);
          if (report.B) parts.push(`B. ${report.B}`);
          if (report.C) parts.push(`C. ${report.C}`);
          if (report.D) parts.push(`D. ${report.D}`);
          if (report.E) parts.push(`E. ${report.E}`);
          if (report.F) parts.push(`F. ${report.F}`);
          body = parts.join("\n\n");
        }
      } else if (type === "laporan-kegiatan") {
        title = report.perihal || "LAPORAN KEGIATAN";
        body = report.isi_laporan || "";
      } else if (type === "laporan-harian") {
        title = report.perihal || "LAPORAN HARIAN SITUASI KAMTIBMAS";
        body = report.isi_laporan || "";
      } else {
        title = report.judul || "LAPORAN RESMI";
        body = report.isi_laporan || "";
      }

      // Format report exactly as shown in ReportPreview.tsx (unless it's laporan-harian which is already pre-formatted by LLM)
      let formattedContent = body;
      if (type === "laporan-informasi") {
        const stripPrefix = (text: string, prefix: string) => {
          if (!text) return "";
          const trimmed = text.trim();
          const regex = new RegExp(`^${prefix}\\s*`, "i");
          return trimmed.replace(regex, "");
        };

        let mainBody = body;
        if (!report.isi_laporan) {
          const cleanA = stripPrefix(report.A, "A\\.");
          const cleanB = stripPrefix(report.B, "B\\.");
          const cleanC = stripPrefix(report.C, "C\\.");
          const cleanD = stripPrefix(report.D, "D\\.");
          const cleanE = stripPrefix(report.E, "E\\.");
          const cleanF = stripPrefix(report.F, "F\\.");
          
          const parts = [];
          if (cleanA) parts.push(`A. ${cleanA}`);
          if (cleanB) parts.push(`B. ${cleanB}`);
          if (cleanC) parts.push(`C. ${cleanC}`);
          if (cleanD) parts.push(`D. ${cleanD}`);
          if (cleanE) parts.push(`E. ${cleanE}`);
          if (cleanF) parts.push(`F. ${cleanF}`);
          mainBody = parts.join("\n\n");
        }

        formattedContent = `POLRI DAERAH JAWA TENGAH
RESOR KOTA BESAR SEMARANG
SEKTOR TEMBALANG
Jl. Turus Asri no 9 Tembalang Semarang
======================================

Nomor : R / LI / / / / Intelkam

LAPORAN - INFORMASI
-------------------
BIDANG                      : ${report.bidang || ""}
PERIHAL                     : ${title}

I. PENDAHULUAN
   1. Sumber Informasi          : Pelapor
   2. Hubungan dengan Sasaran   : -
   3. Cara Mendapatkan Info     : ${report["cara-mendapatkan-informasi"] || ""}
   4. Waktu Mendapatkan Info    : ${report["waktu-mendapatkan-informasi"] || ""}
   5. Nilai Informasi           : A - 1

II. HAL-HAL YANG DILAPORKAN
${mainBody}

III. PENDAPAT PELAPOR
   A. Analisa
      ${report.analisa || ""}

   B. Prediksi
      ${report.prediksi || ""}

   C. Langkah-langkah Antisipasi / Penanganan
      ${report.langkah || ""}

   D. Rekomendasi
      ${report.rekomendasi || ""}

Semarang, ${report.tanggal || ""}
PELAPOR`;
      } else if (type !== "laporan-harian") {
        formattedContent = `POLRESTABES SEMARANG
POLSEK TEMBALANG
================

Kepada Yth.
*KAPOLRESTABES SEMARANG*

Dari :
*KAPOLSEK TEMBALANG*

Perihal : *${title}*

${body}


*DUMP*

Kapolsek Tembalang
*${kapolsek}*

Tembusan:

1. Waka Polrestabes Semarang.
2. KabagOps Polrestabes Semarang.
3. KasatIntelkam Polrestabes Semarang.`;
      }

      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_type: type,
          perihal: title,
          content: formattedContent,
          kapolsek_nama: kapolsek,
          meta_data: {
            timestamp: new Date().toISOString(),
            date_input: report.tanggal || "",
            raw_report: report
          }
        })
      });
    } catch (err) {
      console.error("Gagal menyimpan ke riwayat:", err);
    }
  };

  // Custom states for Laporan Harian structured form input
  const [formTab, setFormTab] = useState<"umum" | "ekonomi" | "patroli" | "rencana">("umum");
  const [laporanHarianForm, setLaporanHarianForm] = useState({
    hari: "",
    tanggal: "",
    waktu: "08.00 s.d. 08.00 WIB",
    berasMin: "15.000", berasMax: "17.000",
    kedelaiMin: "9.000", kedelaiMax: "13.000",
    cabaiBesarMin: "40.000", cabaiBesarMax: "45.000",
    cabaiRawitMin: "90.000", cabaiRawitMax: "95.000",
    cabaiTamparMin: "35.000", cabaiTamparMax: "40.000",
    bawangMerahMin: "45.000", bawangMerahMax: "50.000",
    bawangPutihMin: "35.000", bawangPutihMax: "40.000",
    jagungMin: "8.000", jagungMax: "11.000",
    gulaMin: "17.500", gulaMax: "18.500",
    minyakMin: "15.700", minyakMax: "19.000",
    teriguMin: "10.000", teriguMax: "12.500",
    dagingSapiMin: "120.000", dagingSapiMax: "130.000",
    dagingAyamMin: "40.000", dagingAyamMax: "48.000",
    telurMin: "29.000", telurMax: "31.000",
    garamMin: "2.500", garamMax: "3.500",
    lpgMin: "18.000", lpgMax: "23.000",
    kriminalitas: "Tidak ada hal yang dapat dilaporkan.",
    lakaLantas: "Tidak ada hal yang dapat dilaporkan.",
    tahananL: "0",
    tahananP: "0",
    bencanaAlam: "Tidak ada hal yang dapat dilaporkan.",
    vvip: "Tidak ada kegiatan untuk dilaporkan.",
    patroliSiangWaktu: "11.00 Wib s/d Selesai.",
    patroliSiangCuaca: "CERAH",
    patroliSiangPersonil: "1. KOMPOL KRISTIYASTUTI HANDAYANI, S.H., M.H (Kapolsek)\n2. IPTU SUTANTO (Kanit Binmas)\n3. AIPTU. RF JATI P, S.H (Piket Samapta)",
    patroliSiangSasaran: "1. Tempat Rawan Kriminalitas, Balap liar dan tawuran.\n2. Pemukiman penduduk/Perumahan/Aspol\n3. Tempat ibadah di wilayah Tembalang\n4. Obvit, ATM dan SPBU di wilayah Tembalang.",
    patroliSiangRute: "Mako Polsek Tembalang-Jl. Imam Soeparto-Jl. Gondang Raya-Jl. Mulawarman Raya-Jl. Sirojudin-Jl. Prof. Soedarto, SH-Jl. Jatimulyo-Jl. Banjarsari-Jl. Imam Soeparto(Sigar Bencah)-Jl. Kompol R. Soekanto-Jl. Sambiroto Raya-Jl. Kedungmundu-Jl. Fatmawati-Jl. Ketileng Raya-Jl. Gendong Raya-Jl. Raya Sendangmulyo-Jl. Tunggu Raya-Jl. Rowosari-Jl. Prof. Suharso-Jl. Imam Soeparto (Sigar Bencah)-kembali Ke Mako Polsek Tembalang",
    patroliSiangHasil: "1. Selama pelaksanaant kegiatan patroli BLP tidak di temukan adanya balap liar dan tawuran.\n2. Tidak di temukan pengendara sepeda motor yang menggunakan knalpot yang tidak sesuai dengan spesifikasi teknis.\n3. Situasi kamtibmas secara umum wilayah hukum Polsek Tembalang dalam keadaan aman dan kondusif.",
    patroliMalamWaktu: "22.00 Wib s/d selesai",
    patroliMalamCuaca: "Cerah",
    patroliMalamPersonil: "1. AIPTU SANDRE MAKASAR (Piket Samapta)\n2. BRIPKA DIKA PRASETYA, S.Psi ( Piket Samapta)",
    patroliMalamSasaran: "1. Tempat Rawan Kriminalitas, Balap liar dan tawuran.\n2. Pemukiman penduduk/Perumahan\n3. Tempat ibadah di wilayah Tembalang\n4. Obvit, ATM dan SPBU di wilayah Tembalang",
    patroliMalamRute: "Mako Polsek Tembalang-Jl. Imam Soeparto-Jl. Gondang raya-Jl. Mulawarman selatan Raya-Jl. Banjarsari selatan-Jl. Baru Tembalang-Jangli-Jl. Banjarsari-Jl. Bulusan selatan raya-Jl. Baru Tembalang Jangli-Jl. Imam Soeparto-kembali Ke Mako Polsek Tembalang",
    patroliMalamHasil: "1. Selama pelaksanaan kegiatan patroli BLP tidak di temukan adanya balap liar dan tawuran.\n2. Tidak di temukan pengendara sepeda motor yang menggunakan knalpot yang tidak sesuai dengan spesifikasi teknis.\n3. Situasi kamtibmas secara umum wilayah hukum Polsek Tembalang dalam keadaan aman dan kondusif.",
    catatan: "Secara umum situasi di wilayah Hukum Polsek Tembalang dalam keadaan aman dan terkendali.",
    rencanaHari: "",
    rencanaTanggal: "",
    rencanaUnras: "NIHIL",
    rencanaGiatMenonjol: "NIHIL",
    rencanaPolitik: "NIHIL",
    rencanaGiatMasyarakat: "NIHIL",
    rencanaPersonil1: "Melaksanakan pam dan monitoring giat masyarakat di wilayah hukum Polsek Tembalang.",
    rencanaPersonil2: "Melaksanakan monitoring distribusi BBM, LPG serta Bahan kebutuhan pokok di wilayah hukum Polsek Tembalang.",
    rencanaPersonil3: "Melaksanakan Kegiatan Rutin dengan target yang dioptimalkan di wilayah hukum Polsek Tembalang dalam rangka menciptakan sitkamtibmas yang aman dan kondusif."
  });

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Result state
  const [reportData, setReportData] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Custom Toast notification states
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Initialize dates for Laporan Harian
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    setLaporanHarianForm((prev) => ({
      ...prev,
      hari: getIndoDayName(today),
      tanggal: getIndoFormattedDate(today),
      rencanaHari: getIndoDayName(tomorrow),
      rencanaTanggal: getIndoFormattedDate(tomorrow),
    }));
  }, []);

  // Detect and initialize theme on mount
  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" || 
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  };

  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // The sequential execution engine
  const handleGenerateReport = async () => {
    // Validation check: must have at least one upload or input (bypassed for laporan-harian)
    if (templateType !== "laporan-harian" && images.length === 0 && !pdfFile && !audioFile && !userInput.trim()) {
      addToast("Harap masukkan setidaknya satu input: gambar rundown, berkas PDF guidebook, rekaman suara, atau catatan teks.", "error");
      return;
    }

    // Safety checks for file size limits to prevent Vercel 413 Payload Too Large
    if (audioFile && audioFile.size > 150 * 1024 * 1024) {
      addToast("Ukuran berkas audio melebihi batas 150MB. Silakan gunakan berkas audio yang lebih kecil.", "error");
      return;
    }

    if (pdfFile && pdfFile.size > 4.2 * 1024 * 1024) {
      addToast("Ukuran berkas PDF melebihi batas 4.2MB untuk hosting Vercel. Silakan gunakan berkas PDF yang lebih kecil.", "error");
      return;
    }

    const totalImagesSize = images.reduce((acc, img) => acc + img.size, 0);
    if (totalImagesSize > 4.2 * 1024 * 1024) {
      addToast("Total ukuran gambar melebihi batas 4.2MB untuk hosting Vercel. Silakan kurangi jumlah gambar atau perkecil resolusinya.", "error");
      return;
    }

    // Reset step statuses
    const resetSteps = INITIAL_STEPS.map((step) => ({
      ...step,
      status: "idle" as const,
    }));
    setSteps(resetSteps);
    setIsProcessing(true);
    setCurrentStepIndex(0);

    let transcriptText = "";
    let pdfText = "";
    let imageAnalysisText = "";
    let generatedReport: any = null;

    try {
      // STEP 1: Audio Transcription (Whisper)
      if (audioFile) {
        updateStepStatus("transcribe", "running");
        const audioFormData = new FormData();
        audioFormData.append("file", audioFile);

        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          body: audioFormData,
        });

        if (!transcribeRes.ok) {
          let errorMessage = "Gagal melakukan transkripsi rekaman suara.";
          try {
            const errData = await transcribeRes.json();
            errorMessage = errData.error || errorMessage;
          } catch {
            try {
              const errText = await transcribeRes.text();
              errorMessage = errText || `Error ${transcribeRes.status}: ${transcribeRes.statusText}`;
            } catch {
              errorMessage = `Error ${transcribeRes.status}: ${transcribeRes.statusText}`;
            }
          }
          throw new Error(errorMessage);
        }

        const data = await transcribeRes.json();
        transcriptText = data.text;
        updateStepStatus("transcribe", "success");
      } else {
        updateStepStatus("transcribe", "success"); // Skip gracefully
      }

      setCurrentStepIndex(1);

      // STEP 2: PDF Guidebook Parsing
      if (pdfFile) {
        updateStepStatus("parse-pdf", "running");
        const pdfFormData = new FormData();
        pdfFormData.append("file", pdfFile);

        const pdfRes = await fetch("/api/parse-pdf", {
          method: "POST",
          body: pdfFormData,
        });

        if (!pdfRes.ok) {
          let errorMessage = "Gagal melakukan ekstraksi teks berkas PDF.";
          try {
            const errData = await pdfRes.json();
            errorMessage = errData.error || errorMessage;
          } catch {
            try {
              const errText = await pdfRes.text();
              errorMessage = errText || `Error ${pdfRes.status}: ${pdfRes.statusText}`;
            } catch {
              errorMessage = `Error ${pdfRes.status}: ${pdfRes.statusText}`;
            }
          }
          throw new Error(errorMessage);
        }

        const data = await pdfRes.json();
        pdfText = data.text;
        updateStepStatus("parse-pdf", "success");
      } else {
        updateStepStatus("parse-pdf", "success"); // Skip gracefully
      }

      setCurrentStepIndex(2);

      // STEP 3: Rundown Image Analysis (Gemini Vision)
      if (images.length > 0) {
        updateStepStatus("analyze-image", "running");
        const imageFormData = new FormData();
        images.forEach((img) => {
          imageFormData.append("images", img);
        });

        const analyzeRes = await fetch("/api/analyze-image", {
          method: "POST",
          body: imageFormData,
        });

        if (!analyzeRes.ok) {
          let errorMessage = "Gagal melakukan analisis gambar rundown.";
          try {
            const errData = await analyzeRes.json();
            errorMessage = errData.error || errorMessage;
          } catch {
            try {
              const errText = await analyzeRes.text();
              errorMessage = errText || `Error ${analyzeRes.status}: ${analyzeRes.statusText}`;
            } catch {
              errorMessage = `Error ${analyzeRes.status}: ${analyzeRes.statusText}`;
            }
          }
          throw new Error(errorMessage);
        }

        const data = await analyzeRes.json();
        imageAnalysisText = data.analysis;
        updateStepStatus("analyze-image", "success");
      } else {
        updateStepStatus("analyze-image", "success"); // Skip gracefully
      }

      setCurrentStepIndex(3);

      // STEP 4: Report Narrative Generation (Gemini API)
      updateStepStatus("generate-report", "running");
      const generateRes = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          imageAnalysis: imageAnalysisText,
          pdfText: pdfText,
          userInput: userInput,
          templateType: templateType,
          laporanHarianForm: templateType === "laporan-harian" ? laporanHarianForm : null,
        }),
      });

      if (!generateRes.ok) {
        let errorMessage = "Gagal menyusun narasi laporan AI.";
        try {
          const errData = await generateRes.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          try {
            const errText = await generateRes.text();
            errorMessage = errText || `Error ${generateRes.status}: ${generateRes.statusText}`;
          } catch {
            errorMessage = `Error ${generateRes.status}: ${generateRes.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      generatedReport = await generateRes.json();
      updateStepStatus("generate-report", "success");
      setCurrentStepIndex(4);

      // Save report data state
      setReportData(generatedReport);
      saveReportToHistory(generatedReport, templateType);
      
      // Auto-trigger word packaging state as complete
      updateStepStatus("export-docx", "success");

      // Give a tiny delayed animation window for delightful UX
      setTimeout(() => {
        setIsProcessing(false);
        addToast("Laporan resmi AI sukses diformulasikan!", "success");
        // Throw success confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 800);

    } catch (err: any) {
      console.error(err);
      // Mark current step as error
      const activeStepId = steps[currentStepIndex]?.id;
      if (activeStepId) {
        updateStepStatus(activeStepId, "error");
      }
      addToast(err.message || "Terjadi kesalahan sistem saat generate laporan.", "error");
      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);
    }
  };

  const updateStepStatus = (id: StepId, status: "idle" | "running" | "success" | "error") => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.id === id ? { ...step, status } : step))
    );
  };

  // Export filled document to docx
  const handleDownloadDocx = async () => {
    if (!reportData) return;
    setIsDownloading(true);

    try {
      const response = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType,
          reportData,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Gagal mengemas berkas Word (.docx).";
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          try {
            const errText = await response.text();
            errorMessage = errText || `Error ${response.status}: ${response.statusText}`;
          } catch {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Convert response stream to file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${templateType}-${Date.now()}.docx`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast("Berkas Microsoft Word (.docx) berhasil diunduh!", "success");
      
      // Celebrate again!
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Gagal mengunduh berkas Word.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setReportData(null);
    setAudioFile(null);
    setPdfFile(null);
    setImages([]);
    setUserInput("");
    setSteps(INITIAL_STEPS);
    addToast("Formulir masukan berhasil dikosongkan.", "info");
  };

  return (
    <div className="relative min-h-screen dot-grid flex flex-col font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900 pb-20">
      {/* Background radial glowing gradients (Apple style blur spots) */}
      {darkMode ? <div className="bg-glow-dark" /> : <div className="bg-glow-light" />}

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md border-b border-neutral-200/40 dark:border-neutral-800/40">
        <div className="max-w-6xl mx-auto px-4 h-16 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-md">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-950 dark:text-white tracking-tight">
                AI Report Generator
              </h1>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold tracking-wider uppercase">
                Premium Apple Style Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/40 dark:bg-neutral-900/30 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition-colors shadow-sm"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 pt-10">
        {/* Apple Style Segmented Tab Controls */}
        <div className="flex items-center justify-between mb-8 border-b border-neutral-200/40 dark:border-neutral-800/40 pb-4">
          <div className="flex space-x-1 p-0.5 bg-neutral-100/80 dark:bg-neutral-900/80 rounded-xl border border-neutral-200/30 dark:border-neutral-800/30 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("generator")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "generator"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Generator Laporan</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                fetchHistory();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "history"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Laporan</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "generator" ? (
            <motion.div
              key="generator-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatePresence mode="wait">
                {!reportData ? (
            /* Input Page State */
            <motion.div
              key="input-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Top Intro Section */}
              <div className="text-center sm:text-left space-y-2">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                  Buat Laporan Otomatis dengan AI
                </h2>
                <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
                  Unggah rundown gambar, guidebook PDF panduan, rekaman sambutan suara, dan catatan teks. AI akan memformulasikan laporan resmi dinas yang dinamis, akurat, dan terstruktur ke format Microsoft Word (.docx).
                </p>
              </div>

              <TemplateSelector selected={templateType} onChange={setTemplateType} />

              {/* Laporan Harian Form Section */}
              {templateType === "laporan-harian" && (
                <div className="space-y-6 rounded-3xl p-6 sm:p-8 border border-neutral-200/50 dark:border-neutral-800/40 bg-white/40 dark:bg-neutral-950/20 glassmorphism shadow-md transition-all duration-300">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                      Form Isian Laporan Harian Situasi
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Lengkapi data harga komoditas pasar, jadwal patroli, dan status tahanan hari ini. AI akan memformulasikan laporan akhir secara utuh dan padu berdasarkan form ini.
                    </p>
                  </div>

                  {/* Form Tabs Navigation */}
                  <div className="flex border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto whitespace-nowrap">
                    {[
                      { id: "umum", label: "Umum & Tahanan" },
                      { id: "ekonomi", label: "Ekonomi (Harga)" },
                      { id: "patroli", label: "Patroli BLP" },
                      { id: "rencana", label: "Rencana Esok" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFormTab(tab.id as any)}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all duration-200 -mb-[1px] ${
                          formTab === tab.id
                            ? "border-neutral-900 dark:border-white text-neutral-950 dark:text-white"
                            : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="pt-2">
                    {formTab === "umum" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Hari</label>
                            <input
                              type="text"
                              value={laporanHarianForm.hari}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, hari: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Tanggal</label>
                            <input
                              type="text"
                              value={laporanHarianForm.tanggal}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, tanggal: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Waktu</label>
                            <input
                              type="text"
                              value={laporanHarianForm.waktu}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, waktu: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Tahanan Laki-laki</label>
                            <input
                              type="text"
                              value={laporanHarianForm.tahananL}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, tahananL: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Tahanan Perempuan</label>
                            <input
                              type="text"
                              value={laporanHarianForm.tahananP}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, tahananP: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Kriminalitas</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.kriminalitas}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, kriminalitas: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Laka Lantas</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.lakaLantas}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, lakaLantas: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Bencana Alam</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.bencanaAlam}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, bencanaAlam: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Kegiatan VVIP / VIP</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.vvip}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, vvip: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {formTab === "ekonomi" && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-500/5 px-2 py-1 rounded-md inline-block">
                          Pantauan Harga Pasar Tradisional Kedungmundu & Meteseh
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                          {[
                            { label: "Beras Medium", minKey: "berasMin", maxKey: "berasMax", unit: "Kg" },
                            { label: "Kedelai", minKey: "kedelaiMin", maxKey: "kedelaiMax", unit: "Kg" },
                            { label: "Cabai Merah Besar", minKey: "cabaiBesarMin", maxKey: "cabaiBesarMax", unit: "Kg" },
                            { label: "Cabai Rawit Merah", minKey: "cabaiRawitMin", maxKey: "cabaiRawitMax", unit: "Kg" },
                            { label: "Cabai Tampar", minKey: "cabaiTamparMin", maxKey: "cabaiTamparMax", unit: "Kg" },
                            { label: "Bawang Merah", minKey: "bawangMerahMin", maxKey: "bawangMerahMax", unit: "Kg" },
                            { label: "Bawang Putih", minKey: "bawangPutihMin", maxKey: "bawangPutihMax", unit: "Kg" },
                            { label: "Jagung Kering", minKey: "jagungMin", maxKey: "jagungMax", unit: "Kg" },
                            { label: "Gula Pasir", minKey: "gulaMin", maxKey: "gulaMax", unit: "Kg" },
                            { label: "Minyakita", minKey: "minyakMin", maxKey: "minyakMax", unit: "Ltr" },
                            { label: "Tepung Terigu", minKey: "teriguMin", maxKey: "teriguMax", unit: "Kg" },
                            { label: "Daging Sapi", minKey: "dagingSapiMin", maxKey: "dagingSapiMax", unit: "Kg" },
                            { label: "Daging Ayam Ras", minKey: "dagingAyamMin", maxKey: "dagingAyamMax", unit: "Kg" },
                            { label: "Telur Ayam Ras", minKey: "telurMin", maxKey: "telurMax", unit: "Kg" },
                            { label: "Garam (250g)", minKey: "garamMin", maxKey: "garamMax", unit: "bks" },
                            { label: "LPG 3 Kg", minKey: "lpgMin", maxKey: "lpgMax", unit: "tabung" },
                          ].map((item) => (
                            <div key={item.label} className="border border-neutral-100 dark:border-neutral-900 rounded-xl p-3 bg-neutral-50/50 dark:bg-neutral-950/20 space-y-2 shadow-sm">
                              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{item.label} ({item.unit})</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[9px] font-bold text-neutral-400 block">MIN (Rp)</span>
                                  <input
                                    type="text"
                                    value={(laporanHarianForm as any)[item.minKey]}
                                    onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, [item.minKey]: e.target.value })}
                                    className="mt-0.5 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 text-[11px] text-neutral-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-neutral-400 block">MAX (Rp)</span>
                                  <input
                                    type="text"
                                    value={(laporanHarianForm as any)[item.maxKey]}
                                    onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, [item.maxKey]: e.target.value })}
                                    className="mt-0.5 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 text-[11px] text-neutral-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {formTab === "patroli" && (
                      <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2">
                        {/* Patroli Siang */}
                        <div className="border border-neutral-100 dark:border-neutral-900 rounded-2xl p-4 bg-neutral-50/50 dark:bg-neutral-955/20 space-y-3">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block border-b border-neutral-100 dark:border-neutral-900 pb-1.5">
                            1. Patroli Siang Hari (BLP Siang)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase">Waktu Patroli Siang</label>
                              <input
                                type="text"
                                value={laporanHarianForm.patroliSiangWaktu}
                                onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliSiangWaktu: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase">Cuaca Siang</label>
                              <input
                                type="text"
                                value={laporanHarianForm.patroliSiangCuaca}
                                onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliSiangCuaca: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Personil Patroli Siang</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliSiangPersonil}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliSiangPersonil: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Sasaran Patroli Siang</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliSiangSasaran}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliSiangSasaran: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Rute Patroli Siang</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliSiangRute}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliSiangRute: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Hasil Giat Patroli Siang</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliSiangHasil}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliSiangHasil: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Patroli Malam */}
                        <div className="border border-neutral-100 dark:border-neutral-900 rounded-2xl p-4 bg-neutral-50/50 dark:bg-neutral-955/20 space-y-3">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block border-b border-neutral-100 dark:border-neutral-900 pb-1.5">
                            2. Patroli Malam Hari (BLP Malam)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase">Waktu Patroli Malam</label>
                              <input
                                type="text"
                                value={laporanHarianForm.patroliMalamWaktu}
                                onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliMalamWaktu: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-neutral-400 uppercase">Cuaca Malam</label>
                              <input
                                type="text"
                                value={laporanHarianForm.patroliMalamCuaca}
                                onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliMalamCuaca: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Personil Patroli Malam</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliMalamPersonil}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliMalamPersonil: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Sasaran Patroli Malam</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliMalamSasaran}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliMalamSasaran: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Rute Patroli Malam</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliMalamRute}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliMalamRute: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase">Hasil Giat Patroli Malam</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.patroliMalamHasil}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, patroliMalamHasil: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {formTab === "rencana" && (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Hari Rencana Esok</label>
                            <input
                              type="text"
                              value={laporanHarianForm.rencanaHari}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaHari: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Tanggal Rencana Esok</label>
                            <input
                              type="text"
                              value={laporanHarianForm.rencanaTanggal}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaTanggal: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Rencana Unras (Unjuk Rasa)</label>
                            <input
                              type="text"
                              value={laporanHarianForm.rencanaUnras}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaUnras: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Rencana Kegiatan Menonjol</label>
                            <input
                              type="text"
                              value={laporanHarianForm.rencanaGiatMenonjol}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaGiatMenonjol: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Rencana Kegiatan Politik</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.rencanaPolitik}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaPolitik: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Rencana Giat Kemasyarakatan</label>
                            <textarea
                              rows={2}
                              value={laporanHarianForm.rencanaGiatMasyarakat}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaGiatMasyarakat: e.target.value })}
                              className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase block">Rencana Kegiatan Personel</label>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={laporanHarianForm.rencanaPersonil1}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaPersonil1: e.target.value })}
                              className="block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                            <input
                              type="text"
                              value={laporanHarianForm.rencanaPersonil2}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaPersonil2: e.target.value })}
                              className="block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                            <input
                              type="text"
                              value={laporanHarianForm.rencanaPersonil3}
                              onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, rencanaPersonil3: e.target.value })}
                              className="block w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2 text-xs text-neutral-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 uppercase">Catatan Tambahan Kamtibmas</label>
                          <textarea
                            rows={2}
                            value={laporanHarianForm.catatan}
                            onChange={(e) => setLaporanHarianForm({ ...laporanHarianForm, catatan: e.target.value })}
                            className="mt-1 block w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-2.5 text-xs text-neutral-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Multi-Input Upload Grid Layout (Hidden for laporan-harian) */}
              {templateType !== "laporan-harian" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
                    2. Masukkan Data Fakta Lapangan (Minimal Salah Satu)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Panel 1: Rundown Acara (Gambar) */}
                    <div className="flex flex-col space-y-4 rounded-3xl p-6 sm:p-7 glassmorphism transition-all duration-300 hover:shadow-lg dark:hover:shadow-white/5 border border-neutral-200/30 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/15">
                      <div className="flex items-center space-x-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
                        <ImageIcon className="w-4.5 h-4.5 text-neutral-500" />
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Gambar Dokumen (Rundown, Detail & Latar Belakang)</span>
                      </div>
                      <div className="flex-grow">
                        <ImageUploader images={images} onChange={setImages} onError={(msg) => addToast(msg, "error")} />
                      </div>
                    </div>

                    {/* Panel 2: Guidebook Acara (PDF) */}
                    <div className="flex flex-col space-y-4 rounded-3xl p-6 sm:p-7 glassmorphism transition-all duration-300 hover:shadow-lg dark:hover:shadow-white/5 border border-neutral-200/30 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/15">
                      <div className="flex items-center space-x-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
                        <FileText className="w-4.5 h-4.5 text-neutral-500" />
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Guidebook / Panduan Acara (PDF)</span>
                      </div>
                      <div className="flex-grow">
                        <PdfUploader pdfFile={pdfFile} onChange={setPdfFile} onError={(msg) => addToast(msg, "error")} />
                      </div>
                    </div>

                    {/* Panel 3: Rekaman Suara / Sambutan (Audio) */}
                    <div className="flex flex-col space-y-4 rounded-3xl p-6 sm:p-7 glassmorphism transition-all duration-300 hover:shadow-lg dark:hover:shadow-white/5 border border-neutral-200/30 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/15 md:col-span-1">
                      <div className="flex items-center space-x-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
                        <Volume2 className="w-4.5 h-4.5 text-neutral-500" />
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Rekaman Suara / Sambutan (Audio)</span>
                      </div>
                      <div className="flex-grow">
                        <AudioUploader audioFile={audioFile} onChange={setAudioFile} onError={(msg) => addToast(msg, "error")} />
                      </div>
                    </div>

                    {/* Panel 4: Catatan Teks Tambahan */}
                    <div className="flex flex-col space-y-4 rounded-3xl p-6 sm:p-7 glassmorphism transition-all duration-300 hover:shadow-lg dark:hover:shadow-white/5 border border-neutral-200/30 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/15 md:col-span-1">
                      <div className="flex items-center space-x-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
                        <PenTool className="w-4.5 h-4.5 text-neutral-500" />
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Catatan Teks / Informasi Tambahan</span>
                      </div>
                      <div className="flex flex-col flex-grow space-y-3">
                        <textarea
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder="Tambahkan catatan khusus, nama narasumber tambahan, lokasi geografis, panitia pelaksana, atau kronologi extra jika diperlukan..."
                          className="w-full flex-grow rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-950/20 p-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all resize-none min-h-[140px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grand Action Button */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className="flex items-center justify-center space-x-2 px-8 py-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 active:scale-98 transition-all font-bold text-sm shadow-xl shadow-neutral-950/10 dark:shadow-white/5 group"
                >
                  <Sparkles className="w-4.5 h-4.5 fill-current group-hover:rotate-12 transition-transform" />
                  <span>Mulai Generate Laporan AI</span>
                  <ChevronRight className="w-4 h-4 ml-1 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* Result Sheet Preview State */
            <motion.div
              key="result-preview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <ReportPreview
                reportData={reportData}
                templateType={templateType}
                onDownload={handleDownloadDocx}
                onReset={handleReset}
                isDownloading={isDownloading}
              />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          key="history-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
                Riwayat Pembuatan Laporan
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Daftar seluruh dokumen laporan resmi yang telah berhasil digenerate dan tersimpan otomatis.
              </p>
            </div>

            {/* Search Bar */}
            {supabaseConfigured && historyList.length > 0 && (
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Cari laporan..."
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-950/20 text-neutral-900 dark:text-white outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                />
              </div>
            )}
          </div>

          {!supabaseConfigured ? (
            /* Warning Panel for Missing Supabase Configuration */
            <div className="rounded-3xl p-6 sm:p-8 border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10 backdrop-blur-md space-y-5">
              <div className="flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                    Supabase Belum Dikonfigurasi
                  </h3>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed mt-1">
                    Fitur riwayat memerlukan database Supabase. Silakan ikuti langkah-langkah di bawah ini untuk mengonfigurasinya:
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-4 font-mono select-all overflow-x-auto border border-neutral-800">
                  <p className="text-neutral-500 mb-2"># 1. Jalankan SQL ini di SQL Editor Supabase Anda:</p>
                  <pre className="text-[11px] leading-relaxed">
{`CREATE TABLE report_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL,
  perihal TEXT NOT NULL,
  content TEXT NOT NULL,
  kapolsek_nama TEXT NOT NULL,
  meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buat index pencarian perihal
CREATE INDEX idx_report_history_perihal ON report_history (perihal);`}
                  </pre>
                </div>

                <div className="bg-neutral-900 text-neutral-100 rounded-2xl p-4 font-mono select-all border border-neutral-800">
                  <p className="text-neutral-500 mb-2"># 2. Tambahkan variabel ini di file .env.local Anda:</p>
                  <p className="text-emerald-400">NEXT_PUBLIC_SUPABASE_URL=<span className="text-white">URL_PROJEK_SUPABASE_ANDA</span></p>
                  <p className="text-emerald-400">NEXT_PUBLIC_SUPABASE_ANON_KEY=<span className="text-white">ANON_KEY_SUPABASE_ANDA</span></p>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Setelah ditambahkan, mulai ulang (restart) server pengembangan Anda agar perubahan file `.env.local` dapat diterapkan.
                </p>
              </div>
            </div>
          ) : isLoadingHistory ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white animate-spin" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Memuat riwayat laporan...
              </p>
            </div>
          ) : historyList.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-neutral-200/30 dark:border-neutral-800/30 bg-neutral-50/30 dark:bg-neutral-950/10 backdrop-blur-md p-8">
              <div className="p-4 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Belum Ada Riwayat Laporan
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
                Mulai generate laporan resmi Anda, dan laporan tersebut akan disimpan secara otomatis di sini.
              </p>
            </div>
          ) : (
            /* History Grid Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyList
                .filter((item) =>
                  item.perihal.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                  item.template_type.toLowerCase().includes(historySearchQuery.toLowerCase())
                )
                .map((item) => {
                  const date = new Date(item.created_at);
                  const formattedDate = date.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  // Badge colors & label mapping
                  let badgeLabel = "";
                  let badgeStyles = "";
                  if (item.template_type === "laporan-informasi") {
                    badgeLabel = "Laporan Informasi";
                    badgeStyles = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                  } else if (item.template_type === "laporan-kegiatan") {
                    badgeLabel = "Laporan Kegiatan";
                    badgeStyles = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                  } else if (item.template_type === "laporan-harian") {
                    badgeLabel = "Laporan Harian";
                    badgeStyles = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
                  } else {
                    badgeLabel = "Laporan Lainnya";
                    badgeStyles = "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";
                  }

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col justify-between rounded-2xl p-5 border border-neutral-200/50 dark:border-neutral-800/40 bg-white/40 dark:bg-neutral-900/30 hover:bg-white dark:hover:bg-neutral-900/70 hover:shadow-lg dark:hover:shadow-white/5 transition-all duration-300 backdrop-blur-md"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyles}`}>
                            {badgeLabel}
                          </span>
                          <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedHistoryItem(item)}
                              className="p-1.5 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              title="Lihat Laporan"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteHistoryItem(item.id)}
                              className="p-1.5 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-neutral-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xs font-extrabold text-neutral-900 dark:text-white line-clamp-2 leading-relaxed">
                          {item.perihal}
                        </h4>

                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/60 text-[10px] text-neutral-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </main>

      {/* Detail Riwayat Laporan Modal Overlay */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHistoryItem(null)}
              className="absolute inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 backdrop-blur-sm animate-fade-in"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/95 dark:bg-neutral-900/95 shadow-2xl overflow-hidden backdrop-blur-md"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800/60">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedHistoryItem.template_type === "laporan-informasi"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        : selectedHistoryItem.template_type === "laporan-kegiatan"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    }`}>
                      {selectedHistoryItem.template_type === "laporan-informasi"
                        ? "Laporan Informasi"
                        : selectedHistoryItem.template_type === "laporan-kegiatan"
                        ? "Laporan Kegiatan"
                        : "Laporan Harian"}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {new Date(selectedHistoryItem.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white mt-2 line-clamp-1 pr-6">
                    {selectedHistoryItem.perihal}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedHistoryItem(null)}
                  className="p-1.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-grow p-6 overflow-y-auto font-sans text-xs text-neutral-700 dark:text-neutral-300 space-y-4 select-text">
                <div className="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl p-5 border border-neutral-100 dark:border-neutral-800/40 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                  {selectedHistoryItem.content}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-2.5 p-5 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-950/20">
                <button
                  onClick={() => handleCopyHistoryContent(selectedHistoryItem)}
                  className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all font-semibold text-xs shadow-sm"
                >
                  {isCopiedHistoryId === selectedHistoryItem.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Teks</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownloadHistoryDocx(selectedHistoryItem)}
                  disabled={isDownloading}
                  className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50 transition-all font-bold text-xs shadow-sm"
                >
                  {isDownloading ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isDownloading 
                      ? "Mengunduh..." 
                      : selectedHistoryItem.template_type === "laporan-informasi" && selectedHistoryItem.meta_data?.raw_report
                      ? "Unduh (.docx)" 
                      : "Unduh (.txt)"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sequential Loading Process Modal Backdrop Overlay */}
      <ProcessingModal
        isOpen={isProcessing}
        steps={steps}
        currentStepIndex={currentStepIndex}
      />

      {/* High-Fidelity Custom Floating Toast Notifications System */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto w-full flex items-start space-x-3 rounded-2xl bg-white/95 dark:bg-neutral-900/95 p-4 shadow-xl border border-neutral-200/50 dark:border-neutral-800/40 backdrop-blur-md"
            >
              {toast.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <Sparkles className="w-5 h-5 text-neutral-900 dark:text-white flex-shrink-0 fill-neutral-900 dark:fill-white" />
              )}
              
              <div className="flex-grow">
                <p className="text-xs font-semibold text-neutral-900 dark:text-white leading-normal pr-4">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
