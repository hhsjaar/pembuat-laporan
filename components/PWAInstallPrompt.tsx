"use client";

import { useEffect, useState } from "react";
import { Download, X, Share2, Plus } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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

    // 3. Register the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    // 4. Handle chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);

      // Only show if not dismissed in the last 3 days
      const dismissedUntil = localStorage.getItem("pwa_prompt_dismissed_until");
      const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now();

      if (!isDismissed && !isStandaloneMode) {
        // Show after a brief delay for smoother page loading
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // 3 seconds delay
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. For iOS, if they haven't installed and haven't dismissed, show after 4 seconds
    if (ios && !isStandaloneMode) {
      const dismissedUntil = localStorage.getItem("pwa_prompt_dismissed_until");
      const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now();

      if (!isDismissed) {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      return;
    }

    if (!deferredPrompt) return;

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
    // Dismiss for 3 days
    const nextShowTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa_prompt_dismissed_until", String(nextShowTime));
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
          <div className="glassmorphism rounded-2xl p-5 border border-purple-500/20 shadow-2xl relative bg-neutral-900/90 backdrop-blur-xl dark:bg-purple-950/25">
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

            {/* Dynamic section: Android/Chrome vs iOS Safari instructions */}
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
