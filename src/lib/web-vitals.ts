import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";
import type { Metric } from "web-vitals";
import { logAnalyticsEvent } from "./monitoring";

// 將 Web Vitals 數據發送到 Analytics
const sendToAnalytics = (metric: Metric) => {
  const { name, value, rating, id } = metric;

  logAnalyticsEvent("web_vitals", {
    metric_name: name,
    metric_value: Math.round(name === "CLS" ? value * 1000 : value), // CLS 乘以 1000 以便記錄
    metric_rating: rating,
    metric_id: id,
  });

  // 在開發模式下輸出到控制台
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating,
    });
  }
};

// 初始化 Web Vitals 追蹤
export const initWebVitals = () => {
  try {
    // 累積佈局偏移 (Cumulative Layout Shift)
    // 良好: < 0.1, 需改進: 0.1-0.25, 差: > 0.25
    onCLS(sendToAnalytics);

    // 互動到下次繪製 (Interaction to Next Paint) - FID 的替代者
    // 良好: < 200ms, 需改進: 200-500ms, 差: > 500ms
    onINP(sendToAnalytics);

    // 最大內容繪製 (Largest Contentful Paint)
    // 良好: < 2.5s, 需改進: 2.5-4s, 差: > 4s
    onLCP(sendToAnalytics);

    // 首次內容繪製 (First Contentful Paint)
    // 良好: < 1.8s, 需改進: 1.8-3s, 差: > 3s
    onFCP(sendToAnalytics);

    // 首字節時間 (Time to First Byte)
    // 良好: < 800ms, 需改進: 800-1800ms, 差: > 1800ms
    onTTFB(sendToAnalytics);
  } catch (error) {
    // Web Vitals 可能在某些環境無法使用
  }
};

// 在應用載入時自動初始化
if (typeof window !== "undefined" && !import.meta.env.DEV) {
  // 使用 requestIdleCallback 或 setTimeout 延遲初始化，避免影響主線程
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => initWebVitals());
  } else {
    setTimeout(() => initWebVitals(), 1000);
  }
}
