import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 自動根據螢幕寬度重定向到對應的管理介面
 * < 768px -> 手機版 (/admin/mobile)
 * >= 768px -> 桌面版 (/admin/dashboard)
 */
export const AdminRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const screenWidth = window.innerWidth;
    console.log(`自動重定向: 螢幕寬度 ${screenWidth}px`);

    if (screenWidth < 768) {
      // 手機裝置
      console.log("重定向到手機版");
      sessionStorage.setItem("admin_device_type", "mobile");
      navigate("/admin/mobile", { replace: true });
    } else {
      // 平板或電腦
      console.log("重定向到桌面版");
      sessionStorage.setItem("admin_device_type", "desktop");
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.125rem",
        color: "#6b7280",
      }}
    >
      正在載入...
    </div>
  );
};
