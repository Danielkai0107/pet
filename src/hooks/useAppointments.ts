import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
  runTransaction,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Appointment } from "../types/appointment";

export const useAppointments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAppointment = async (appointment: any) => {
    setLoading(true);
    setError(null);
    try {
      // 🔧 開發模式：如果是測試商店，模擬成功
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (
        isDevelopment &&
        !hasFirebaseConfig &&
        appointment.shopId === "test-shop-123"
      ) {
        // 模擬網路延遲
        await new Promise((resolve) => setTimeout(resolve, 500));
        setLoading(false);
        return true;
      }

      await runTransaction(db, async (transaction) => {
        // Reference to the daily schedule for this shop
        const scheduleRef = doc(
          db,
          `shops/${appointment.shopId}/daily_schedules/${appointment.date}`
        );
        const scheduleDoc = await transaction.get(scheduleRef);

        let bookings: { start: number; end: number; appointmentId: string }[] =
          [];

        if (scheduleDoc.exists()) {
          bookings = scheduleDoc.data().bookings || [];
        }

        // Calculate new appointment start/end in minutes
        const startHour = parseInt(appointment.time.split(":")[0]);
        const startMin = parseInt(appointment.time.split(":")[1] || "0");
        const startTimeInMinutes = startHour * 60 + startMin;
        const endTimeInMinutes = startTimeInMinutes + appointment.duration;

        // Check for conflicts (智能檢查：排除已取消的預約)
        // 檢查每個時段對應的預約是否還有效
        const validBookings: typeof bookings = [];
        for (const booking of bookings) {
          const existingAptRef = doc(
            db,
            "shops",
            appointment.shopId,
            "appointments",
            booking.appointmentId
          );
          const existingAptDoc = await transaction.get(existingAptRef);

          if (existingAptDoc.exists()) {
            const existingApt = existingAptDoc.data();
            // 只保留未取消的預約時段
            if (existingApt.status !== "cancelled") {
              validBookings.push(booking);
            }
          }
        }

        const hasConflict = validBookings.some((booking) => {
          // Overlap formula: (StartA < EndB) and (EndA > StartB)
          const isConflict =
            startTimeInMinutes < booking.end &&
            endTimeInMinutes > booking.start;
          return isConflict;
        });

        if (hasConflict) {
          throw new Error("此時段已被預約，請選擇其他時間。");
        }

        // 如果清理了無效時段，更新 schedule
        if (validBookings.length < bookings.length) {
          transaction.set(
            scheduleRef,
            {
              bookings: validBookings,
            },
            { merge: true }
          );
        }

        // No conflict: Prepare writes
        const newAppointmentRef = doc(
          collection(db, "shops", appointment.shopId, "appointments")
        );
        const newBooking = {
          start: startTimeInMinutes,
          end: endTimeInMinutes,
          appointmentId: newAppointmentRef.id,
        };

        // 1. Create Appointment
        transaction.set(newAppointmentRef, {
          ...appointment,
          shopId: String(appointment.shopId),
          status: "pending",
          createdAt: Timestamp.now(),
        });

        // 2. Update Schedule (使用清理後的有效時段)
        transaction.set(
          scheduleRef,
          {
            bookings: [...validBookings, newBooking],
          },
          { merge: true }
        );
      });

      return true;
    } catch (err: any) {
      if (err.message.includes("此時段已被預約")) {
        throw err; // Re-throw specifically for UI
      }
      setError("預約失敗，請稍後再試");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Admin: Subscribe to appointments, filtered by shopId if provided
  const useAppointmentList = (shopId?: string) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    useEffect(() => {
      // 🔧 開發模式：如果是測試商店，返回假資料
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig && shopId === "test-shop-123") {
        const mockAppointments: Appointment[] = [
          {
            id: "apt-1",
            shopId: "test-shop-123",
            userId: "dev-user-123",
            customerName: "測試客戶 A",
            phone: "0912345678",
            petName: "小白",
            petSpecies: "狗",
            petSize: "小型",
            serviceType: "基礎洗澡",
            servicePrice: 500,
            duration: 60,
            date: "2025-12-15",
            time: "10:00",
            status: "confirmed",
            createdAt: Timestamp.now(),
          },
          {
            id: "apt-2",
            shopId: "test-shop-123",
            userId: "dev-user-456",
            customerName: "測試客戶 B",
            phone: "0923456789",
            petName: "小黑",
            petSpecies: "貓",
            petSize: "中型",
            serviceType: "美容造型",
            servicePrice: 1200,
            duration: 120,
            date: "2025-12-15",
            time: "14:00",
            status: "pending",
            createdAt: Timestamp.now(),
          },
        ];
        setAppointments(mockAppointments);
        return;
      }

      if (!shopId) {
        console.warn(
          "useAppointmentList: shopId is required in Multi-Tenant mode"
        );
        return;
      }

      // P0 優化：加入日期範圍篩選（近 3 個月）和查詢限制
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

      // Multi-Tenant: 使用 subcollection，限制查詢範圍
      const q = query(
        collection(db, "shops", shopId, "appointments"),
        where("date", ">=", threeMonthsAgoStr),
        orderBy("date", "desc"),
        orderBy("time", "asc"),
        limit(100) // 限制最多載入 100 筆
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: Appointment[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Appointment);
        });
        setAppointments(data);
      });

      return () => unsubscribe();
    }, [shopId]);

    return { appointments };
  };

  // User: Subscribe to their own appointments, optionally filtered by shopId
  const useUserAppointments = (userId?: string, shopId?: string) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    useEffect(() => {
      if (!userId) return;

      // 🔧 開發模式：返回假的用戶預約資料（包含進行中和歷史紀錄）
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig && userId === "dev-user-123") {
        // 獲取今天和未來的日期
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const formatDate = (date: Date) => {
          return date.toISOString().split("T")[0];
        };

        const mockUserAppointments: Appointment[] = [
          // 進行中的預約 - 待確認
          {
            id: "user-apt-1",
            shopId: "test-shop-123",
            userId: "dev-user-123",
            customerName: "測試用戶",
            phone: "0912345678",
            petName: "小白",
            petSpecies: "狗",
            petSize: "小型",
            petPhoto:
              "https://ui-avatars.com/api/?name=小白&background=f59e0b&color=fff&size=100",
            serviceType: "基礎洗澡",
            servicePrice: 500,
            duration: 60,
            date: formatDate(tomorrow),
            time: "10:00",
            status: "pending",
            notes: "狗狗比較怕水，請溫柔一點",
            createdAt: Timestamp.now(),
          },
          // 進行中的預約 - 已確認
          {
            id: "user-apt-2",
            shopId: "test-shop-123",
            userId: "dev-user-123",
            customerName: "測試用戶",
            phone: "0912345678",
            petName: "花花",
            petSpecies: "貓",
            petSize: "中型",
            petPhoto:
              "https://ui-avatars.com/api/?name=花花&background=ec4899&color=fff&size=100",
            serviceType: "美容造型",
            servicePrice: 1200,
            duration: 120,
            date: formatDate(nextWeek),
            time: "14:00",
            status: "confirmed",
            notes: "想要蝴蝶結造型",
            createdAt: Timestamp.now(),
          },
          // 歷史紀錄 - 已完成
          {
            id: "user-apt-3",
            shopId: "test-shop-123",
            userId: "dev-user-123",
            customerName: "測試用戶",
            phone: "0912345678",
            petName: "小白",
            petSpecies: "狗",
            petSize: "小型",
            petPhoto:
              "https://ui-avatars.com/api/?name=小白&background=f59e0b&color=fff&size=100",
            serviceType: "藥浴SPA",
            servicePrice: 800,
            duration: 90,
            date: formatDate(lastWeek),
            time: "11:00",
            status: "completed",
            notes: "皮膚過敏治療",
            createdAt: Timestamp.now(),
          },
          // 歷史紀錄 - 已完成
          {
            id: "user-apt-4",
            shopId: "test-shop-123",
            userId: "dev-user-123",
            customerName: "測試用戶",
            phone: "0912345678",
            petName: "花花",
            petSpecies: "貓",
            petSize: "中型",
            petPhoto:
              "https://ui-avatars.com/api/?name=花花&background=ec4899&color=fff&size=100",
            serviceType: "基礎洗澡",
            servicePrice: 500,
            duration: 60,
            date: formatDate(lastMonth),
            time: "15:00",
            status: "completed",
            createdAt: Timestamp.now(),
          },
          // 歷史紀錄 - 已取消
          {
            id: "user-apt-5",
            shopId: "test-shop-123",
            userId: "dev-user-123",
            customerName: "測試用戶",
            phone: "0912345678",
            petName: "小白",
            petSpecies: "狗",
            petSize: "小型",
            petPhoto:
              "https://ui-avatars.com/api/?name=小白&background=f59e0b&color=fff&size=100",
            serviceType: "美容造型",
            servicePrice: 1200,
            duration: 120,
            date: formatDate(lastWeek),
            time: "16:00",
            status: "cancelled",
            notes: "臨時有事取消",
            createdAt: Timestamp.now(),
          },
        ];

        setAppointments(mockUserAppointments);
        return;
      }

      // Multi-Tenant: shopId 必填
      if (!shopId) {
        console.warn(
          "useUserAppointments: shopId is required in Multi-Tenant mode"
        );
        return;
      }

      // P0 優化：只查詢近 6 個月的預約記錄
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

      // 使用 subcollection 查詢，加入日期範圍和限制
      const q = query(
        collection(db, "shops", shopId, "appointments"),
        where("userId", "==", userId),
        where("date", ">=", sixMonthsAgoStr),
        orderBy("date", "desc"),
        orderBy("time", "asc"),
        limit(50) // 用戶預約最多載入 50 筆
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: Appointment[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Appointment);
        });
        setAppointments(data);
      });

      return () => unsubscribe();
    }, [userId, shopId]);

    return { appointments };
  };

  const updateAppointmentStatus = async (
    id: string,
    status: Appointment["status"],
    shopId: string // Multi-Tenant: 新增 shopId 參數
  ) => {
    try {
      // 🔧 開發模式：模擬更新成功
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        // 模擬網路延遲
        await new Promise((resolve) => setTimeout(resolve, 500));
        return;
      }

      // 如果是取消預約，需要釋放時段
      if (status === "cancelled") {
        await runTransaction(db, async (transaction) => {
          // 1. 獲取預約資訊（Multi-Tenant: 使用 subcollection）
          const appointmentRef = doc(db, "shops", shopId, "appointments", id);
          const appointmentDoc = await transaction.get(appointmentRef);

          if (!appointmentDoc.exists()) {
            throw new Error("預約不存在");
          }

          const appointment = appointmentDoc.data();
          const { date } = appointment;

          // 2. 從 daily_schedules 中移除該時段
          const scheduleRef = doc(
            db,
            `shops/${shopId}/daily_schedules/${date}`
          );
          const scheduleDoc = await transaction.get(scheduleRef);

          if (scheduleDoc.exists()) {
            const bookings = scheduleDoc.data().bookings || [];

            // 過濾掉該預約的時段
            const updatedBookings = bookings.filter(
              (booking: any) => booking.appointmentId !== id
            );

            transaction.update(scheduleRef, {
              bookings: updatedBookings,
            });
          }

          // 3. 更新預約狀態
          transaction.update(appointmentRef, { status });
        });
      } else {
        // 其他狀態直接更新（Multi-Tenant: 使用 subcollection）
        await updateDoc(doc(db, "shops", shopId, "appointments", id), {
          status,
        });
      }
    } catch (err) {
      throw err;
    }
  };

  return {
    createAppointment,
    updateAppointmentStatus,
    loading,
    error,
    useAppointmentList,
    useUserAppointments,
  };
};
