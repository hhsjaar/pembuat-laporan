"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Upload, X, FileImage, Trash2 } from "lucide-react";

interface ImageUploaderProps {
  images: File[];
  onChange: (images: File[]) => void;
  onError?: (message: string) => void;
}

// Client-side image compression helper to downscale and re-compress images to prevent Vercel 413 (Payload Too Large)
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              
              if (compressedFile.size < file.size || file.size > 1024 * 1024) {
                console.log(`[Image Compressor] Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.7 // compress quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function ImageUploader({ images, onChange, onError }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFiles = async (files: FileList) => {
    const validImages: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        validImages.push(file);
      }
    }
    
    if (validImages.length > 0) {
      setIsCompressing(true);
      try {
        const compressedImages = await Promise.all(validImages.map(compressImage));
        const newImagesList = [...images, ...compressedImages];
        const totalSize = newImagesList.reduce((acc, img) => acc + img.size, 0);
        
        if (totalSize > 4 * 1024 * 1024) {
          const errMsg = "Total ukuran gambar melebihi batas 4MB untuk hosting Vercel. Silakan kurangi jumlah gambar atau gunakan ukuran yang lebih kecil.";
          if (onError) {
            onError(errMsg);
          } else {
            alert(errMsg);
          }
          return;
        }
        
        onChange(newImagesList);
      } catch (err) {
        console.error("Gagal mengompresi gambar:", err);
        const fallbackList = [...images, ...validImages];
        const totalSize = fallbackList.reduce((acc, img) => acc + img.size, 0);
        
        if (totalSize > 4 * 1024 * 1024) {
          const errMsg = "Total ukuran gambar melebihi batas 4MB untuk hosting Vercel. Silakan kurangi jumlah gambar.";
          if (onError) {
            onError(errMsg);
          } else {
            alert(errMsg);
          }
          return;
        }
        
        onChange(fallbackList); // fallback to uncompressed
      } finally {
        setIsCompressing(false);
      }
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

        {isCompressing ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Sedang mengompresi gambar...
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Memperkecil ukuran berkas untuk menghindari galat Vercel 413
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 group-hover:scale-105 transition-transform duration-300">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Seret dan lepas satu atau beberapa gambar sekaligus ke sini, atau <span className="text-neutral-900 dark:text-white underline underline-offset-2 decoration-neutral-400">cari berkas</span>
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Format PNG, JPG, JPEG hingga 10MB per berkas
              </p>
            </div>
          </div>
        )}
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
