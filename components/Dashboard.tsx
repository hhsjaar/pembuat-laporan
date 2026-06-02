"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Sun, Moon, AlertCircle, FileText, ChevronRight, X, Volume2, Image as ImageIcon, PenTool } from "lucide-react";
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

export default function Dashboard() {
  // Theme state (system default fallback to light mode)
  const [darkMode, setDarkMode] = useState(false);

  // Form input states
  const [templateType, setTemplateType] = useState<TemplateType>("laporan-informasi");
  const [images, setImages] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [userInput, setUserInput] = useState("");

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Result state
  const [reportData, setReportData] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Custom Toast notification states
  const [toasts, setToasts] = useState<Toast[]>([]);

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
    // Validation check: must have at least one upload or input
    if (images.length === 0 && !pdfFile && !audioFile && !userInput.trim()) {
      addToast("Harap masukkan setidaknya satu input: gambar rundown, berkas PDF guidebook, rekaman suara, atau catatan teks.", "error");
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

              {/* Template Select Section */}
              <TemplateSelector selected={templateType} onChange={setTemplateType} />

              {/* Multi-Input Upload Grid Layout */}
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
                      <ImageUploader images={images} onChange={setImages} />
                    </div>
                  </div>

                  {/* Panel 2: Guidebook Acara (PDF) */}
                  <div className="flex flex-col space-y-4 rounded-3xl p-6 sm:p-7 glassmorphism transition-all duration-300 hover:shadow-lg dark:hover:shadow-white/5 border border-neutral-200/30 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/15">
                    <div className="flex items-center space-x-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
                      <FileText className="w-4.5 h-4.5 text-neutral-500" />
                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Guidebook / Panduan Acara (PDF)</span>
                    </div>
                    <div className="flex-grow">
                      <PdfUploader pdfFile={pdfFile} onChange={setPdfFile} />
                    </div>
                  </div>

                  {/* Panel 3: Rekaman Suara / Sambutan (Audio) */}
                  <div className="flex flex-col space-y-4 rounded-3xl p-6 sm:p-7 glassmorphism transition-all duration-300 hover:shadow-lg dark:hover:shadow-white/5 border border-neutral-200/30 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/15 md:col-span-1">
                    <div className="flex items-center space-x-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
                      <Volume2 className="w-4.5 h-4.5 text-neutral-500" />
                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Rekaman Suara / Sambutan (Audio)</span>
                    </div>
                    <div className="flex-grow">
                      <AudioUploader audioFile={audioFile} onChange={setAudioFile} />
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
      </main>

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
