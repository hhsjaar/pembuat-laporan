"use client";

import { motion } from "framer-motion";
import { FileText, Calendar, Shield, CheckCircle2 } from "lucide-react";

export type TemplateType = "laporan-informasi" | "laporan-kegiatan" | "laporan-harian-khusus" | "laporan-khusus-3";

interface TemplateSelectorProps {
  selected: TemplateType;
  onChange: (template: TemplateType) => void;
}

export default function TemplateSelector({ selected, onChange }: TemplateSelectorProps) {
  const templates = [
    {
      id: "laporan-informasi" as TemplateType,
      title: "Laporan Informasi",
      description: "Untuk publikasi informasi umum, dokumentasi berkala, atau laporan kegiatan rutin lapangan.",
      icon: FileText,
      color: "from-blue-500/10 to-indigo-500/10 text-blue-500 dark:text-blue-400",
      borderColor: "hover:border-blue-500/30 selected:border-blue-500",
    },
    {
      id: "laporan-kegiatan" as TemplateType,
      title: "Laporan Kegiatan",
      description: "Format laporan kegiatan Polsek Tembalang yang ringkas untuk disalin langsung ke WhatsApp/Telegram.",
      icon: FileText,
      color: "from-amber-500/10 to-orange-500/10 text-amber-500 dark:text-amber-400",
      borderColor: "hover:border-amber-500/30 selected:border-amber-500",
    },
    {
      id: "laporan-harian-khusus" as TemplateType,
      title: "Laporan Harian Khusus",
      description: "Format LHK resmi untuk mendokumentasikan kejadian penting harian atau situasi darurat di TKP.",
      icon: Calendar,
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-500 dark:text-emerald-400",
      borderColor: "hover:border-emerald-500/30 selected:border-emerald-500",
    },
    {
      id: "laporan-khusus-3" as TemplateType,
      title: "Laporan Khusus 3",
      description: "Dokumen pengawasan strategis level tinggi untuk koordinasi lintas sektoral dan pimpinan.",
      icon: Shield,
      color: "from-purple-500/10 to-pink-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
          1. Pilih Jenis Template Laporan
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Setiap template memiliki struktur formal, tata letak, dan gaya bahasa resmi yang disesuaikan secara khusus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((temp) => {
          const Icon = temp.icon;
          const isSelected = selected === temp.id;

          return (
            <div
              key={temp.id}
              onClick={() => onChange(temp.id)}
              className={`relative cursor-pointer rounded-2xl p-5 glassmorphism transition-all duration-300 group overflow-hidden ${
                isSelected
                  ? "border-neutral-900/10 dark:border-white/10 ring-2 ring-neutral-900 dark:ring-white bg-white dark:bg-neutral-900/60 shadow-lg"
                  : "border-neutral-200/50 dark:border-neutral-800/40 hover:bg-white dark:hover:bg-neutral-900/20 hover:shadow-md"
              }`}
            >
              {/* Highlight background glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${temp.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`}
              />

              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${temp.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="selectedTemplateCheck"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-neutral-900 dark:text-white fill-neutral-900 dark:fill-white text-white dark:text-neutral-900" />
                  </motion.div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <h4 className="font-semibold text-base text-neutral-950 dark:text-white group-hover:translate-x-0.5 transition-transform duration-300">
                  {temp.title}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {temp.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
