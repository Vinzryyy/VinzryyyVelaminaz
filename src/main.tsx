import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@/index.css";
import App from "@/App";
import { observeWebVitals } from "@/lib/analytics";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Track Core Web Vitals (LCP, CLS, FCP) locally
observeWebVitals();

// Register service worker for offline gallery viewing
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Checked before registering: once the new SW activates it claims this page,
    // so `controller` is set by then even on a first visit.
    const replacingOldSW = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // When a new SW replaces an old one, reload to pick up the latest version.
      // Not on a first visit: there's nothing stale, and reloading would
      // download the whole page twice.
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW || !replacingOldSW) return;
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "activated") {
            window.location.reload();
          }
        });
      });
    }).catch((e) => console.warn("SW registration failed:", e));
  });
}
