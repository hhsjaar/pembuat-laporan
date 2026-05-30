"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Upload, X, FileImage, Trash2 } from "lucide-react";

interface ImageUploaderProps {
  images: File[];
  onChange: (images: File[]) => void;
}

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
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

  const processFiles = (files: FileList) => {
    const validImages: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        validImages.push(file);
      }
    }
    if (validImages.length > 0) {
      onChange([...images, ...validImages]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
          Dokumentasi Gambar (JPG, PNG)
        </label>
        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
          {images.length} gambar dipilih
        </span>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative rounded-2xl border border-dashed p-8 text-center cursor-pointer transition-all duration-300 overflow-hidden group ${
          isDragActive
            ? "border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/5 ring-1 ring-neutral-900 dark:ring-white"
            : "border-neutral-200 dark:border-neutral-800/60 bg-white/40 dark:bg-neutral-950/20 hover:border-neutral-400/50 dark:hover:border-neutral-700/50 hover:bg-white/60 dark:hover:bg-neutral-950/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 group-hover:scale-105 transition-transform duration-300">
            <Upload className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Seret dan lepas gambar ke sini, atau <span className="text-neutral-900 dark:text-white underline underline-offset-2 decoration-neutral-400">cari berkas</span>
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Format PNG, JPG, JPEG hingga 10MB per berkas
            </p>
          </div>
        </div>
      </div>

      {/* Thumbnails grid */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3"
          >
            {images.map((file, idx) => {
              const fileUrl = URL.createObjectURL(file);
              return (
                <motion.div
                  key={`${file.name}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="relative group rounded-xl overflow-hidden aspect-square border border-neutral-200/60 dark:border-neutral-800/80 bg-neutral-100 dark:bg-neutral-900 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                    <p className="text-[10px] text-white font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-[9px] text-neutral-300 font-normal">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/10 hover:scale-105 transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100 sm:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
