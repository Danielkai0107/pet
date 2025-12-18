import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { getPerformance } from "firebase/performance";

// 🔧 開發模式：如果沒有 Firebase 配置，使用假配置
const isDevelopment = import.meta.env.DEV;
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

const defaultDevConfig = {
  apiKey: "dev-api-key-for-demo",
  authDomain: "dev-project.firebaseapp.com",
  projectId: "dev-project",
  storageBucket: "dev-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:00000000000000000000",
};

export const firebaseConfig = hasFirebaseConfig
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
  : defaultDevConfig;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// P1-4: Firebase Analytics 和 Performance Monitoring
let analytics: ReturnType<typeof getAnalytics> | null = null;
let performance: ReturnType<typeof getPerformance> | null = null;

// 只在生產環境且有配置時初始化
if (hasFirebaseConfig) {
  // Analytics 需要檢查瀏覽器支援
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });

  // Performance Monitoring
  try {
    performance = getPerformance(app);
  } catch (error) {
    console.warn("Performance monitoring not available:", error);
  }
}

// P1-4: 錯誤追蹤函數（使用 Analytics 的 exception 事件）
export const logError = (
  error: Error,
  context?: Record<string, string | number | boolean>
) => {
  // 記錄到 console
  console.error("Error logged:", error, context);

  // 只在生產環境且 Analytics 可用時發送到 Firebase
  if (analytics && hasFirebaseConfig) {
    try {
      logEvent(analytics, "exception", {
        description: error.message,
        fatal: false,
        stack: error.stack?.substring(0, 100), // 限制長度
        ...context,
      });
    } catch (e) {
      console.warn("Failed to log error to Analytics:", e);
    }
  }
};

// 匯出 Analytics 和 Performance（可能為 null）
export { analytics, performance };

// 🔧 開發模式：連接到模擬器（避免真實 API 調用）
if (isDevelopment && !hasFirebaseConfig) {
  // 注意：這裡不真的連接模擬器，只是使用假配置
  // 實際的 Firebase 調用會失敗，但不會影響 UI 顯示
}

export default app;
