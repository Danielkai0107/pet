import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ShopAuthProvider } from "@/shop/auth/ShopAuthProvider";
import { RequireShopAuth } from "@/shop/auth/RequireShopAuth";
import { AdminAuthProvider } from "@/admin/auth/AdminAuthProvider";
import { RequireAdmin } from "@/admin/auth/RequireAdmin";

// --- Web (public) ---
const WebLayout = lazy(() =>
  import("@/web/Layout").then((m) => ({ default: m.WebLayout })),
);
const HomePage = lazy(() =>
  import("@/web/pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const ShopsPage = lazy(() =>
  import("@/web/pages/ShopsPage").then((m) => ({ default: m.ShopsPage })),
);
const ShopDetailPage = lazy(() =>
  import("@/web/pages/ShopDetailPage").then((m) => ({
    default: m.ShopDetailPage,
  })),
);
const BookingFlowPage = lazy(() =>
  import("@/web/pages/BookingFlowPage").then((m) => ({
    default: m.BookingFlowPage,
  })),
);
const BookingSuccessPage = lazy(() =>
  import("@/web/pages/BookingSuccessPage").then((m) => ({
    default: m.BookingSuccessPage,
  })),
);
const BookingViewPage = lazy(() =>
  import("@/web/pages/BookingViewPage").then((m) => ({
    default: m.BookingViewPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/web/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

// --- Shop admin ---
const ShopLayout = lazy(() =>
  import("@/shop/Layout").then((m) => ({ default: m.ShopLayout })),
);
const ShopLoginPage = lazy(() =>
  import("@/shop/pages/LoginPage").then((m) => ({ default: m.ShopLoginPage })),
);
const ShopOnboardingPage = lazy(() =>
  import("@/shop/pages/OnboardingPage").then((m) => ({
    default: m.ShopOnboardingPage,
  })),
);
const ShopTodayPage = lazy(() =>
  import("@/shop/pages/TodayPage").then((m) => ({ default: m.ShopTodayPage })),
);
const ShopBookingsPage = lazy(() =>
  import("@/shop/pages/BookingsPage").then((m) => ({
    default: m.ShopBookingsPage,
  })),
);
const ShopBookingDetailPage = lazy(() =>
  import("@/shop/pages/BookingDetailPage").then((m) => ({
    default: m.ShopBookingDetailPage,
  })),
);
const ShopRoomsPage = lazy(() =>
  import("@/shop/pages/RoomsPage").then((m) => ({ default: m.ShopRoomsPage })),
);
const ShopInventoryPage = lazy(() =>
  import("@/shop/pages/InventoryPage").then((m) => ({
    default: m.ShopInventoryPage,
  })),
);
const ShopTemplatesPage = lazy(() =>
  import("@/shop/pages/TemplatesPage").then((m) => ({
    default: m.ShopTemplatesPage,
  })),
);
const ShopSettingsPage = lazy(() =>
  import("@/shop/pages/SettingsPage").then((m) => ({
    default: m.ShopSettingsPage,
  })),
);
const ShopStaffPage = lazy(() =>
  import("@/shop/pages/StaffPage").then((m) => ({ default: m.ShopStaffPage })),
);
const ShopBillingPage = lazy(() =>
  import("@/shop/pages/BillingPage").then((m) => ({
    default: m.ShopBillingPage,
  })),
);

// --- LIFF ---
const LiffLayout = lazy(() =>
  import("@/liff/Layout").then((m) => ({ default: m.LiffLayout })),
);
const LiffOrdersPage = lazy(() =>
  import("@/liff/pages/OrdersPage").then((m) => ({
    default: m.LiffOrdersPage,
  })),
);
const LiffHistoryPage = lazy(() =>
  import("@/liff/pages/HistoryPage").then((m) => ({
    default: m.LiffHistoryPage,
  })),
);
const LiffDiscoverPage = lazy(() =>
  import("@/liff/pages/DiscoverPage").then((m) => ({
    default: m.LiffDiscoverPage,
  })),
);
const LiffFavoritesPage = lazy(() =>
  import("@/liff/pages/FavoritesPage").then((m) => ({
    default: m.LiffFavoritesPage,
  })),
);
const LiffProfilePage = lazy(() =>
  import("@/liff/pages/ProfilePage").then((m) => ({
    default: m.LiffProfilePage,
  })),
);
const LiffBindPage = lazy(() =>
  import("@/liff/pages/BindPage").then((m) => ({ default: m.LiffBindPage })),
);

// --- Super Admin ---
const AdminLayout = lazy(() =>
  import("@/admin/Layout").then((m) => ({ default: m.AdminLayout })),
);
const AdminLoginPage = lazy(() =>
  import("@/admin/pages/LoginPage").then((m) => ({
    default: m.AdminLoginPage,
  })),
);
const AdminShopsPage = lazy(() =>
  import("@/admin/pages/ShopsPage").then((m) => ({
    default: m.AdminShopsPage,
  })),
);
const AdminCustomersPage = lazy(() =>
  import("@/admin/pages/CustomersPage").then((m) => ({
    default: m.AdminCustomersPage,
  })),
);
const AdminBookingsPage = lazy(() =>
  import("@/admin/pages/BookingsPage").then((m) => ({
    default: m.AdminBookingsPage,
  })),
);

/** Wraps every /shop/* route with the ShopAuthProvider context. */
function ShopAuthScope() {
  return (
    <ShopAuthProvider>
      <Outlet />
    </ShopAuthProvider>
  );
}

/** Wraps every /admin/* route with the AdminAuthProvider context. */
function AdminAuthScope() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1e293b",
              color: "#fff",
              fontSize: "14px",
              borderRadius: "12px",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Web */}
            <Route element={<WebLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shops" element={<ShopsPage />} />
              <Route path="/shop/:slug" element={<ShopDetailPage />} />
              <Route path="/shop/:slug/book" element={<BookingFlowPage />} />
              <Route
                path="/booking/success/:code"
                element={<BookingSuccessPage />}
              />
              {/* 任何拿到訂單代碼的人（從 email/簡訊連結）都可以查看詳情。
                  code 本身就是 unguessable bearer token。 */}
              <Route path="/booking/:code" element={<BookingViewPage />} />
            </Route>

            {/* Shop admin: shared auth context */}
            <Route element={<ShopAuthScope />}>
              <Route
                path="/shop"
                element={<Navigate to="/shop/today" replace />}
              />
              <Route path="/shop/login" element={<ShopLoginPage />} />
              <Route path="/shop/onboarding" element={<ShopOnboardingPage />} />
              <Route element={<RequireShopAuth />}>
                <Route element={<ShopLayout />}>
                  <Route path="/shop/today" element={<ShopTodayPage />} />
                  <Route path="/shop/bookings" element={<ShopBookingsPage />} />
                  <Route
                    path="/shop/bookings/:id"
                    element={<ShopBookingDetailPage />}
                  />
                  <Route path="/shop/rooms" element={<ShopRoomsPage />} />
                  <Route path="/shop/inventory" element={<ShopInventoryPage />} />
                  <Route path="/shop/templates" element={<ShopTemplatesPage />} />
                  <Route path="/shop/settings" element={<ShopSettingsPage />} />
                  <Route path="/shop/staff" element={<ShopStaffPage />} />
                  <Route path="/shop/billing" element={<ShopBillingPage />} />
                </Route>
              </Route>
            </Route>

            {/* LIFF */}
            <Route element={<LiffLayout />}>
              <Route path="/liff" element={<LiffOrdersPage />} />
              <Route path="/liff/history" element={<LiffHistoryPage />} />
              <Route path="/liff/discover" element={<LiffDiscoverPage />} />
              <Route path="/liff/favorites" element={<LiffFavoritesPage />} />
              <Route path="/liff/profile" element={<LiffProfilePage />} />
              {/* 鏡像路由：在 LIFF 內看商家 / 訂房，避免跳出 LIFF 樣式 */}
              <Route path="/liff/shop/:slug" element={<ShopDetailPage />} />
              <Route
                path="/liff/shop/:slug/book"
                element={<BookingFlowPage />}
              />
              <Route
                path="/liff/booking/success/:code"
                element={<BookingSuccessPage />}
              />
              <Route
                path="/liff/booking/:code"
                element={<BookingViewPage />}
              />
            </Route>
            <Route path="/liff/bind" element={<LiffBindPage />} />

            {/* Super Admin */}
            <Route element={<AdminAuthScope />}>
              <Route
                path="/admin"
                element={<Navigate to="/admin/shops" replace />}
              />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/shops" element={<AdminShopsPage />} />
                  <Route
                    path="/admin/customers"
                    element={<AdminCustomersPage />}
                  />
                  <Route
                    path="/admin/bookings"
                    element={<AdminBookingsPage />}
                  />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
