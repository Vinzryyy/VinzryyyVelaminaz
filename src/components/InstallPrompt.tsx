import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      // Only show if user hasn't dismissed before
      if (!sessionStorage.getItem("pwa-dismissed")) {
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt = null;
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[fade-up_0.4s_ease-out]">
      <div className="flex items-center gap-3 rounded-full border border-hairline bg-card/95 px-5 py-2.5 shadow-lg backdrop-blur-sm">
        <span className="font-mono text-xs text-muted">Add to Home Screen</span>
        <button
          onClick={handleInstall}
          className="rounded-full bg-crimson px-4 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-crimson/80"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-full text-faint transition-colors hover:bg-faint/20 hover:text-muted"
          aria-label="Dismiss install prompt"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
