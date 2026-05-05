import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          liff: ["@line/liff"],
          "ui-libs": ["lucide-react", "react-hot-toast", "clsx", "tailwind-merge"],
          "image-compression": ["browser-image-compression"],
          "date-utils": ["date-fns"],
        },
      },
    },
  },
});
