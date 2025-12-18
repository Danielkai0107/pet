import { useState, useEffect, useCallback } from "react";

interface MessageBreakdown {
  appointmentNotifications: number; // 預約通知
  completionNotifications: number; // 完成通知
  reminderNotifications: number; // 提醒通知
}

export interface LineQuotaData {
  yearMonth: string; // 統計月份 (YYYY-MM)
  totalSent: number; // 本月發送總數
  breakdown: MessageBreakdown; // 各類訊息分類統計
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>; // 重新查詢函數
}

export const useLineMessageQuota = (shopId: string | null): LineQuotaData => {
  const [data, setData] = useState<
    Omit<LineQuotaData, "loading" | "error" | "refetch">
  >({
    yearMonth: "",
    totalSent: 0,
    breakdown: {
      appointmentNotifications: 0,
      completionNotifications: 0,
      reminderNotifications: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);

    try {
      // 🔧 開發模式：返回假資料
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        // 模擬網路延遲
        await new Promise((resolve) => setTimeout(resolve, 500));

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");

        setData({
          yearMonth: `${year}-${month}`,
          totalSent: 247,
          breakdown: {
            appointmentNotifications: 123,
            completionNotifications: 89,
            reminderNotifications: 35,
          },
        });
        setLoading(false);
        return;
      }

      const functionUrl =
        import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ||
        "https://asia-east1-pet-crm-bb6e9.cloudfunctions.net";

      const response = await fetch(
        `${functionUrl}/getLineMessageQuota?shopId=${shopId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "查詢配額失敗");
      }

      const result = await response.json();

      if (result.success) {
        setData({
          yearMonth: result.yearMonth,
          totalSent: result.stats.totalSent,
          breakdown: result.stats.breakdown,
        });
      } else {
        throw new Error(result.message || "查詢使用量失敗");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤");
      console.error("查詢 LINE 訊息配額失敗", err);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchQuota,
  };
};
