import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 生產環境構建優化
    minify: "esbuild",
    // 設定 chunk 分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心依賴
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Firebase 相關
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          // LIFF SDK
          'liff': ['@line/liff'],
          // UI 相關庫
          'ui-libs': ['lucide-react', 'react-hot-toast', 'clsx', 'tailwind-merge'],
          // 圖片處理
          'image-compression': ['browser-image-compression'],
        },
      },
    },
    // 提高 chunk 大小警告限制
    chunkSizeWarningLimit: 500,
    // 啟用 source map（僅用於錯誤追蹤）
    sourcemap: false,
  },
  esbuild: {
    // 移除所有 console 和 debugger
    drop: ["console", "debugger"],
  },
});
