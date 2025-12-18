import { useState, useEffect, useCallback } from "react";

interface MessageBreakdown {
  appointmentNotifications: number; // 預約通知
  completionNotifications: number; // 完成通知
  reminderNotifications: number; // 提醒通知
}

// LINE 官方配額資料
export interface OfficialQuota {
  total: number; // 每月總配額（例如：500）
  used: number; // 官方統計的已使用數量
  remaining: number; // 剩餘可用數量
  percentage: number; // 使用率百分比
  type: string; // "limited" or "none"
}

export interface LineQuotaData {
  // === LINE 官方配額（新增）===
  officialQuota: OfficialQuota | null;

  // === 系統內部統計（既有）===
  yearMonth: string; // 統計月份 (YYYY-MM)
  totalSent: number; // 本月發送總數
  breakdown: MessageBreakdown; // 各類訊息分類統計

  // === 狀態 ===
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>; // 重新查詢函數
}

export const useLineMessageQuota = (shopId: string | null): LineQuotaData => {
  const [data, setData] = useState<
    Omit<LineQuotaData, "loading" | "error" | "refetch">
  >({
    officialQuota: null,
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

        // Mock 官方配額資料（台灣輕用量方案：200 則）
        const mockUsed = 123;
        const mockTotal = 200;

        setData({
          officialQuota: {
            total: mockTotal,
            used: mockUsed,
            remaining: mockTotal - mockUsed,
            percentage: (mockUsed / mockTotal) * 100,
            type: "limited",
          },
          yearMonth: `${year}-${month}`,
          totalSent: 123,
          breakdown: {
            appointmentNotifications: 67,
            completionNotifications: 38,
            reminderNotifications: 18,
          },
        });
        setLoading(false);
        return;
      }

      const functionUrl =
        import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ||
        "https://asia-east1-pet-crm-bb6e9.cloudfunctions.net";

      // 並行查詢官方配額和系統統計
      const [officialRes, statsRes] = await Promise.all([
        fetch(`${functionUrl}/getLineOfficialQuota?shopId=${shopId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }).catch((err) => {
          console.warn("查詢 LINE 官方配額失敗", err);
          return null;
        }),
        fetch(`${functionUrl}/getLineMessageQuota?shopId=${shopId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      // 解析系統統計（必須成功）
      if (!statsRes.ok) {
        const errorData = await statsRes.json();
        throw new Error(errorData.message || "查詢系統統計失敗");
      }

      const statsResult = await statsRes.json();
      if (!statsResult.success) {
        throw new Error(statsResult.message || "查詢使用量失敗");
      }

      // 解析官方配額（允許失敗，作為降級方案）
      let officialQuota: OfficialQuota | null = null;

      if (officialRes && officialRes.ok) {
        try {
          const officialResult = await officialRes.json();
          if (officialResult.success && officialResult.data) {
            officialQuota = {
              total: officialResult.data.quota,
              used: officialResult.data.used,
              remaining: officialResult.data.remaining,
              percentage: officialResult.data.percentage,
              type: officialResult.data.type,
            };
          }
        } catch (err) {
          console.warn("解析 LINE 官方配額失敗", err);
          // 繼續使用系統統計
        }
      }

      // 合併資料
      setData({
        officialQuota,
        yearMonth: statsResult.yearMonth,
        totalSent: statsResult.stats.totalSent,
        breakdown: statsResult.stats.breakdown,
      });
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
