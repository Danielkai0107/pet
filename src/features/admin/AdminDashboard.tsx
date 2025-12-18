import { AppointmentList } from "./AppointmentList";
import { ShopSettings } from "./ShopSettings";
import { CalendarView } from "./CalendarView";
import { CustomerList } from "./CustomerList";
import { ServiceRecords } from "./ServiceRecords";
import { useAdminAuth } from "../../contexts/AdminAuthProvider";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAppointments } from "../../hooks/useAppointments";
import toast from "react-hot-toast";
import type { Appointment } from "../../types/appointment";
import crmLogo from "../../assets/crm-logo.svg";

export const AdminDashboard = () => {
  const { adminUser, loading: authLoading, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [shopId, setShopId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [fetchingShop, setFetchingShop] = useState(true);
  const [shopLogoUrl, setShopLogoUrl] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [businessHours, setBusinessHours] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    "appointments" | "calendar" | "customers" | "records" | "settings"
  >("appointments");

  // Search and filter states
  const [customerSearch, setCustomerSearch] = useState("");
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<string>("");

  // Calendar date filters
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [calendarDate, setCalendarDate] = useState<string>("");

  const [recordsSearch, setRecordsSearch] = useState("");
  const [recordsMonth, setRecordsMonth] = useState("");
  const [recordsServiceFilter, setRecordsServiceFilter] = useState("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);

  // Settings edit mode
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch appointments for calendar view
  const { useAppointmentList } = useAppointments();
  const { appointments } = useAppointmentList(shopId || undefined);

  // Format month string
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${year} 年 ${parseInt(month)} 月`;
  };

  // Generate available months from actual appointments
  const availableCalendarMonths = useMemo(() => {
    if (appointments.length === 0) {
      // 如果沒有預約，至少顯示當月
      const now = new Date();
      return [
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      ];
    }

    // 從預約中提取所有不重複的月份
    const monthsSet = new Set<string>();
    appointments.forEach((apt) => {
      const month = apt.date.substring(0, 7); // "2024-12-15" -> "2024-12"
      monthsSet.add(month);
    });

    // 轉換為陣列並排序（新到舊）
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [appointments]);

  // 計算待確認預約數量
  const pendingAppointmentsCount = useMemo(() => {
    return appointments.filter((apt) => apt.status === "pending").length;
  }, [appointments]);

  // Handle settings save
  const handleSettingsSave = async () => {
    setSavingSettings(true);
    try {
      // Call the exposed save function from ShopSettings
      if ((window as any).__shopSettingsSave) {
        await (window as any).__shopSettingsSave();
        toast.success("設定已儲存！");
        setIsEditingSettings(false);
      }
    } catch (err) {
      toast.error("儲存失敗，請稍後再試。");
    } finally {
      setSavingSettings(false);
    }
  };

  // Track previous appointments for change detection
  const previousAppointmentsRef = useRef<Map<string, Appointment>>(new Map());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!authLoading && !adminUser) {
      navigate("/admin/login");
      return;
    }

    const fetchData = async () => {
      if (!adminUser) return;

      try {
        // 🔧 開發模式：檢查是否為開發環境且無法連接 Firebase
        const isDevelopment = import.meta.env.DEV;
        const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

        if (isDevelopment && !hasFirebaseConfig) {
          setShopId("test-shop-123");
          setFetchingShop(false);
          return;
        }

        // Fetch Admin Profile Once
        const adminDocRef = doc(db, "admins", adminUser.uid);
        const adminDoc = await getDoc(adminDocRef);

        if (adminDoc.exists()) {
          const data = adminDoc.data();
          const currentShopId = data.shopId || null;
          setShopId(currentShopId);

          if (data.role === "superadmin") {
            setIsSuperAdmin(true);
          }
        } else {
          // 🔧 開發模式：如果找不到管理員資料，提供測試 shopId
          if (isDevelopment) {
            setShopId("test-shop-123");
          } else {
            setShopId(null);
          }
        }
      } catch (err) {
        // 🔧 開發模式：即使出錯也提供測試資料
        const isDevelopment = import.meta.env.DEV;
        if (isDevelopment) {
          setShopId("test-shop-123");
        }
      } finally {
        setFetchingShop(false);
      }
    };

    if (adminUser) {
      fetchData();
    }
  }, [adminUser, authLoading, navigate]);

  // Auto redirect for Super Admins
  useEffect(() => {
    if (isSuperAdmin) {
      navigate("/superadmin");
    }
  }, [isSuperAdmin, navigate]);

  // Real-time listener for shop data (logo and name)
  useEffect(() => {
    if (!shopId) return;

    const shopDocRef = doc(db, "shops", shopId);
    const unsubscribe = onSnapshot(
      shopDocRef,
      (shopDoc) => {
        if (shopDoc.exists()) {
          const shopData = shopDoc.data();
          setShopLogoUrl(shopData.logoUrl || null);
          setShopName(shopData.name || null);
          setBusinessHours(
            shopData.businessHours
              ? {
                  start: shopData.businessHours.start || "09:00",
                  end: shopData.businessHours.end || "21:00",
                }
              : { start: "09:00", end: "21:00" }
          );
        }
      },
      () => {
        // Error listening to shop data
      }
    );

    return () => unsubscribe();
  }, [shopId]);

  // Monitor appointments for real-time notifications
  useEffect(() => {
    if (!shopId || appointments.length === 0) return;

    // Skip notification on initial load
    if (isInitialLoadRef.current) {
      // Build initial map
      const initialMap = new Map<string, Appointment>();
      appointments.forEach((apt) => {
        initialMap.set(apt.id, apt);
      });
      previousAppointmentsRef.current = initialMap;
      isInitialLoadRef.current = false;
      return;
    }

    const previousMap = previousAppointmentsRef.current;
    const currentMap = new Map<string, Appointment>();

    appointments.forEach((apt) => {
      currentMap.set(apt.id, apt);
      const previous = previousMap.get(apt.id);

      // New appointment (not in previous map)
      if (!previous) {
        toast.success(
          () => (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ color: "#000" }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  新預約！
                </div>
                <div style={{ fontSize: "14px" }}>
                  {apt.customerName} - {apt.serviceType}
                </div>
                <div style={{ fontSize: "13px", opacity: 0.7 }}>
                  {apt.date} {apt.time}
                </div>
              </div>
            </div>
          ),
          {
            duration: 6000,
            style: {
              background: "#fff",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              borderRadius: "1.4rem",
              padding: "16px",
            },
          }
        );
      }
      // Status changed to cancelled
      else if (previous.status !== "cancelled" && apt.status === "cancelled") {
        toast.error(
          () => (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ color: "#000" }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  預約已取消
                </div>
                <div style={{ fontSize: "14px" }}>
                  {apt.customerName} - {apt.serviceType}
                </div>
                <div style={{ fontSize: "13px", opacity: 0.7 }}>
                  {apt.date} {apt.time}
                </div>
              </div>
            </div>
          ),
          {
            duration: 5000,
            style: {
              background: "#fff",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              borderRadius: "1.4rem",
              padding: "16px",
            },
          }
        );
      }
      // Status changed to confirmed
      else if (previous.status === "pending" && apt.status === "confirmed") {
        toast.success(
          () => (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ color: "#000" }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  預約已確認
                </div>
                <div style={{ fontSize: "14px" }}>
                  {apt.customerName} - {apt.serviceType}
                </div>
                <div style={{ fontSize: "13px", opacity: 0.7 }}>
                  {apt.date} {apt.time}
                </div>
              </div>
            </div>
          ),
          {
            duration: 4000,
            style: {
              background: "#fff",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              borderRadius: "1.4rem",
              padding: "16px",
            },
          }
        );
      }
    });

    // Update reference for next comparison
    previousAppointmentsRef.current = currentMap;
  }, [appointments, shopId]);

  if (authLoading || fetchingShop)
    return <div className="admin-loading">載入中...</div>;
  if (!adminUser) return null;

  // Get page title based on active tab
  const getPageTitle = () => {
    switch (activeTab) {
      case "appointments":
        return "今日預約";
      case "calendar":
        return "所有預約";
      case "customers":
        return "客戶列表";
      case "records":
        return "服務紀錄";
      case "settings":
        return "店鋪設定";
      default:
        return "";
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        {/* Left: Logo + Sidebar */}
        <div className="sidebar-container">
          {/* Logo */}
          <div className="navbar-logo">
            <img src={crmLogo} alt="CRM Logo" />
          </div>

          {/* Sidebar Navigation */}
          <aside className="admin-sidebar">
            <nav className="sidebar-nav">
              <button
                onClick={() => setActiveTab("appointments")}
                className={`nav-item ${
                  activeTab === "appointments" ? "active" : ""
                }`}
              >
                <span className="material-symbols-rounded nav-icon">
                  event_note
                </span>
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`nav-item ${
                  activeTab === "calendar" ? "active" : ""
                }`}
              >
                <span className="material-symbols-rounded nav-icon">
                  calendar_month
                </span>
                {/* 待確認預約通知紅點 */}
                {pendingAppointmentsCount > 0 && (
                  <div className="nav-notification-dot"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className={`nav-item ${
                  activeTab === "customers" ? "active" : ""
                }`}
              >
                <span className="material-symbols-rounded nav-icon">group</span>
              </button>
              <button
                onClick={() => setActiveTab("records")}
                className={`nav-item ${
                  activeTab === "records" ? "active" : ""
                }`}
              >
                <span className="material-symbols-rounded nav-icon">
                  history
                </span>
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`nav-item ${
                  activeTab === "settings" ? "active" : ""
                }`}
              >
                <span className="material-symbols-rounded nav-icon">
                  settings
                </span>
              </button>
            </nav>

            {/* User Profile Section */}
            <div className="sidebar-user">
              <div className="user-avatar">
                {shopLogoUrl ? (
                  <img src={shopLogoUrl} alt="店鋪頭像" />
                ) : (
                  adminUser.email?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="sidebar-actions">
                <button onClick={() => logout()} className="logout-btn">
                  <span className="material-symbols-rounded">logout</span>
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Right: Navbar + Main Content */}
        <div className="main-container">
          {/* Top Navigation Bar */}
          <nav className="admin-navbar">
            <div className="navbar-content">
              <div className="navbar-left">
                <h2 className="page-title">{getPageTitle()}</h2>
              </div>
              <div className="navbar-right">
                {/* 現場預約按鈕 - 只在預約頁面顯示 */}
                {activeTab === "appointments" && (
                  <button
                    onClick={() => navigate("/admin/walk-in-booking")}
                    className="action-button primary walk-in-booking-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginRight: "1rem",
                    }}
                  >
                    <span className="material-symbols-rounded">add</span>
                    <span>現場預約</span>
                  </button>
                )}
                {/* Calendar Month & Date Filter */}
                {activeTab === "calendar" && (
                  <>
                    <div className="navbar-filter">
                      <span className="material-symbols-rounded filter-icon">
                        calendar_month
                      </span>
                      <select
                        value={calendarMonth}
                        onChange={(e) => {
                          setCalendarMonth(e.target.value);
                          setCalendarDate(""); // Reset date when month changes
                        }}
                        className="filter-select"
                      >
                        {availableCalendarMonths.map((month) => (
                          <option key={month} value={month}>
                            {formatMonth(month)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="navbar-filter date-picker-wrapper">
                      <span className="material-symbols-rounded filter-icon">
                        event
                      </span>
                      <input
                        type="date"
                        value={calendarDate}
                        onChange={(e) => setCalendarDate(e.target.value)}
                        className="filter-select date-input"
                        placeholder="選擇日期"
                      />
                      {calendarDate && (
                        <button
                          onClick={() => setCalendarDate("")}
                          className="clear-date-btn"
                          title="清除日期"
                        >
                          <span className="material-symbols-rounded">
                            close
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="navbar-filter">
                      <span className="material-symbols-rounded filter-icon">
                        filter_list
                      </span>
                      <select
                        value={calendarStatusFilter}
                        onChange={(e) =>
                          setCalendarStatusFilter(e.target.value)
                        }
                        className="filter-select"
                      >
                        <option value="">全部狀態</option>
                        <option value="pending">待確認</option>
                        <option value="confirmed">已確認</option>
                        <option value="completed">已完成</option>
                        <option value="cancelled">已取消</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Customer Search */}
                {activeTab === "customers" && (
                  <div className="navbar-search">
                    <span className="material-symbols-rounded search-icon">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="姓名或末三碼"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="search-input"
                    />
                  </div>
                )}

                {/* Records Search & Filters */}
                {activeTab === "records" && (
                  <>
                    <div className="navbar-search">
                      <span className="material-symbols-rounded search-icon">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="姓名或末三碼"
                        value={recordsSearch}
                        onChange={(e) => setRecordsSearch(e.target.value)}
                        className="search-input"
                      />
                      {recordsSearch && (
                        <button
                          onClick={() => setRecordsSearch("")}
                          className="clear-search-btn"
                        >
                          <span className="material-symbols-rounded">
                            close
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="navbar-filter">
                      <span className="material-symbols-rounded filter-icon">
                        filter_list
                      </span>
                      <select
                        value={recordsServiceFilter}
                        onChange={(e) =>
                          setRecordsServiceFilter(e.target.value)
                        }
                        className="filter-select"
                      >
                        <option value="">全部服務</option>
                        {availableServices.map((service) => (
                          <option key={service} value={service}>
                            {service}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="navbar-filter">
                      <span className="material-symbols-rounded filter-icon">
                        calendar_month
                      </span>
                      <select
                        value={recordsMonth}
                        onChange={(e) => setRecordsMonth(e.target.value)}
                        className="filter-select"
                      >
                        <option value="">全部月份</option>
                        {availableMonths.map((month) => (
                          <option key={month} value={month}>
                            {formatMonth(month)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Settings Edit/Save Buttons */}
                {activeTab === "settings" && (
                  <div className="navbar-actions">
                    {isEditingSettings ? (
                      <>
                        <button
                          onClick={() => setIsEditingSettings(false)}
                          className="action-button cancel"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSettingsSave}
                          disabled={savingSettings}
                          className="action-button save"
                        >
                          <span className="material-symbols-rounded">save</span>
                          <span>
                            {savingSettings ? "儲存中..." : "儲存變更"}
                          </span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingSettings(true)}
                        className="action-button edit"
                      >
                        <span className="material-symbols-rounded">edit</span>
                        <span>編輯</span>
                      </button>
                    )}
                  </div>
                )}

                {shopName && <span className="shop-badge">{shopName}</span>}
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="admin-main-content">
            <div className="content-wrapper">
              {shopId ? (
                <>
                  {activeTab === "appointments" && (
                    <AppointmentList
                      shopId={shopId}
                      businessHours={businessHours}
                    />
                  )}
                  {activeTab === "calendar" && (
                    <CalendarView
                      appointments={appointments}
                      selectedMonth={calendarMonth}
                      selectedDate={calendarDate}
                      statusFilter={calendarStatusFilter}
                    />
                  )}
                  {activeTab === "customers" && (
                    <CustomerList
                      shopId={shopId}
                      searchQuery={customerSearch}
                    />
                  )}
                  {activeTab === "records" && (
                    <ServiceRecords
                      shopId={shopId}
                      searchQuery={recordsSearch}
                      filterMonth={recordsMonth}
                      filterService={recordsServiceFilter}
                      onMonthsAvailable={setAvailableMonths}
                      onServicesAvailable={setAvailableServices}
                    />
                  )}
                  {activeTab === "settings" && (
                    <ShopSettings
                      shopId={shopId}
                      isEditing={isEditingSettings}
                    />
                  )}
                </>
              ) : isSuperAdmin ? (
                <div className="admin-card">
                  <h2 className="card-title">歡迎來到平台管理中心</h2>
                  <p className="card-description">
                    您擁有超級管理員權限，請點擊下方按鈕開始管理店家與帳號。
                  </p>
                  <button
                    onClick={() => navigate("/superadmin")}
                    className="card-button"
                  >
                    前往平台管理後台 (Super Admin)
                  </button>
                </div>
              ) : (
                <div className="admin-card error-card">
                  <div className="card-title">未授權的帳號</div>
                  <p className="card-description">
                    此帳號尚未綁定任何商店，請聯繫系統管理員。
                  </p>
                  <p className="card-uid">UID: {adminUser.uid}</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
