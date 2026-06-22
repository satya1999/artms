import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

// The Convex client URL is public (it ships in the browser bundle anyway).
// Use the env var when provided, otherwise fall back to the project's
// deployment so hosting without env config still connects.
const convexUrl =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ||
  "https://neighborly-chihuahua-118.convex.cloud";

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
);

// Register the service worker so the app is installable on mobile
// ("Add to Home Screen") and works as a standalone PWA.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
