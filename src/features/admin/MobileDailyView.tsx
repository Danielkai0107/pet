import { useState, useEffect, useRef } from "react";
import { useAdminAuth } from "../../contexts/AdminAuthProvider";
import { useNavigate } from "react-router-dom";
import { useAppointments } from "../../hooks/useAppointments";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AppointmentDetailPopup } from "./AppointmentDetailPopup";
import type { Appointment } from "../../types/appointment";
import crmLogo from "../../assets/crm-logo.svg";
import { LazyImage } from "../../components/LazyImage";

export const MobileDailyView = () => {
  const { adminUser, loading: authLoading, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [shopId, setShopId] = useState<string | null>(null);
  const [fetchingShop, setFetchingShop] = useState(true);
  const [businessHours, setBusinessHours] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const { useAppointmentList } = useAppointments();
  const { appointments: rawAppointments } = useAppointmentList(
    shopId || undefined
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // 取得今天的日期字串 (YYYY-MM-DD)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayString = getTodayString();

  // 只顯示今天的預約，並按時間排序
  const appointments = [...rawAppointments]
    .filter((apt) => apt.date === todayString)
    .sort((a, b) => {
      const statusPriority = {
        pending: 0,
        confirmed: 1,
        completed: 2,
        cancelled: 3,
      };

      const priorityA =
        statusPriority[a.status as keyof typeof statusPriority] ?? 4;
      const priorityB =
        statusPriority[b.status as keyof typeof statusPriority] ?? 4;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const timeA = a.time.split(":").map(Number);
      const timeB = b.time.split(":").map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

  // 獲取當前時間
  const getCurrentTime = () => {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  // 每分鐘更新當前時間
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 當 appointments 更新時，同步更新 selectedAppointment
  useEffect(() => {
    if (selectedAppointment) {
      const updated = appointments.find(
        (apt) => apt.id === selectedAppointment.id
      );
      if (updated) {
        setSelectedAppointment(updated);
      }
    }
  }, [appointments, selectedAppointment]);

  // 驗證登入狀態
  useEffect(() => {
    if (!authLoading && !adminUser) {
      navigate("/admin/login");
      return;
    }

    const fetchData = async () => {
      if (!adminUser) return;

      try {
        const isDevelopment = import.meta.env.DEV;
        const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

        if (isDevelopment && !hasFirebaseConfig) {
          setShopId("test-shop-123");
          setBusinessHours({ start: "09:00", end: "21:00" });
          setFetchingShop(false);
          return;
        }

        const adminDocRef = doc(db, "admins", adminUser.uid);
        const adminDoc = await getDoc(adminDocRef);

        if (adminDoc.exists()) {
          const data = adminDoc.data();
          const currentShopId = data.shopId || null;
          setShopId(currentShopId);

          // 獲取店家營業時間
          if (currentShopId) {
            const shopDocRef = doc(db, "shops", currentShopId);
            const shopDoc = await getDoc(shopDocRef);

            if (shopDoc.exists()) {
              const shopData = shopDoc.data();
              setBusinessHours(
                shopData.businessHours
                  ? {
                      start: shopData.businessHours.start || "09:00",
                      end: shopData.businessHours.end || "21:00",
                    }
                  : { start: "09:00", end: "21:00" }
              );
            }
          }
        } else {
          if (isDevelopment) {
            setShopId("test-shop-123");
            setBusinessHours({ start: "09:00", end: "21:00" });
          } else {
            setShopId(null);
          }
        }
      } catch (err) {
        const isDevelopment = import.meta.env.DEV;
        if (isDevelopment) {
          setShopId("test-shop-123");
          setBusinessHours({ start: "09:00", end: "21:00" });
        }
      } finally {
        setFetchingShop(false);
      }
    };

    if (adminUser) {
      fetchData();
    }
  }, [adminUser, authLoading, navigate]);

  // 自動滾動到當前時間
  useEffect(() => {
    if (currentTimeRef.current && scrollContainerRef.current) {
      setTimeout(() => {
        if (currentTimeRef.current && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const currentElement = currentTimeRef.current;
          const containerHeight = container.clientHeight;
          const elementTop = currentElement.offsetTop;

          container.scrollTop = elementTop - containerHeight / 2;
        }
      }, 100);
    }
  }, [appointments]);

  // 根據店家營業時間生成時間軸
  const generateTimeSlots = () => {
    const slots = [];
    let startHour = 9;
    let endHour = 21;

    if (businessHours) {
      startHour = parseInt(businessHours.start.split(":")[0]);
      endHour = parseInt(businessHours.end.split(":")[0]);
    }

    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // 根據預約時間分組
  const getAppointmentsForHour = (hour: number) => {
    return appointments.filter((apt) => {
      const aptHour = parseInt(apt.time.split(":")[0]);
      return aptHour === hour;
    });
  };

  const isCurrentHour = (hour: number) => {
    return currentTime.hour === hour;
  };

  // 處理點擊圖卡
  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setShowPopup(true);
  };

  // 狀態徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="status-badge badge-green">已確認</span>;
      case "cancelled":
        return <span className="status-badge badge-red">已取消</span>;
      case "completed":
        return <span className="status-badge badge-blue">已完成</span>;
      default:
        return <span className="status-badge badge-yellow">待確認</span>;
    }
  };

  if (authLoading || fetchingShop) {
    return <div className="mobile-loading">載入中...</div>;
  }

  if (!adminUser) return null;

  return (
    <div className="mobile-daily-view">
      {/* Header */}
      <header className="mobile-header">
        <div className="header-left">
          <img src={crmLogo} alt="CRM Logo" className="header-logo" />
          <div className="header-info">
            <h1>今日預約</h1>
            <p className="date-text">
              {new Date().getFullYear()} / {new Date().getMonth() + 1} /{" "}
              {new Date().getDate()}
            </p>
          </div>
        </div>
        <div className="header-right">
          <button
            onClick={() => navigate("/admin/walk-in-booking")}
            className="walk-in-button"
            title="現場預約"
          >
            <span className="material-symbols-rounded">add</span>
          </button>
          <button onClick={() => logout()} className="logout-button">
            <span className="material-symbols-rounded">logout</span>
          </button>
        </div>
      </header>

      {/* Timeline */}
      <div className="mobile-timeline" ref={scrollContainerRef}>
        {appointments.length > 0 ? (
          timeSlots.map((hour) => {
            const hourAppointments = getAppointmentsForHour(hour);
            const isCurrent = isCurrentHour(hour);

            return (
              <div
                key={hour}
                className="mobile-timeline-slot"
                ref={isCurrent ? currentTimeRef : null}
              >
                {/* Time Label */}
                <div className="timeline-time">
                  <div className={`time-label ${isCurrent ? "current" : ""}`}>
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div className="timeline-line">
                    {isCurrent && <div className="current-indicator" />}
                  </div>
                </div>

                {/* Appointments */}
                <div className="timeline-appointments">
                  {hourAppointments.length > 0 ? (
                    hourAppointments.map((apt) => {
                      const isInactive =
                        apt.status === "cancelled" ||
                        apt.status === "completed";

                      return (
                        <button
                          key={apt.id}
                          onClick={() => handleAppointmentClick(apt)}
                          className={`mobile-appointment-card ${
                            isInactive ? "inactive" : ""
                          }`}
                        >
                          {/* Pet Photo */}
                          <div className="card-image">
                            {(apt as any).petPhoto ? (
                              <LazyImage
                                src={(apt as any).petPhoto}
                                alt={apt.petName || "寵物"}
                                wrapperClassName="mobile-card-image-wrapper"
                              />
                            ) : (
                              <div className="image-placeholder">🐾</div>
                            )}
                            {/* 待確認紅點 */}
                            {apt.status === "pending" && (
                              <div className="pending-dot"></div>
                            )}
                          </div>

                          {/* Appointment Info */}
                          <div className="card-info">
                            <div className="card-header">
                              <div className="card-time">{apt.time}</div>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="card-service">
                              {apt.serviceType}
                            </div>
                            <div className="card-customer">
                              {apt.customerName}
                              {apt.petName && ` ｜ ${apt.petName}`}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="empty-slot" />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-day">
            <span className="material-symbols-rounded empty-icon">
              event_busy
            </span>
            <p>今日無預約</p>
          </div>
        )}
      </div>

      {/* Popup */}
      {showPopup && selectedAppointment && (
        <AppointmentDetailPopup
          appointment={selectedAppointment}
          onClose={() => {
            setShowPopup(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
};
