// src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import "./App.css";

// PWA / Service Worker
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import { askNotificationOnFirstInteraction } from "./serviceWorkerRegistration";

import { RESOLVED_API_BASE, RESOLVED_VAPID_PUBLIC } from "./lib/env";

// Pastikan ada #root di public/index.html
const rootEl = document.getElementById("root");
if (!rootEl) {
  const el = document.createElement("div");
  el.style.padding = "16px";
  el.innerText = "Root element #root tidak ditemukan. Cek public/index.html.";
  document.body.appendChild(el);
  throw new Error("Missing #root element");
}

// Render React
const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ===== Service Worker & Web Push =====
serviceWorkerRegistration.register();

// ✅ DEBUG nilai env (penting)
console.log("[ENV] RESOLVED_API_BASE =", RESOLVED_API_BASE);
console.log("[ENV] RESOLVED_VAPID_PUBLIC =", RESOLVED_VAPID_PUBLIC);

if (typeof askNotificationOnFirstInteraction === "function") {
  try {
    askNotificationOnFirstInteraction(RESOLVED_VAPID_PUBLIC, RESOLVED_API_BASE);
  } catch (e) {
    console.warn("[PWA] askNotificationOnFirstInteraction error:", e);
  }
}