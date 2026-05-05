/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
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
        // 主色系維持原本 teal — 用於 CTA、品牌識別、選中狀態
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        // 價格 / 緊湊 / 限時感的橘紅 accent — 對標 Trip.com 訂房系紅橘色
        // 但飽和度降低、避開正紅，讓它跟 teal 主色和諧共存
        price: {
          50: "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      borderRadius: {
        // Trip.com 風卡片偏向 8-12px，避免過圓；對應我們的 .card 設定
        card: "12px",
      },
      boxShadow: {
        // 卡片用：細、低、淡藍灰調，比預設 shadow-sm 還精緻
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 4px 0 rgb(15 23 42 / 0.04)",
        "card-hover":
          "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -1px rgb(15 23 42 / 0.06)",
        // 浮動 sticky bar 用
        "bar-up":
          "0 -4px 14px -2px rgb(15 23 42 / 0.08), 0 -1px 3px 0 rgb(15 23 42 / 0.04)",
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
