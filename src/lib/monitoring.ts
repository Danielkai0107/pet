import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";
import { getPerformance } from "firebase/performance";
import { firebaseConfig } from "./firebase";

let analytics: Analytics | null = null;
let performance: ReturnType<typeof getPerformance> | null = null;

// 初始化監控工具（僅在瀏覽器環境且非開發模式）
export const initMonitoring = () => {
  try {
    // 檢查是否在瀏覽器環境
    if (typeof window === "undefined") return;

    // 開發模式跳過
    if (import.meta.env.DEV) {
      return;
    }

    // 確保 Firebase app 已初始化
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

    // 初始化 Analytics
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      // Analytics 可能在某些環境無法使用（如 localhost）
    }

    // 初始化 Performance Monitoring
    try {
      performance = getPerformance(app);
    } catch (error) {
      // Performance 可能在某些環境無法使用
    }
  } catch (error) {
    // 靜默失敗，不影響應用主流程
  }
};

// 記錄自定義事件
export const logAnalyticsEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    }
  } catch (error) {
    // 靜默失敗
  }
};

// 記錄頁面瀏覽
export const logPageView = (pagePath: string, pageTitle: string) => {
  logAnalyticsEvent("page_view", {
    page_path: pagePath,
    page_title: pageTitle,
  });
};

// 記錄 LIFF 初始化時間
export const logLiffInitTime = (duration: number) => {
  logAnalyticsEvent("liff_init_duration", {
    duration_ms: duration,
    value: duration,
  });
};

// 記錄預約完成
export const logAppointmentCompleted = (serviceType: string, shopId: string) => {
  logAnalyticsEvent("appointment_completed", {
    service_type: serviceType,
    shop_id: shopId,
  });
};

// 記錄預約取消
export const logAppointmentCancelled = (appointmentId: string, shopId: string) => {
  logAnalyticsEvent("appointment_cancelled", {
    appointment_id: appointmentId,
    shop_id: shopId,
  });
};

// 記錄錯誤
export const logError = (error: Error, context?: string) => {
  logAnalyticsEvent("error_occurred", {
    error_message: error.message,
    error_stack: error.stack?.substring(0, 500), // 限制長度
    context: context || "unknown",
  });
};

// 記錄用戶操作
export const logUserAction = (action: string, details?: Record<string, any>) => {
  logAnalyticsEvent("user_action", {
    action,
    ...details,
  });
};

// 導出 performance 實例供其他地方使用
export const getPerformanceMonitoring = () => performance;

// 導出 analytics 實例供其他地方使用
export const getAnalyticsInstance = () => analytics;

// 自動初始化
if (typeof window !== "undefined") {
  initMonitoring();
}
