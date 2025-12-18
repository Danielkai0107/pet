import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface SuperAdminStats {
  // 商家統計
  totalShops: number;
  activeShops: number;
  trialShops: number;
  expiredShops: number;
  expiringSoonShops: number;

  // 訂閱統計
  monthlySubscriptions: number;
  yearlySubscriptions: number;
  lifetimeFreeSubscriptions: number;

  // 用戶統計
  totalUsers: number;

  // 預約統計
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;

  // 管理員統計
  totalAdmins: number;
}

export const useSuperAdminStats = () => {
  const [stats, setStats] = useState<SuperAdminStats>({
    totalShops: 0,
    activeShops: 0,
    trialShops: 0,
    expiredShops: 0,
    expiringSoonShops: 0,
    monthlySubscriptions: 0,
    yearlySubscriptions: 0,
    lifetimeFreeSubscriptions: 0,
    totalUsers: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    totalAdmins: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. 獲取所有商家數據
      const shopsSnap = await getDocs(collection(db, "shops"));
      const shops = shopsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const now = new Date();
      const thirtyDaysLater = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      let activeCount = 0;
      let trialCount = 0;
      let expiredCount = 0;
      let expiringSoonCount = 0;
      let monthlyCount = 0;
      let yearlyCount = 0;
      let lifetimeFreeCount = 0;

      shops.forEach((shop: any) => {
        const subscription = shop.subscription;

        if (subscription) {
          // 統計訂閱方案
          if (subscription.plan === "monthly") monthlyCount++;
          if (subscription.plan === "yearly") yearlyCount++;
          if (subscription.plan === "lifetime_free") lifetimeFreeCount++;
          if (subscription.plan === "trial") trialCount++;

          // 統計狀態
          if (subscription.status === "active") {
            activeCount++;

            // 檢查是否即將到期（30天內）
            const expiryDate = new Date(subscription.expiryDate);
            if (
              expiryDate <= thirtyDaysLater &&
              subscription.plan !== "lifetime_free"
            ) {
              expiringSoonCount++;
            }
          } else if (subscription.status === "expired") {
            expiredCount++;
          }
        }
      });

      // 2. 獲取所有用戶數據
      const usersSnap = await getDocs(collection(db, "users"));
      const totalUsers = usersSnap.size;

      // 3. 獲取所有預約數據（從每個商家的子集合中統計）
      let totalAppointmentsCount = 0;
      let pendingCount = 0;
      let completedCount = 0;

      // 遍歷所有商家，統計預約數據
      for (const shop of shops) {
        try {
          const appointmentsRef = collection(
            db,
            "shops",
            shop.id,
            "appointments"
          );
          const appointmentsSnap = await getDocs(appointmentsRef);

          totalAppointmentsCount += appointmentsSnap.size;

          appointmentsSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.status === "pending") pendingCount++;
            if (data.status === "completed") completedCount++;
          });
        } catch (err) {
          // 某些商家可能沒有預約，忽略錯誤
          console.warn(`無法讀取商家 ${shop.id} 的預約:`, err);
        }
      }

      // 4. 獲取所有管理員數據
      const adminsSnap = await getDocs(collection(db, "admins"));
      const totalAdmins = adminsSnap.size;

      setStats({
        totalShops: shops.length,
        activeShops: activeCount,
        trialShops: trialCount,
        expiredShops: expiredCount,
        expiringSoonShops: expiringSoonCount,
        monthlySubscriptions: monthlyCount,
        yearlySubscriptions: yearlyCount,
        lifetimeFreeSubscriptions: lifetimeFreeCount,
        totalUsers,
        totalAppointments: totalAppointmentsCount,
        pendingAppointments: pendingCount,
        completedAppointments: completedCount,
        totalAdmins,
      });
    } catch (err: any) {
      console.error("獲取統計數據失敗:", err);
      setError(err.message || "獲取數據失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};
