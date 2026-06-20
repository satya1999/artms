import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const root = createRoot(document.getElementById("root")!);

if (!convexUrl) {
  // Fail loudly with a helpful message instead of a blank white screen.
  root.render(
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#fff", fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 460 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Configuration required</h1>
        <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6 }}>
          The <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>VITE_CONVEX_URL</code> environment
          variable is not set, so the app can&apos;t connect to the database. Add it in your
          hosting provider&apos;s environment variables and redeploy.
        </p>
      </div>
    </div>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </StrictMode>,
  );
}
