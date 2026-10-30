"use client";
import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Copy, Check, Loader2, RotateCcw, PenTool, MessageSquareText } from "lucide-react";
import { PENANDATANGAN_WA, type WaTemplateType } from "@/lib/laporanWa";

interface WaReportPanelProps {
  templateType: WaTemplateType;
  addToast: (message: string, type?: "success" | "error" | "info") => void;
}

const COPY: Record<WaTemplateType, { judul: string; placeholder: string }> = {
  "wa-segera-kamtibmas": {
    judul: "Laporan Segera Gangguan Kamtibmas",
    placeholder:
      "Tempel seluruh keterangan kejadian dalam satu teks: jenis gangguan, waktu kejadian/dilaporkan/tiba di TKP, lokasi, korban, pelaku, saksi, kronologi, kerugian, barang bukti, tindakan petugas, dll. AI akan memilah ke 15 poin laporan.",
  },
  "wa-kemajuan": {
    judul: "Laporan Kemajuan",
    placeholder:
      "Tempel seluruh perkembangan perkara dalam satu teks: nomor LP, peristiwa, periode, lokasi, fakta terbaru, penangkapan tersangka, keterangan tersangka, modus, motif, alat, kerugian, dll. AI akan memilah ke 13 poin laporan.",
  },
};

export default function WaReportPanel({ templateType, addToast }: WaReportPanelProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  // Teks terakhir yang sudah tersimpan di riwayat; beda dengan `result` berarti pengguna menyunting.
  const savedTextRef = useRef("");

  // Simpan otomatis hasil edit ke riwayat (debounce), seperti template laporan lain.
  useEffect(() => {
    if (!historyId || !result || result === savedTextRef.current) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/history", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: historyId, content: result }),
        });
        if (res.ok) savedTextRef.current = result;
      } catch (err) {
        console.error("Gagal memperbarui riwayat:", err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [result, historyId]);

  const saveToHistory = async (text: string, judul: string) => {
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_type: templateType,
          perihal: judul,
          content: text,
          kapolsek_nama: PENANDATANGAN_WA,
          meta_data: { timestamp: new Date().toISOString(), format: "whatsapp" },
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        savedTextRef.current = text;
        setHistoryId(saved.id);
      }
    } catch (err) {
      console.error("Gagal menyimpan ke riwayat:", err);
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) {
      addToast("Tempel teks kejadian terlebih dahulu.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType, userInput: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
      setResult(data.text);
      setHistoryId(null);
      setIsCopied(false);
      void saveToHistory(data.text, data.judul || COPY[templateType].judul);
      addToast("Laporan siap disalin ke WhatsApp.", "success");
    } catch (err: any) {
      addToast(err.message || "Gagal menyusun laporan.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      // Fallback untuk konteks non-HTTPS / izin clipboard ditolak
      const el = document.createElement("textarea");
      el.value = result;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setIsCopied(true);
    addToast("Teks laporan disalin. Tempel di WhatsApp.", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReset = () => {
    setInput("");
    setResult("");
    setHistoryId(null);
    setIsCopied(false);
  };

  const cardClass =
    "flex flex-col space-y-4 rounded-2xl md:rounded-3xl p-4 md:p-7 glassmorphism border border-neutral-200/30 dark:border-neutral-800/30 bg-white/30 dark:bg-neutral-950/15";
  const textareaClass =
    "w-full rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-950/20 p-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-accent dark:focus:border-accent focus:ring-2 focus:ring-accent transition-all";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
          2. Tempel Teks Kejadian (Satu Teks Penuh)
        </h3>
        <div className={cardClass}>
          <div className="flex items-center space-x-2 pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
            <PenTool className="w-4.5 h-4.5 text-neutral-500" />
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{COPY[templateType].judul}</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={COPY[templateType].placeholder}
            className={`${textareaClass} resize-y min-h-[220px] sm:min-h-[280px]`}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">{input.length.toLocaleString("id-ID")} karakter</span>
            <div className="flex items-center gap-2">
              {(input || result) && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="flex items-center space-x-1.5 px-4 py-3 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100/70 dark:bg-neutral-900/40 hover:bg-neutral-200/70 dark:hover:bg-neutral-800/50 transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Kosongkan</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-accent text-white hover:opacity-95 active:scale-[0.98] transition-all font-extrabold text-sm shadow-lg shadow-accent/25 disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-current" />}
                <span>{isLoading ? "AI sedang menyusun..." : result ? "Susun Ulang" : "Susun Laporan"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
            3. Hasil Format WhatsApp
          </h3>
          <div className={cardClass}>
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800/60">
              <div className="flex items-center space-x-2">
                <MessageSquareText className="w-4.5 h-4.5 text-neutral-500" />
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Siap Salin (dapat diedit, tersimpan otomatis di Riwayat)</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-accent text-white hover:opacity-95 active:scale-[0.98] transition-all font-bold text-sm"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? "Tersalin" : "Salin Teks"}</span>
              </button>
            </div>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              spellCheck={false}
              className={`${textareaClass} resize-y min-h-[420px] sm:min-h-[560px] font-mono leading-relaxed`}
            />
            <p className="text-xs text-neutral-400">
              Tanda *teks* akan tampil tebal di WhatsApp. Periksa poin bertanda NIHIL (tidak disebut di teks) sebelum dikirim.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
