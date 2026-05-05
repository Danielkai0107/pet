/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Airbnb 風：Inter 為主拉丁字，中文 fallback Noto Sans TC，最後系統字保底。
        sans: [
          "Inter",
          "Noto Sans TC",
          "-apple-system",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      colors: {
        // 品牌青藍 — 以 #1ab6c1 為 500，往兩端推出 50–950 完整 ramp。
        // 只用在主 CTA、focus ring、選中狀態描邊與 dot；不再做大背景色塊。
        brand: {
          50: "#eafbfc",
          100: "#d0f5f7",
          200: "#a3eaef",
          300: "#6ddbe2",
          400: "#2cc4ce",
          500: "#1ab6c1",
          600: "#1597a0",
          700: "#137a82",
          800: "#135d63",
          900: "#114a4f",
          950: "#062b2e",
        },
        // neutral 別名 — Airbnb 慣用 neutral 指稱灰階；底層仍是 slate ramp，
        // 之後新組件用 `neutral-*` 命名，舊頁面繼續可用 `slate-*`。
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      borderRadius: {
        // Airbnb 圖片卡 16px、表單 12px
        card: "16px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
