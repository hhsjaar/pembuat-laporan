"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Send, Volume2, VolumeX, Loader2, Play, Search, FileText, Download } from "lucide-react";

// Custom markdown renderer helper to format bold highlights, bullets, and tables inside the bubble chat
function parseMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentList: React.ReactNode[] = [];
  let inList = false;
  let tableRows: string[][] = [];
  let inTable = false;

  const renderInline = (str: string) => {
    // Split by **text** for bold text highlight
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return (
          <strong key={idx} className="text-yellow-400 dark:text-yellow-300 font-extrabold bg-white/10 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 shadow-sm whitespace-pre-wrap">
            {part}
          </strong>
        );
      }
      // Split by *text* for italicized emphasis
      const subParts = part.split(/\*([^*]+)\*/g);
      return subParts.map((subPart, sIdx) => {
        if (sIdx % 2 === 1) {
          return <span key={sIdx} className="text-purple-300 font-semibold">{subPart}</span>;
        }
        return subPart;
      });
    });
  };

  const flushList = (key: number) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc list-inside pl-1 space-y-1.5 my-2 text-neutral-200">
          {currentList}
        </ul>
      );
      currentList = [];
      inList = false;
    }
  };

  const flushTable = (key: number) => {
    if (tableRows.length > 0) {
      const headers = tableRows[0];
      // Skip the alignment row (usually dashes |---|---|) at index 1
      const rows = tableRows.slice(1).filter(row => !row.every(cell => cell.match(/^:?-+:?$/)));
      
      elements.push(
        <div key={`table-${key}`} className="overflow-x-auto my-3 rounded-xl border border-neutral-800 bg-neutral-900/40 shadow-inner max-w-full">
          <table className="min-w-full text-[10px] text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/80">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-2.5 py-1.5 font-bold text-neutral-400 uppercase tracking-wider">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1 text-neutral-200 font-medium">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check Markdown Table row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList(i);
      inTable = true;
      const cells = trimmed
        .split("|")
        .slice(1, -1) // remove empty leading/trailing pipes split
        .map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else {
      flushTable(i);
    }

    // Check Bullet List item
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      currentList.push(
        <li key={`li-${i}`} className="leading-relaxed text-xs">
          {renderInline(trimmed.substring(2))}
        </li>
      );
      continue;
    } else if (trimmed.match(/^\d+\.\s/)) {
      // Numbered List item
      inList = true;
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      currentList.push(
        <li key={`li-${i}`} className="list-decimal leading-relaxed text-xs ml-3">
          {renderInline(match ? match[2] : trimmed)}
        </li>
      );
      continue;
    } else {
      flushList(i);
    }

    // Paragraph
    if (trimmed.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed text-xs text-neutral-200">
          {renderInline(line)}
        </p>
      );
    } else {
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
    }
  }

  // Flush remaining elements
  flushList(lines.length);
  flushTable(lines.length);

  return <div className="space-y-1.5">{elements}</div>;
}

interface Message {
  sender: "ai" | "user";
  text: string;
  matchedReports?: any[];
}

interface VoiceAssistantProps {
  onSelectTemplate: (templateId: string) => void;
  onViewReport: (reportId: string) => void;
  historyList: any[];
}

