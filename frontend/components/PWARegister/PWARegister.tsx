"use client";

import React, { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(
        (reg) => {
          console.log("Service Worker registered with scope:", reg.scope);
        },
        (err) => {
          console.error("Service Worker registration failed:", err);
        }
      );
    }

    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true);

    if (isStandalone) {
      return;
    }

    // 3. Check if user dismissed prompt in this session
    const isDismissed = sessionStorage.getItem("pwa-prompt-dismissed") === "true";
    if (isDismissed) {
      return;
    }

    // 4. Listen for beforeinstallprompt event (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|opera|twitter|fbav|line/.test(userAgent);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowPrompt(false);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in">
      <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-4 shadow-lg flex flex-col gap-3">
        {/* Banner Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 p-2 rounded-xl border border-neutral-mist shrink-0">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-primary font-display uppercase tracking-wide">
                Recover App Installer
              </h4>
              <p className="text-[10px] text-neutral-slate mt-0.5 leading-tight">
                {isIOS 
                  ? "Add Recover to your home screen for quick offline access." 
                  : "Install our mobile web app for a premium, fast experience."}
              </p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-gray-400 hover:text-primary transition-colors text-xs font-bold px-1.5 py-0.5 rounded-sm hover:bg-neutral-mist shrink-0 cursor-pointer"
            title="Dismiss prompt"
          >
            ✕
          </button>
        </div>

        {/* Action Panel */}
        {isIOS ? (
          /* iOS Instructions Card */
          <div className="bg-neutral-mist/30 rounded-xl p-3 border border-neutral-mist text-[10px] text-neutral-slate space-y-1.5 leading-relaxed">
            <p className="font-semibold text-primary">To install on iOS Safari:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                Tap the <strong className="text-primary">Share</strong> button at the bottom of Safari (square with an arrow).
              </li>
              <li>
                Scroll down the share menu and select <strong className="text-primary">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-accent">Add</strong> in the top right corner.
              </li>
            </ol>
          </div>
        ) : (
          /* Android / Chrome prompt button */
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 bg-neutral-mist hover:bg-neutral-mist/85 text-primary font-semibold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Not Now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-accent hover:bg-accent/90 text-neutral-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
            >
              📲 Install App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
