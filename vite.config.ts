import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("/victory-")) return "charts";
          if (id.includes("/react-dom/") || id.includes("/react-router") || id.includes("/react/") || id.includes("/scheduler/")) return "react-vendor";
          if (id.includes("/convex/") || id.includes("@tanstack")) return "data";
        },
      },
    },
  },
});
