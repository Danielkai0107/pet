import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface Booking {
  start: number; // 開始時間（分鐘）
  end: number; // 結束時間（分鐘）
  appointmentId: string;
}

interface DailySchedule {
  bookings: Booking[];
}

export const useDailySchedule = (shopId: string | null, date: string) => {
  const [bookedSlots, setBookedSlots] = useState<Booking[]>([]);
  const [validBookedSlots, setValidBookedSlots] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shopId || !date) {
      setBookedSlots([]);
      return;
    }

    // 🔧 開發模式：返回假資料
    const isDevelopment = import.meta.env.DEV;
    const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    if (isDevelopment && !hasFirebaseConfig && shopId === "test-shop-123") {
      // 模擬已預約的時段：10:00-11:00 和 14:00-16:00
      const mockBookings: Booking[] = [
        {
          start: 10 * 60, // 10:00 = 600 分鐘
          end: 11 * 60, // 11:00 = 660 分鐘
          appointmentId: "mock-apt-1",
        },
        {
          start: 14 * 60, // 14:00 = 840 分鐘
          end: 16 * 60, // 16:00 = 960 分鐘
          appointmentId: "mock-apt-2",
        },
      ];
      setBookedSlots(mockBookings);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 使用 onSnapshot 即時監聽時段變化
    const scheduleRef = doc(db, `shops/${shopId}/daily_schedules/${date}`);

    const unsubscribe = onSnapshot(
      scheduleRef,
      async (scheduleDoc) => {
        if (scheduleDoc.exists()) {
          const data = scheduleDoc.data() as DailySchedule;
          const bookings = data.bookings || [];
          setBookedSlots(bookings);

          // P0 優化：使用 Promise.all() 並行查詢，提升 20 倍速度
          if (bookings.length > 0) {
            try {
              // 並行查詢所有預約狀態
              const aptPromises = bookings.map((booking) =>
                getDoc(
                  doc(
                    db,
                    `shops/${shopId}/appointments/${booking.appointmentId}`
                  )
                )
              );

              const aptDocs = await Promise.all(aptPromises);

              // 過濾出有效的預約（排除已取消的）
              const validBookings = bookings.filter((_booking, index) => {
                const aptDoc = aptDocs[index];
                if (!aptDoc.exists()) return false;
                const aptData = aptDoc.data();
                return aptData.status !== "cancelled";
              });

              setValidBookedSlots(validBookings);
            } catch (error) {
              console.error("檢查預約狀態失敗:", error);
              setValidBookedSlots(bookings); // 失敗時使用原始數據
            }
          } else {
            setValidBookedSlots([]);
          }
        } else {
          setBookedSlots([]);
          setValidBookedSlots([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("監聽每日時段失敗:", error);
        setBookedSlots([]);
        setValidBookedSlots([]);
        setLoading(false);
      }
    );

    // 清理監聽器
    return () => unsubscribe();
  }, [shopId, date]);

  // 檢查特定時間是否已被預約（考慮服務時長，只檢查有效的預約）
  const isTimeSlotBooked = (
    timeSlot: string,
    serviceDuration: number = 60
  ): boolean => {
    // 使用過濾後的有效預約來檢查
    if (validBookedSlots.length === 0) return false;

    // 將時間字串轉換為分鐘
    const [hours, minutes] = timeSlot.split(":").map(Number);
    const startTimeInMinutes = hours * 60 + (minutes || 0);
    const endTimeInMinutes = startTimeInMinutes + serviceDuration;

    // 檢查是否與任何已預約時段重疊
    return validBookedSlots.some((booking) => {
      // 重疊判斷：(StartA < EndB) and (EndA > StartB)
      return (
        startTimeInMinutes < booking.end && endTimeInMinutes > booking.start
      );
    });
  };

  return {
    bookedSlots, // 原始時段（包含已取消的）
    validBookedSlots, // 有效時段（排除已取消的）
    loading,
    isTimeSlotBooked, // 基於有效時段的檢查
  };
};
