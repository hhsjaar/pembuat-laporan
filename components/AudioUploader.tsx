"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Upload, Play, Trash2, CheckCircle2, Pause, Loader2 } from "lucide-react";

interface AudioUploaderProps {
  audioFile: File | null;
  onChange: (file: File | null) => void;
  onTranscriptReady: (text: string) => void;
  onError?: (message: string) => void;
}

// Vercel Serverless Functions hard-cap the request body at ~4.5MB (not adjustable on Hobby/Pro).
// A single-shot upload of a long recording blows past that, so live recordings are split into
// small segments and transcribed as they're captured — each request stays tiny no matter how
// long the user records.
const CHUNK_INTERVAL_MS = 60_000;

export default function AudioUploader({ audioFile, onChange, onTranscriptReady, onError }: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [chunkStatus, setChunkStatus] = useState({ processed: 0, failed: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Live long-recording state
  const streamRef = useRef<MediaStream | null>(null);
  const currentRecorderRef = useRef<MediaRecorder | null>(null);
  const isRecordingRef = useRef(false);
  const loopPromiseRef = useRef<Promise<void> | null>(null);
  const pendingUploadsRef = useRef<Promise<void>[]>([]);
  const transcriptPartsRef = useRef<string[]>([]);
  const chunkCounterRef = useRef(0);

  const isBusy = isRecording || isFinalizing;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };
  const processFile = (file: File) => {
    const validTypes = [
      "audio/mp3", "audio/mpeg", "audio/wav", "audio/x-wav",
      "audio/m4a", "audio/x-m4a", "audio/mp4", "audio/ogg",
      "audio/opus", "audio/aac", "audio/x-aac",
      "video/mpeg", "video/mp4", "video/webm"
    ];
    const fileExt = file.name.toLowerCase();
    const hasValidExt =
      fileExt.endsWith(".m4a") || fileExt.endsWith(".mp3") ||
      fileExt.endsWith(".wav") || fileExt.endsWith(".mpeg") ||
      fileExt.endsWith(".ogg") || fileExt.endsWith(".opus") ||
      fileExt.endsWith(".aac") || fileExt.endsWith(".mpg") ||
      fileExt.endsWith(".mp4") || fileExt.endsWith(".webm");

    if (validTypes.includes(file.type) || hasValidExt) {
      if (file.size > 150 * 1024 * 1024) {
        const errMsg = "Ukuran berkas audio melebihi batas 150MB. Silakan unggah berkas yang lebih kecil.";
        if (onError) {
          onError(errMsg);
        } else {
          alert(errMsg);
        }
        return;
      }
      onChange(file);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Records exactly one small segment on the given stream and resolves with it once it stops
  // (either from the interval timeout below, or from an early call to stopRecording()).
  const recordOneChunk = (stream: MediaStream, maxMs: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const parts: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      currentRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) parts.push(e.data);
      };

      recorder.onstop = () => {
        currentRecorderRef.current = null;
        clearTimeout(timer);
        resolve(new Blob(parts, { type: "audio/webm" }));
      };

      recorder.start();
      const timer = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, maxMs);
    });
  };

  const uploadAndTranscribeChunk = async (blob: Blob, seq: number) => {
    try {
      const file = new File([blob], `rekaman-bagian-${seq}.webm`, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      transcriptPartsRef.current[seq - 1] = (data.text || "").trim();
    } catch (err) {
      console.error(`Gagal mentranskripsi bagian rekaman ke-${seq}:`, err);
      transcriptPartsRef.current[seq - 1] = "";
      setChunkStatus((s) => ({ ...s, failed: s.failed + 1 }));
    } finally {
      setChunkStatus((s) => ({ ...s, processed: s.processed + 1 }));
    }
  };

  // Keeps recording back-to-back segments until stopRecording() flips isRecordingRef off.
  // The just-finished segment is always uploaded before checking the flag, so the final
  // (possibly short) segment triggered by "Hentikan Rekam" is never dropped.
  const runRecordingLoop = async (stream: MediaStream) => {
    while (true) {
      const blob = await recordOneChunk(stream, CHUNK_INTERVAL_MS);
      if (blob.size > 0) {
        const seq = ++chunkCounterRef.current;
        pendingUploadsRef.current.push(uploadAndTranscribeChunk(blob, seq));
      }
      if (!isRecordingRef.current) break;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      transcriptPartsRef.current = [];
      pendingUploadsRef.current = [];
      chunkCounterRef.current = 0;
      setChunkStatus({ processed: 0, failed: 0 });

      isRecordingRef.current = true;
      setIsRecording(true);
      loopPromiseRef.current = runRecordingLoop(stream);
    } catch (err) {
      console.error("Microphone hardware error:", err);
      alert("Gagal mengakses mikrofon. Harap berikan izin akses mikrofon di peramban Anda.");
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;
    setIsRecording(false);
    setIsFinalizing(true);

    // Cuts the in-progress segment short instead of waiting up to CHUNK_INTERVAL_MS for it to end.
    if (currentRecorderRef.current && currentRecorderRef.current.state !== "inactive") {
      currentRecorderRef.current.stop();
    }

    try {
      await loopPromiseRef.current;
      await Promise.all(pendingUploadsRef.current);
    } finally {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const finalText = transcriptPartsRef.current.filter(Boolean).join(" ").trim();

    if (!finalText) {
      const errMsg = "Transkripsi rekaman gagal atau kosong. Silakan coba rekam ulang.";
      if (onError) onError(errMsg); else alert(errMsg);
      setIsFinalizing(false);
      return;
    }

    setIsFinalizing(false);
    setChunkStatus({ processed: 0, failed: 0 });
    onTranscriptReady(finalText);
  };

  const togglePlayback = () => {
    if (!audioPlaybackRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audioPlaybackRef.current = audio;
    }

    if (isPlaying) {
      audioPlaybackRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioPlaybackRef.current?.play();
      setIsPlaying(true);
    }
  };

  const removeAudio = () => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current = null;
    }
    setIsPlaying(false);
    setChunkStatus({ processed: 0, failed: 0 });
    transcriptPartsRef.current = [];
    onChange(null);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainSecs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
        Laporan Suara / Voice Note (MP3, WAV, M4A)
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload File Box */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border border-dashed p-6 text-center cursor-pointer transition-all duration-300 ${
            (audioFile || isBusy) ? "opacity-50 pointer-events-none" : ""
          } ${
            isDragActive
              ? "border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/5"
              : "border-neutral-200 dark:border-neutral-800/60 bg-white/40 dark:bg-neutral-950/20 hover:border-neutral-400/50 dark:hover:border-neutral-700/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*, video/mpeg, video/mp4, video/webm, .mp3, .wav, .m4a, .mpeg, .ogg, .opus, .aac, .mpg, .mp4, .webm"
            onChange={handleFileInputChange}
            onClick={(e) => e.stopPropagation()}
            className="hidden"
            disabled={!!audioFile}
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Unggah Berkas Audio
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Format MP3, M4A, WAV, MPEG, OPUS hingga 150MB
              </p>
            </div>
          </div>
        </div>

        {/* Record Audio Box */}
        <div
          className={`rounded-2xl border p-6 flex flex-col items-center justify-center space-y-3 transition-all duration-300 ${
            (audioFile && !isBusy) ? "opacity-50 pointer-events-none" : "border-neutral-200 dark:border-neutral-800/60 bg-white/40 dark:bg-neutral-950/20"
          }`}
        >
          {isRecording ? (
            <div className="flex flex-col items-center space-y-2 w-full">
              {/* Wave Visualizer Mock */}
              <div className="flex items-center justify-center space-x-1.5 h-6 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((bar, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [8, bar * 3, 8],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.8,
                      delay: i * 0.05,
                    }}
                    className="w-1 rounded-full bg-red-500"
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-red-500 tracking-wider tabular-nums">
                MEREKAM — {formatTime(recordingSeconds)}
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {chunkStatus.processed} bagian ditranskripsi otomatis
                {chunkStatus.failed > 0 ? ` • ${chunkStatus.failed} gagal (diabaikan)` : ""}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stopRecording();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95 transition-all text-xs font-medium shadow-md shadow-red-500/20"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Rekam</span>
              </button>
            </div>
          ) : isFinalizing ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Menyelesaikan transkripsi bagian terakhir...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Rekam Suara Langsung
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
                  Bisa merekam berjam-jam, hasilnya otomatis masuk ke Catatan Teks
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startRecording();
                }}
                className="mt-1 flex items-center space-x-1.5 px-4 py-1.5 border border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 rounded-full text-xs font-medium text-neutral-800 dark:text-neutral-200 active:scale-95 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Mulai Rekam</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Audio Info Player Bar */}
      <AnimatePresence>
        {audioFile && !isBusy && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center justify-between rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 p-3.5 shadow-sm"
          >
            <div className="flex items-center space-x-3.5">
              <button
                type="button"
                onClick={togglePlayback}
                className="p-3 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-neutral-950/10"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-neutral-900 dark:text-white max-w-[200px] sm:max-w-[400px] truncate">
                  {audioFile.name}
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {formatFileSize(audioFile.size)} • File Terpasang
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Siap Diproses</span>
              </span>
              <button
                type="button"
                onClick={removeAudio}
                className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
