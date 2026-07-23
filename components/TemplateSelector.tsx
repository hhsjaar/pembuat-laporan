"use client";
import React from "react";
import { motion } from "framer-motion";
import { Terminal, Activity, Radar, Shield, CheckCircle2, Zap, Eye, CalendarDays } from "lucide-react";

export type TemplateType = "laporan-informasi" | "laporan-kegiatan" | "laporan-harian-khusus" | "laporan-khusus-3" | "laporan-harian" | "infosus" | "laporan-harian-intelijen" | "rencana-kegiatan";

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
      colSpan: "col-span-4 lg:col-span-3",
      aspectRatio: "aspect-square sm:aspect-[4/3]",
    },
    {
      id: "laporan-kegiatan" as TemplateType,
      title: "Laporan Kegiatan",
      icon: Activity,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
      colSpan: "col-span-4 lg:col-span-3",
      aspectRatio: "aspect-square sm:aspect-[4/3]",
    },
    {
      id: "laporan-harian" as TemplateType,
      title: "Laporan Harian Situasi",
      icon: Radar,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
      colSpan: "col-span-4 lg:col-span-3",
      aspectRatio: "aspect-square sm:aspect-[4/3]",
    },
    {
      id: "laporan-harian-khusus" as TemplateType,
      title: "Laporan Harian Khusus",
      icon: Shield,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
      colSpan: "col-span-4 lg:col-span-3",
      aspectRatio: "aspect-square sm:aspect-[4/3]",
    },
    {
      id: "infosus" as TemplateType,
      title: "Informasi Khusus",
      icon: Zap,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
      colSpan: "col-span-4 lg:col-span-4",
      aspectRatio: "aspect-square sm:aspect-[4/3]",
    },
    {
      id: "laporan-harian-intelijen" as TemplateType,
      title: "Laporan Harian Intelijen",
      icon: Eye,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
      colSpan: "col-span-4 lg:col-span-4",
      aspectRatio: "aspect-square sm:aspect-[4/3]",
    },
    {
      id: "rencana-kegiatan" as TemplateType,
      title: "Rencana Kegiatan",
      icon: CalendarDays,
      color: "from-purple-500/10 to-indigo-500/10 text-purple-500 dark:text-purple-400",
      borderColor: "hover:border-purple-500/30 selected:border-purple-500",
      colSpan: "col-span-12 lg:col-span-4",
      aspectRatio: "h-16 sm:h-auto sm:aspect-[4/3]",
    },
  ];

  const selectedStyles: Record<TemplateType, string> = {
    "laporan-informasi": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-kegiatan": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-harian": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-harian-khusus": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-khusus-3": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "infosus": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "laporan-harian-intelijen": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
    "rencana-kegiatan": "ring-3 ring-purple-500 dark:ring-purple-400 shadow-xl shadow-purple-500/10 bg-purple-50/10 dark:bg-purple-950/10 border-purple-500/30",
  };

  const checkColor: Record<TemplateType, string> = {
    "laporan-informasi": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-kegiatan": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-harian": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-harian-khusus": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-khusus-3": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "infosus": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "laporan-harian-intelijen": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
    "rencana-kegiatan": "text-purple-600 dark:text-purple-400 fill-purple-500/20",
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold tracking-tight text-neutral-400 dark:text-neutral-500 uppercase">
          1. Pilih Jenis Template Laporan
        </h3>
      </div>

      <div className="grid grid-cols-12 gap-2 md:gap-4 pb-4">
        {templates.map((temp) => {
          const Icon = temp.icon;
          const isSelected = selected === temp.id;

          return (
            <div
              key={temp.id}
              onClick={() => onChange(temp.id)}
              className={`relative cursor-pointer rounded-xl p-3 sm:p-5 glassmorphism transition-all duration-300 group overflow-hidden flex flex-col justify-between ${temp.colSpan} ${temp.aspectRatio} ${
                isSelected
                  ? selectedStyles[temp.id]
                  : "border-neutral-200/50 dark:border-neutral-800/40 hover:bg-white dark:hover:bg-neutral-900/20 hover:shadow-md"
              }`}
            >
              {/* Highlight background glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${temp.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`}
              />

              {/* Rencana Kegiatan - Sleek horizontal row for mobile only */}
              {temp.id === "rencana-kegiatan" && (
                <div className="sm:hidden flex items-center justify-between w-full h-full">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${temp.color} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-neutral-950 dark:text-white leading-snug">
                      {temp.title}
                    </h4>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className={`w-4 h-4 ${checkColor[temp.id]}`} />
                  )}
                </div>
              )}

              {/* Default Vertical Layout for all, hidden for Rencana Giat on mobile */}
              <div className={temp.id === "rencana-kegiatan" ? "hidden sm:flex flex-col justify-between h-full w-full" : "flex flex-col justify-between h-full w-full"}>
                <div className="flex w-full items-start justify-between">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${temp.color}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId="selectedTemplateCheck"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${checkColor[temp.id]}`} />
                    </motion.div>
                  )}
                </div>

                <div className="mt-2">
                  <h4 className="font-bold text-xs sm:text-base text-neutral-950 dark:text-white group-hover:translate-x-0.5 transition-transform duration-300 leading-tight">
                    {temp.title}
                  </h4>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
