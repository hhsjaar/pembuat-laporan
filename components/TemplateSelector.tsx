"use client";
import React from "react";
import { motion } from "framer-motion";
import { Terminal, Activity, Radar, Shield, CheckCircle2, Zap } from "lucide-react";

export type TemplateType = "laporan-informasi" | "laporan-kegiatan" | "laporan-harian-khusus" | "laporan-khusus-3" | "laporan-harian" | "infosus";

interface TemplateSelectorProps {
  selected: TemplateType;
  onChange: (template: TemplateType) => void;
}

export default function TemplateSelector({ selected, onChange }: TemplateSelectorProps) {
  const templates = [
    {
      id: "laporan-informasi" as TemplateType,
      title: "Laporan Informasi",
      icon: Terminal,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
    },
    {
      id: "laporan-kegiatan" as TemplateType,
      title: "Laporan Kegiatan",
      icon: Activity,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
    },
    {
      id: "laporan-harian" as TemplateType,
      title: "Laporan Harian Situasi",
      icon: Radar,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
    },
    {
      id: "laporan-harian-khusus" as TemplateType,
      title: "Laporan Harian Khusus",
      icon: Shield,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
    },
    {
      id: "infosus" as TemplateType,
      title: "Informasi Khusus",
      icon: Zap,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
    },
  ];

  const selectedStyles: Record<TemplateType, string> = {
    "laporan-informasi": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-kegiatan": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-harian": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-harian-khusus": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-khusus-3": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "infosus": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
  };

  const checkColor: Record<TemplateType, string> = {
    "laporan-informasi": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-kegiatan": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-harian": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-harian-khusus": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-khusus-3": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "infosus": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
  };

  const isLargeScreen = "lg:col-span-1 lg:row-span-1 lg:order-none lg:col-start-auto lg:row-start-auto";

  const getResponsiveGridClasses = (idx: number) => {
    if (idx === 0) return `col-span-1 order-1 ${isLargeScreen}`;
    if (idx === 1) return `col-span-1 order-3 ${isLargeScreen}`;
    if (idx === 4) return `col-span-1 row-span-2 order-2 col-start-2 row-start-1 h-full lg:h-auto ${isLargeScreen}`;
    if (idx === 2) return `col-span-1 order-4 col-start-1 row-start-2 ${isLargeScreen}`;
    if (idx === 3) return `col-span-1 order-5 col-start-3 row-start-2 ${isLargeScreen}`;
    return isLargeScreen;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
          1. Pilih Jenis Template Laporan
        </h3>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 pb-0 md:pb-4.5">
        {templates.map((temp, idx) => {
          const Icon = temp.icon;
          const isSelected = selected === temp.id;
          const gridClasses = getResponsiveGridClasses(idx);

          return (
            <div
              key={temp.id}
              onClick={() => onChange(temp.id)}
              className={`relative cursor-pointer rounded-2xl p-3.5 sm:p-5 glassmorphism transition-all duration-300 group overflow-hidden w-full flex flex-col justify-between ${gridClasses} ${
                idx === 4
                  ? "justify-center items-center text-center lg:justify-between lg:items-start lg:text-left"
                  : ""
              } ${
                isSelected
                  ? selectedStyles[temp.id]
                  : "border-neutral-200/50 dark:border-neutral-800/40 hover:bg-white dark:hover:bg-neutral-900/20 hover:shadow-md"
              }`}
            >
              {/* Highlight background glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${temp.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`}
              />

              <div className={`flex w-full items-start justify-between ${
                idx === 4 ? "justify-center lg:justify-between" : ""
              }`}>
                <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${temp.color}`}>
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="selectedTemplateCheck"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={idx === 4 ? "absolute top-3.5 right-3.5 lg:static" : ""}
                  >
                    <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${checkColor[temp.id]}`} />
                  </motion.div>
                )}
              </div>

              <div className={`mt-3 sm:mt-5 ${idx === 4 ? "mt-4 lg:mt-5" : ""}`}>
                <h4 className="font-bold text-xs sm:text-base text-neutral-950 dark:text-white group-hover:translate-x-0.5 transition-transform duration-300">
                  {temp.title}
                </h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
