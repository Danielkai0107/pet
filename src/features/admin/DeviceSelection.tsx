import { useState } from "react";
import { useNavigate } from "react-router-dom";
import crmLogo from "../../assets/crm-logo.svg";
import toast from "react-hot-toast";

export const DeviceSelection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDeviceSelect = (device: "desktop" | "mobile") => {
    // 檢查螢幕寬度是否符合所選裝置
    const screenWidth = window.innerWidth;

    console.log(`選擇裝置: ${device}, 目前螢幕寬度: ${screenWidth}px`);

    if (device === "desktop" && screenWidth < 768) {
      console.log("阻擋: 螢幕寬度不足，無法使用電腦版");
      toast.error("請使用電腦進行操作", {
        duration: 3000,
        style: {
          background: "#EF4444",
          color: "#fff",
        },
      });
      return;
    }

    if (device === "mobile" && screenWidth >= 768) {
      console.log("阻擋: 螢幕寬度過大，無法使用手機版");
      toast.error("請使用行動裝置進行操作", {
        duration: 3000,
        style: {
          background: "#EF4444",
          color: "#fff",
        },
      });
      return;
    }

    console.log("通過檢查，開始導航");
    setLoading(true);

    // 儲存裝置選擇到 sessionStorage
    sessionStorage.setItem("admin_device_type", device);

    // 導航到對應的頁面
    setTimeout(() => {
      if (device === "desktop") {
        navigate("/admin/dashboard");
      } else {
        navigate("/admin/mobile");
      }
    }, 300);
  };

  return (
    <div className="device-selection-container">
      <div className="device-selection-card">
        <div className="logo-header">
          <img src={crmLogo} alt="CRM Logo" className="logo" />
          <h2>選擇裝置模式</h2>
          <p className="subtitle">請選擇您要使用的裝置版本</p>
        </div>

        <div className="device-options">
          <button
            onClick={() => handleDeviceSelect("desktop")}
            disabled={loading}
            className="device-option desktop"
          >
            <span className="material-symbols-rounded device-icon">
              computer
            </span>
            <h3>電腦版</h3>
            <p>完整功能，適合桌面操作</p>
          </button>

          <button
            onClick={() => handleDeviceSelect("mobile")}
            disabled={loading}
            className="device-option mobile"
          >
            <span className="material-symbols-rounded device-icon">
              smartphone
            </span>
            <h3>手機版</h3>
            <p>今日預約管理，適合移動操作</p>
          </button>
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};
