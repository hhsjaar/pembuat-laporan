"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

export type StepId = "transcribe" | "parse-pdf" | "analyze-image" | "generate-report" | "export-docx";

export interface ProcessingStep {
  id: StepId;
  label: string;
  description: string;
  status: "idle" | "running" | "success" | "error";
}

interface ProcessingModalProps {
  isOpen: boolean;
  steps: ProcessingStep[];
  currentStepIndex: number;
}

export default function ProcessingModal({ isOpen, steps, currentStepIndex }: ProcessingModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-neutral-950/40 dark:bg-black/60 backdrop-blur-xl"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white/90 dark:bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-2xl"
        >
          {/* Abstract Animated Spinner */}
          <div className="flex flex-col items-center justify-center space-y-4 mb-8">
            <div className="relative flex items-center justify-center w-16 h-16">
              {/* Outer pulsing ring */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-neutral-950/5 dark:bg-white/5 border border-neutral-950/10 dark:border-white/10"
              />
              
              {/* Spinning active ring */}
              <Loader2 className="w-8 h-8 text-neutral-950 dark:text-white animate-spin" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">
                Memproses Laporan Anda
              </h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                AI sedang merangkum fakta lapangan dan menyusun dokumen
              </p>
            </div>
          </div>

          {/* Sequential Step List */}
          <div className="space-y-5">
            {steps.map((step, idx) => {
              const isActive = step.status === "running";
              const isSuccess = step.status === "success";
              const isError = step.status === "error";
              const isIdle = step.status === "idle";

              return (
                <div
                  key={step.id}
                  className={`flex items-start space-x-3.5 transition-all duration-300 ${
                    isActive ? "opacity-100 scale-[1.01]" : "opacity-45"
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isIdle && (
                      <Circle className="w-5 h-5 text-neutral-300 dark:text-neutral-700" />
                    )}
                    {isActive && (
                      <Loader2 className="w-5 h-5 text-neutral-900 dark:text-white animate-spin" />
                    )}
                    {isSuccess && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                    )}
                    {isError && (
                      <AlertCircle className="w-5 h-5 text-red-500 fill-red-500/10" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <p
                      className={`text-sm font-semibold leading-none ${
                        isActive
                          ? "text-neutral-950 dark:text-white"
                          : isSuccess
                          ? "text-neutral-700 dark:text-neutral-300"
                          : isError
                          ? "text-red-500"
                          : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subtle safety prompt */}
          <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800/60 text-center">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
              Mohon tidak menutup peramban ini. Proses ini dapat memakan waktu 10 hingga 30 detik tergantung pada ukuran berkas masukan Anda.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
