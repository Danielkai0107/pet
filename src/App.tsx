import { lazy, Suspense } from "react";
import { LineAuthProvider, useLineAuth } from "./contexts/LineAuthProvider";
import { AdminAuthProvider } from "./contexts/AdminAuthProvider";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useShopSettings } from "./hooks/useShopSettings";
import { LoadingScreen } from "./components/LoadingScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ServiceHistory } from "./features/appointments/ServiceHistory";

// Code Splitting: 動態載入組件（處理命名導出）
const AppointmentFormNew = lazy(() =>
  import("./features/appointments/AppointmentFormNew").then((module) => ({
    default: module.AppointmentFormNew,
  }))
);

const AdminDashboard = lazy(() =>
  import("./features/admin/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  }))
);

const AdminLogin = lazy(() =>
  import("./features/admin/AdminLogin").then((module) => ({
    default: module.AdminLogin,
  }))
);

const AdminRedirect = lazy(() =>
  import("./features/admin/AdminRedirect").then((module) => ({
    default: module.AdminRedirect,
  }))
);

const MobileDailyView = lazy(() =>
  import("./features/admin/MobileDailyView").then((module) => ({
    default: module.MobileDailyView,
  }))
);

const AdminWalkInBooking = lazy(() =>
  import("./features/admin/AdminWalkInBooking").then((module) => ({
    default: module.AdminWalkInBooking,
  }))
);

const SuperAdminLayout = lazy(() =>
  import("./features/superadmin/SuperAdminLayout").then((module) => ({
    default: module.SuperAdminLayout,
  }))
);

const ShopManager = lazy(() =>
  import("./features/superadmin/ShopManager").then((module) => ({
    default: module.ShopManager,
  }))
);

const SuperAdminDashboard = lazy(() =>
  import("./features/superadmin/SuperAdminDashboard").then((module) => ({
    default: module.SuperAdminDashboard,
  }))
);

const Home = () => {
  const { user, loading, error } = useLineAuth();
  const navigate = useNavigate();

  // Multi-Tenant: 從 LineAuth context 獲取 shopId
  const { shopId } = useLineAuth();

  // 載入商家資訊
  const { shop } = useShopSettings(shopId);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="home-error">
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2 style={{ marginBottom: "0.5rem" }}>載入超時</h2>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>{error}</p>
            {/* LIFF 環境會自動關閉，瀏覽器環境顯示重新整理提示 */}
            <p
              style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#999" }}
            >
              視窗即將關閉...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 處理預約按鈕點擊，保持 URL 參數傳遞
  const handleBookingClick = () => {
    // 直接傳遞目前的 URL 參數到預約頁面
    navigate("/booking" + window.location.search);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        {/* 顯示商家頭貼 */}
        {shop?.logoUrl ? (
          <img src={shop.logoUrl} alt={shop.name} className="user-avatar" />
        ) : (
          user?.pictureUrl && (
            <img
              src={user.pictureUrl}
              alt={user.displayName}
              className="user-avatar"
            />
          )
        )}

        <div className="user-info">
          <h1>嗨，{user?.displayName || "訪客"}</h1>
          <p className="welcome-text">
            歡迎回來{shop?.name && `, ${shop.name}`}
          </p>
          {user?.phone && <p className="phone-text">{user.phone}</p>}
        </div>
      </header>

      <main className="home-main">
        {/* Service History */}
        <ServiceHistory />
      </main>

      {/* 固定在底部的預約按鈕 */}
      <div className="booking-section">
        <button onClick={handleBookingClick} className="booking-button">
          <span>我要預約</span>
        </button>
      </div>
    </div>
  );
};

// Wrapper components for Layout & Auth
const UserLayout = () => (
  <LineAuthProvider>
    <Outlet />
  </LineAuthProvider>
);

const AdminLayout = () => (
  <AdminAuthProvider>
    <Outlet />
  </AdminAuthProvider>
);

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 4000,
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* User Routes (Protected by LINE LIFF) */}
            <Route element={<UserLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/booking" element={<AppointmentFormNew />} />
            </Route>

            {/* Admin Routes (Protected by Firebase Auth) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminRedirect />} />
              <Route path="login" element={<AdminLogin />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="mobile" element={<MobileDailyView />} />
              <Route path="walk-in-booking" element={<AdminWalkInBooking />} />
            </Route>
            {/* Super Admin Routes */}
            <Route path="/superadmin" element={<AdminLayout />}>
              <Route element={<SuperAdminLayout />}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="shops" element={<ShopManager />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
