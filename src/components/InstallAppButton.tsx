"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pc_install_prompt_dismissed_until";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own flag — not in the standard navigator typings.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Real PWA install, not a fake "download the app" link to nowhere — this
// app has no App Store/Google Play listing, so "installing" it means
// installing the website itself via the Web App Manifest
// (public/manifest.webmanifest) + service worker (public/sw.js). On
// Chrome/Android/desktop Chrome/Edge, the browser fires `beforeinstallprompt`
// and we trigger its native install prompt. Safari/iOS never fires that
// event (not implemented there), so the real path there is the manual
// Share -> Add to Home Screen flow — this shows instructions instead of a
// button that would otherwise silently do nothing.
export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Best-effort — if registration fails (e.g. unsupported browser),
        // the site still works normally, it just won't be installable.
      });
    }

    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedUntil > Date.now()) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    function onAppInstalled() {
      setInstalled(true);
      setVisible(false);
    }
    window.addEventListener("appinstalled", onAppInstalled);

    // iOS never fires beforeinstallprompt — show the manual-instructions
    // version instead, same dismissal rule.
    if (isIos()) setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setShowIosHelp(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  }

  async function handleInstallClick() {
    if (isIos()) {
      setShowIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (installed || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 999,
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        padding: "14px 16px",
        maxWidth: 280,
        border: "1px solid #eee",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          background: "none",
          border: "none",
          color: "#aaa",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        <i className="fa fa-times" />
      </button>

      {!showIosHelp ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <img src="/icons/icon-192.png" alt="" style={{ width: 36, height: 36, borderRadius: 8 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Install Pueblo Connect</div>
              <div style={{ color: "#888", fontSize: 12 }}>Add it to your home screen</div>
            </div>
          </div>
          <button
            type="button"
            className="mtr-btn signup"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleInstallClick}
          >
            <span>Install</span>
          </button>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Add to Home Screen</div>
          <ol style={{ paddingLeft: 18, margin: 0, color: "#555", fontSize: 13 }}>
            <li style={{ marginBottom: 4 }}>
              Tap the Share icon <i className="fa fa-share-square-o" /> in Safari
            </li>
            <li>Choose &ldquo;Add to Home Screen&rdquo;</li>
          </ol>
        </>
      )}
    </div>
  );
}
