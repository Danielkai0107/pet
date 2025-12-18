import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../contexts/AdminAuthProvider";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { LayoutDashboard, Store } from "lucide-react";

export const SuperAdminLayout = () => {
  const { adminUser, loading, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [debugStatus, setDebugStatus] = useState("Initializing...");
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (!loading && !adminUser) {
      navigate("/admin/login");
      return;
    }

    const checkRole = async () => {
      if (!adminUser) return;
      setDebugStatus(`Checking role for user: ${adminUser.uid}...`);

      try {
        const adminDocRef = doc(db, "admins", adminUser.uid);
        const adminDoc = await getDoc(adminDocRef);

        if (adminDoc.exists() && adminDoc.data().role === "superadmin") {
          setIsSuperAdmin(true);
          setDebugStatus("Role confirmed: SuperAdmin");
        } else {
          setIsSuperAdmin(false);
          setDebugStatus("Role denied: Not SuperAdmin");
        }
      } catch (err: any) {
        setDebugStatus(`Error: ${err.message}`);
        setIsSuperAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    if (adminUser) {
      checkRole();
    } else if (!loading) {
      setCheckingRole(false);
    }

    // Timeout fallback
    const timer = setTimeout(() => {
      setCheckingRole((current) => {
        if (current) {
          setDebugStatus("Timeout: Force stopping check.");
          return false;
        }
        return false;
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [adminUser, loading, navigate]);

  if (loading || checkingRole) {
    return (
      <div className="superadmin-layout">
        <div className="superadmin-loading">
          <div className="loading-title">驗證權限中...</div>
          <div className="debug-info">Debug: {debugStatus}</div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="superadmin-layout">
        <div className="access-denied">
          <div className="denied-title">權限不足</div>
          <p>您沒有超級管理員權限。</p>
          <button onClick={() => navigate("/admin")} className="back-link">
            返回一般後台
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login");
    } catch (error) {
      // Logout failed
    }
  };

  const currentPath = location.pathname;

  return (
    <div className="superadmin-layout">
      <header className="superadmin-header">
        <div className="header-container">
          <h1>平台管理 (Super Admin)</h1>
          <div className="header-actions">
            <span className="admin-email">{adminUser?.email}</span>
            <button onClick={handleLogout} className="logout-button">
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Tab 導航 */}
      <div className="superadmin-tabs">
        <div className="tabs-container">
          <button
            onClick={() => navigate("/superadmin/dashboard")}
            className={`tab-button ${
              currentPath === "/superadmin" ||
              currentPath === "/superadmin/dashboard"
                ? "active"
                : ""
            }`}
          >
            <LayoutDashboard size={20} />
            <span>系統儀表板</span>
          </button>
          <button
            onClick={() => navigate("/superadmin/shops")}
            className={`tab-button ${
              currentPath === "/superadmin/shops" ? "active" : ""
            }`}
          >
            <Store size={20} />
            <span>商家管理</span>
          </button>
        </div>
      </div>

      <main className="superadmin-main">
        <div className="main-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