export default function VoiceAssistant({ onSelectTemplate, onViewReport, historyList }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [textQuery, setTextQuery] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "ai", text: "Halo, saya asisten AI Polsek Tembalang. Ada yang bisa saya bantu hari ini?" }
  ]);

  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  // Update drag constraints dynamically based on window size to prevent dragging offscreen
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateConstraints = () => {
        setDragConstraints({
          left: -window.innerWidth + 80,
          right: 0,
          top: -window.innerHeight + 120,
          bottom: 0,
        });
      };
      updateConstraints();
      window.addEventListener("resize", updateConstraints);
      return () => window.removeEventListener("resize", updateConstraints);
    }
  }, []);

  // Speech APIs Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "id-ID";

        recognition.onstart = () => {
          setIsListening(true);
          setTranscript("");
          stopSpeaking();
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setTranscript((prev) => {
            if (prev.trim()) {
              handleSubmitQuery(prev);
            }
            return prev;
          });
        };

        recognitionRef.current = recognition;
      }

      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Auto-scroll when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript, isLoading, isOpen]);

  // Handle Voice Speak (TTS)
  const speakText = (text: string) => {
    if (!synthRef.current || isMuted) return;

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    
    const voices = synthRef.current.getVoices();
    const idVoice = voices.find(v => v.lang.startsWith("id") || v.lang.startsWith("ms"));
    if (idVoice) utterance.voice = idVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Browser Anda tidak mendukung fitur Speech Recognition.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start Speech Recognition:", e);
      }
    }
  };

  const handleDownloadDocx = async (text: string) => {
    try {
      const res = await fetch("/api/export-assistant-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Gagal mengekspor dokumen.");

      // Receive binary blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `draf-asisten-suara-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh berkas Word. Silakan coba lagi.");
    }
  };

  const handleSubmitQuery = async (queryStr: string) => {
    if (!queryStr.trim()) return;

    // 1. Push user message to chronological chat list
    setMessages((prev) => [...prev, { sender: "user", text: queryStr }]);
    
    setIsLoading(true);
    stopSpeaking();
    setTranscript("");
    setTextQuery("");

    try {
      const res = await fetch("/api/voice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryStr }),
      });

      if (!res.ok) throw new Error("Gagal memproses kueri.");
      const data = await res.json();

      // 2. Push AI reply and results to chronological chat list
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply || "Maaf, saya tidak memahami hal tersebut.",
          matchedReports: data.matchedReports || [],
        },
      ]);

      // Speak reply (strip markdown formatting for clean vocal output)
      if (data.reply) {
        const cleanSpeakText = data.reply
          .replace(/\|/g, " ")
          .replace(/\*\*+/g, "")
          .replace(/-+/g, " ")
          .replace(/\n+/g, " ");
        speakText(cleanSpeakText);
      }

      // Execute actions if any
      if (data.action && data.action.type !== "none") {
        const { type, target } = data.action;
        if (type === "select_template" && target) {
          onSelectTemplate(target);
        } else if (type === "view_report" && target) {
          onViewReport(target);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Maaf, saya mengalami kegagalan sistem saat menghubungi asisten AI.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    stopSpeaking();
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        type="button"
        drag
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        dragMomentum={false}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center cursor-pointer overflow-visible border border-purple-400/20 touch-none select-none"
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Mic className="w-6 h-6" />
              <span className="absolute -inset-1.5 rounded-full bg-purple-500/20 animate-ping -z-10" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Assistant panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-[420px] max-h-[520px] z-50 flex flex-col bg-neutral-950/95 backdrop-blur-2xl rounded-3xl border border-neutral-800/80 shadow-2xl text-white overflow-hidden animate-fade-in"
          >
            {/* Glowing spot backgrounds */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl -z-10" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl -z-10" />

            {/* Header */}
            <div className="p-4 border-b border-neutral-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  AI Voice Assistant
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Mute toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (!isMuted) stopSpeaking();
                  }}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Conversation Content */}
            <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto space-y-4 min-h-[250px] max-h-[350px] custom-scrollbar">
              {messages.map((msg, index) => (
                <div key={index} className="space-y-2 animate-slide-up">
                  {msg.sender === "ai" ? (
                    <div className="flex gap-2.5 items-start">
                      <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        AI
                      </div>
                      <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] shadow-md relative group">
                        {parseMarkdown(msg.text)}
                        
                        {/* Download button for drafts/calculations */}
                        {(() => {
                          const isSubstantive = 
                            msg.text.includes("|") || 
                            msg.text.includes("- ") || 
                            msg.text.includes("* ") || 
                            /^\d+\.\s/m.test(msg.text) || 
                            msg.text.length > 160 || 
                            (msg.matchedReports && msg.matchedReports.length > 0);
                          
                          if (!isSubstantive) return null;

                          return (
                            <div className="mt-2.5 pt-1.5 border-t border-neutral-800/40 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDownloadDocx(msg.text)}
                                className="flex items-center gap-1.5 text-[9px] font-bold text-neutral-400 hover:text-white bg-neutral-800/40 hover:bg-purple-600/80 px-2 py-1 rounded-lg transition-all cursor-pointer shadow-sm border border-neutral-700/30 active:scale-95 select-none"
                                title="Unduh Draf sebagai berkas Word (.docx)"
                              >
                                <Download className="w-3 h-3 text-purple-400 group-hover:text-white" />
                                <span>Unduh Word</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 items-start justify-end">
                      <div className="bg-purple-600/90 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs leading-relaxed max-w-[85%] shadow-md font-medium">
                        {msg.text}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                        U
                      </div>
                    </div>
                  )}

                  {/* Render matched reports below this specific AI reply if present */}
                  {msg.sender === "ai" && msg.matchedReports && msg.matchedReports.length > 0 && (
                    <div className="space-y-2 pt-1 pl-8">
                      <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                        <Search className="w-3 h-3 text-purple-500" /> Hasil Pencarian Laporan:
                      </div>
                      <div className="space-y-1.5 max-w-[90%]">
                        {msg.matchedReports.map((report) => (
                          <div
                            key={report.id}
                            onClick={() => {
                              onViewReport(report.id);
                              speakText(`Membuka laporan mengenai ${report.perihal}`);
                            }}
                            className="p-2.5 bg-neutral-900/30 hover:bg-neutral-800/50 border border-neutral-800/60 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1 rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-colors shrink-0">
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <h5 className="text-[11px] font-bold text-neutral-200 group-hover:text-white truncate">
                                  {report.perihal}
                                </h5>
                                <span className="text-[8px] text-neutral-500 block mt-0.5">
                                  {new Date(report.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                            <Play className="w-2.5 h-2.5 text-neutral-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Real-time active speech transcript */}
              {isListening && transcript && (
                <div className="flex gap-2.5 items-start justify-end animate-pulse">
                  <div className="bg-purple-600/40 text-neutral-200 rounded-2xl rounded-tr-sm px-3.5 py-2 text-xs leading-relaxed max-w-[85%] italic">
                    {transcript}...
                  </div>
                  <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    U
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                    AI
                  </div>
                  <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-neutral-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                    Berpikir...
                  </div>
                </div>
              )}
            </div>

            {/* Siri / Voice visualization bars */}
            <div className="h-10 border-t border-neutral-900 bg-neutral-950 flex items-center justify-center px-4 overflow-hidden">
              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.div
                    key="listening-wave"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 h-6"
                  >
                    {[...Array(9)].map((_, idx) => (
                      <motion.span
                        key={idx}
                        className="w-1 bg-gradient-to-t from-purple-500 to-indigo-500 rounded-full"
                        animate={{
                          height: [4, 20, 4],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: idx * 0.07,
                        }}
                      />
                    ))}
                  </motion.div>
                ) : isSpeaking ? (
                  <motion.div
                    key="speaking-wave"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 h-6"
                  >
                    {[...Array(5)].map((_, idx) => (
                      <motion.span
                        key={idx}
                        className="w-1.5 bg-gradient-to-t from-indigo-500 to-pink-500 rounded-full"
                        animate={{
                          height: [6, 16, 6],
                        }}
                        transition={{
                          duration: 0.4,
                          repeat: Infinity,
                          delay: idx * 0.1,
                        }}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-semibold text-neutral-500"
                  >
                    Klik mikrofon untuk berbicara atau ketik di bawah
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat / Mic input controls */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitQuery(textQuery);
              }}
              className="p-4 bg-neutral-950 border-t border-neutral-900 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  isListening
                    ? "bg-red-500/20 border-red-500/30 text-red-400 animate-pulse"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="Ketik pertanyaan/perintah..."
                className="flex-grow bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />

              <button
                type="submit"
                disabled={isLoading || !textQuery.trim()}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 animate-pulse"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
