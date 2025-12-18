import { useState } from "react";
import { useAdminAuth } from "../../contexts/AdminAuthProvider";
import { useNavigate } from "react-router-dom";
import crmLogo from "../../assets/crm-logo.svg";

export const AdminLogin = () => {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showContactSupport, setShowContactSupport] = useState(false);

  // 🔧 開發模式：快速登入
  const isDevelopment = import.meta.env.DEV;
  const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  const handleDevLogin = () => {
    sessionStorage.removeItem("dev_admin_logged_out");
    // 自動判斷裝置類型並導向
    const screenWidth = window.innerWidth;
    if (screenWidth < 768) {
      sessionStorage.setItem("admin_device_type", "mobile");
      window.location.href = "/admin/mobile";
    } else {
      sessionStorage.setItem("admin_device_type", "desktop");
      window.location.href = "/admin/dashboard";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);

      // Check role for redirect
      const { getDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");
      const { getAuth } = await import("firebase/auth");
      const user = getAuth().currentUser;

      if (user) {
        const adminRef = doc(db, "admins", user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data();

          // 檢查是否為 superadmin（superadmin 不檢查訂閱）
          if (adminData.role === "superadmin") {
            navigate("/superadmin");
            return;
          }

          // 檢查店鋪訂閱狀態
          if (adminData.shopId) {
            const shopRef = doc(db, "shops", adminData.shopId);
            const shopSnap = await getDoc(shopRef);

            if (shopSnap.exists()) {
              const shopData = shopSnap.data();

              // 檢查訂閱狀態
              if (
                shopData.subscription?.status === "inactive" ||
                shopData.subscription?.status === "expired"
              ) {
                // 顯示聯繫客服彈窗
                setError(
                  `您的帳號訂閱已${
                    shopData.subscription.status === "inactive"
                      ? "停用"
                      : "過期"
                  }，請聯繫客服`
                );
                setShowContactSupport(true);

                // 登出用戶
                const { getAuth, signOut } = await import("firebase/auth");
                await signOut(getAuth());
                return;
              }
            }
          }

          // 正常登入流程
          const screenWidth = window.innerWidth;
          if (screenWidth < 768) {
            // 手機裝置
            sessionStorage.setItem("admin_device_type", "mobile");
            navigate("/admin/mobile");
          } else {
            // 平板或電腦
            sessionStorage.setItem("admin_device_type", "desktop");
            navigate("/admin/dashboard");
          }
        } else {
          setError("找不到管理員資料");
        }
      } else {
        // 未登入用戶，根據螢幕寬度導向
        const screenWidth = window.innerWidth;
        if (screenWidth < 768) {
          sessionStorage.setItem("admin_device_type", "mobile");
          navigate("/admin/mobile");
        } else {
          sessionStorage.setItem("admin_device_type", "desktop");
          navigate("/admin/dashboard");
        }
      }
    } catch (err: any) {
      console.error("管理員登入錯誤:", err);
      setError("登入失敗，請檢查帳號密碼");
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="login-header">
          <img src={crmLogo} alt="CRM Logo" className="login-logo" />
          <h2>PET CRM</h2>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-inputs">
            <div>
              <input
                type="email"
                required
                className="input-field input-top"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="input-field input-bottom"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div>
            <button type="submit" className="submit-button">
              登入
            </button>
          </div>

          {/* 🔧 開發模式：快速登入按鈕 */}
          {isDevelopment && !hasFirebaseConfig && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={handleDevLogin}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                🔧 開發模式快速登入
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 聯繫客服彈窗 */}
      {showContactSupport && (
        <div className="contact-support-modal-overlay">
          <div className="contact-support-modal">
            <h3 className="modal-title">帳號訂閱已停用</h3>
            <p className="modal-message">您的訂閱已停用或過期，無法登入系統</p>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-label">客服電話</span>
                <a href="tel:0800-123-456" className="contact-value">
                  0800-123-456
                </a>
              </div>
              <div className="contact-item">
                <span className="contact-label">客服信箱</span>
                <a href="mailto:support@petcrm.com" className="contact-value">
                  support@petcrm.com
                </a>
              </div>
              <div className="contact-item">
                <span className="contact-label">LINE 官方帳號</span>
                <a
                  href="https://line.me/R/ti/p/@petcrm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-value"
                >
                  @petcrm
                </a>
              </div>
            </div>
            <button
              onClick={() => {
                setShowContactSupport(false);
                setError(null);
              }}
              className="modal-close-button"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
