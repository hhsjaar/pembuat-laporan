"use client";

import { useEffect, useState } from "react";
import { Download, X, Share2, Plus } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// In-memory variable to track if the prompt has been dismissed during this active page load.
// It will reset back to false upon page refresh, allowing users to see the prompt again.
let hasDismissedInSession = false;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if the app is already running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const isStandaloneMode = checkStandalone();

    // 2. Check if the user is on iOS Safari
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIpadOrIphone = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
      setIsIOS(isIpadOrIphone);
      return isIpadOrIphone;
    };

    const ios = checkIOS();

    // 3. Check if device is mobile
    const checkMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };
    checkMobile();

    // 4. Register the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    // 5. Handle chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 6. Show prompt for everyone after 5 seconds if not dismissed and not already installed
    // Clear legacy localStorage blocker to immediately show to the user during testing
    localStorage.removeItem("pwa_prompt_dismissed_until");

    const isDismissed = hasDismissedInSession;

    if (!isDismissed && !isStandaloneMode) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // 5 seconds delay
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      return;
    }

    if (!deferredPrompt) {
      // Native prompt not supported or ready yet, display browser instructions instead
      setShowInstructions(true);
      return;
    }

    // Show the browser's install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // We no longer need the prompt, clear it
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    hasDismissedInSession = true;
  };

  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-4 bottom-4 md:bottom-6 md:right-6 md:left-auto md:w-[380px] z-50"
        >
          <div className="glassmorphism rounded-2xl p-5 border border-purple-500/25 shadow-2xl relative bg-neutral-900/95 backdrop-blur-xl dark:bg-purple-950/40">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex gap-4 items-start pr-6">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-purple-500/30 bg-purple-950/50 shadow-md">
                <Image
                  src="/icon-192.png"
                  alt="Pembuat Laporan Logo"
                  width={56}
                  height={56}
                  className="object-cover"
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">
                  Instal Pembuat Laporan
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Dapatkan akses instan untuk membuat laporan resmi dari rekaman suara, foto lapangan, dan catatan langsung dari layar utama Anda.
                </p>
              </div>
            </div>

            {/* Dynamic sections */}
            {isIOS ? (
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-purple-900/40 space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Langkah instalasi iOS Safari:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>
                    Ketuk tombol Bagikan <Share2 className="inline-block w-3.5 h-3.5 mx-0.5 text-neutral-500 dark:text-neutral-400" /> (Share) di Safari.
                  </li>
                  <li>
                    Pilih <span className="font-bold text-neutral-900 dark:text-white">Tambahkan ke Layar Utama</span> <Plus className="inline-block w-3.5 h-3.5 mx-0.5 text-neutral-500 dark:text-neutral-400" /> (Add to Home Screen).
                  </li>
                </ol>
                <button
                  onClick={handleDismiss}
                  className="w-full mt-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  Saya Mengerti
                </button>
              </div>
            ) : showInstructions ? (
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-purple-900/40 space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {isMobile ? "Langkah instalasi Android:" : "Langkah instalasi Browser/Desktop:"}
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  {isMobile ? (
                    <>
                      <li>Ketuk ikon menu tiga titik <span className="font-bold text-neutral-900 dark:text-white">⋮</span> di pojok kanan atas browser Anda.</li>
                      <li>Pilih <span className="font-bold text-neutral-900 dark:text-white">Tambahkan ke Layar Utama</span> atau <span className="font-bold text-neutral-900 dark:text-white">Instal Aplikasi</span>.</li>
                    </>
                  ) : (
                    <>
                      <li>Ketuk ikon instalasi (berbentuk layar monitor atau tanda panah unduh) di sebelah kanan kolom alamat (URL bar) browser Anda.</li>
                      <li>Atau ketuk menu tiga titik <span className="font-bold text-neutral-900 dark:text-white">⋮</span> di pojok kanan atas, lalu pilih <span className="font-bold text-neutral-900 dark:text-white">Simpan dan bagikan</span>, kemudian pilih <span className="font-bold text-neutral-900 dark:text-white">Instal Aplikasi</span>.</li>
                    </>
                  )}
                </ol>
                <button
                  onClick={handleDismiss}
                  className="w-full mt-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  Saya Mengerti
                </button>
              </div>
            ) : (
              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer text-center"
                >
                  Nanti Saja
                </button>
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-md shadow-purple-600/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Instal
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
