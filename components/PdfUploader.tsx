"use client";

import React, { useRef, useState } from "react";
import { FileText, Upload, Trash2, CheckCircle2 } from "lucide-react";

interface PdfUploaderProps {
  pdfFile: File | null;
  onChange: (file: File | null) => void;
}

export default function PdfUploader({ pdfFile, onChange }: PdfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

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
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
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
        Guidebook / Dokumen Panduan Acara (PDF)
      </label>

      {!pdfFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border border-dashed p-6 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? "border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/5"
              : "border-neutral-200 dark:border-neutral-800/60 bg-white/40 dark:bg-neutral-950/20 hover:border-neutral-400/50 dark:hover:border-neutral-700/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Unggah Panduan Acara (PDF)
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Format berkas PDF hingga 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 p-3.5 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white max-w-[200px] sm:max-w-[400px] truncate">
                {pdfFile.name}
              </p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {formatFileSize(pdfFile.size)} • PDF Terunggah
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
              onClick={() => onChange(null)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
