import { useState, useCallback } from "react";
import { useLineMessageQuota } from "../../hooks/useLineMessageQuota";
import { useShopSettings } from "../../hooks/useShopSettings";
import {
  Copy,
  Check,
  Link as LinkIcon,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

interface LineManagementProps {
  shopId: string;
}

type TabType = "quota" | "liff";

export const LineManagement = ({ shopId }: LineManagementProps) => {
  const { shop, loading } = useShopSettings(shopId);
  const quota = useLineMessageQuota(shopId);
  const [copied, setCopied] = useState(false);
  const [refreshingQuota, setRefreshingQuota] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("quota");

  // Multi-Tenant: 使用商家專屬的 LIFF ID 生成 URL
  const liffUrl =
    shop?.liffId && shop.liffId !== "未設定"
      ? `https://liff.line.me/${shop.liffId}`
      : null;

  const copyToClipboard = async () => {
    if (!liffUrl) return;

    try {
      await navigator.clipboard.writeText(liffUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = liffUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshQuota = useCallback(async () => {
    setRefreshingQuota(true);
    try {
      await quota.refetch();
    } finally {
      setRefreshingQuota(false);
    }
  }, [quota]);

  if (loading || !shop) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="shop-settings-container">
      {/* Subscription Badge */}
      {shop.subscription && (
        <div className="subscription-badge-navbar">
          <span
            className={`plan-indicator ${
              shop.subscription.plan === "lifetime_free" &&
              shop.subscription.status === "active"
                ? "lifetime-free"
                : shop.subscription.status === "active"
                ? "active"
                : shop.subscription.status === "inactive"
                ? "inactive"
                : "expired"
            }`}
          >
            <span className="status-dot"></span>
            <span className="status-text">
              {shop.subscription.status === "active" ? (
                <>
                  {shop.subscription.plan === "monthly"
                    ? "月訂閱"
                    : shop.subscription.plan === "yearly"
                    ? "年訂閱"
                    : shop.subscription.plan === "lifetime_free"
                    ? "終身免費"
                    : "試用期"}
                </>
              ) : shop.subscription.status === "inactive" ? (
                "已停用"
              ) : (
                "已過期"
              )}
            </span>
            {shop.subscription.status === "active" &&
              shop.subscription.plan !== "lifetime_free" && (
                <>
                  <span className="expiry-date">
                    到期：
                    {new Date(shop.subscription.expiryDate).toLocaleDateString(
                      "zh-TW",
                      {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                      }
                    )}
                  </span>
                  <span className="days-remaining">
                    {(() => {
                      const expiry = new Date(shop.subscription.expiryDate);
                      const now = new Date();
                      const diff = expiry.getTime() - now.getTime();
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                      return `剩 ${days} 天`;
                    })()}
                  </span>
                </>
              )}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="popup-tabs" style={{ marginTop: "1rem" }}>
        <button
          className={`tab-button ${activeTab === "quota" ? "active" : ""}`}
          onClick={() => setActiveTab("quota")}
        >
          <MessageCircle size={18} />
          <span>訊息配額</span>
        </button>
        <button
          className={`tab-button ${activeTab === "liff" ? "active" : ""}`}
          onClick={() => setActiveTab("liff")}
        >
          <LinkIcon size={18} />
          <span>預約連結</span>
        </button>
      </div>

      <div className="row-container">
        {/* Tab Content: LIFF Booking Link */}
        {activeTab === "liff" && liffUrl && (
          <div className="settings-widget liff-widget flex-1">
            <div className="widget-header">
              <div className="header-icon">
                <LinkIcon size={24} />
              </div>
              <div className="header-content">
                <h3>預約連結 (LIFF)</h3>
                <p>客戶可透過此連結進入 LINE 預約系統</p>
              </div>
            </div>
            <div className="widget-body">
              <div className="liff-url-container">
                <div className="url-display">{liffUrl}</div>
                <button onClick={copyToClipboard} className="copy-button">
                  {copied ? (
                    <>
                      <Check size={18} />
                      <span>已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>複製</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: LINE Message Quota */}
        {activeTab === "quota" && (
          <div className="settings-widget quota-widget flex-1">
          <div className="widget-header">
            <div className="header-icon">
              <MessageCircle size={24} />
            </div>
            <div className="header-content">
              <h3>LINE 訊息配額</h3>
              <p>本月 LINE OA 的訊息使用狀況</p>
            </div>
            <button
              onClick={refreshQuota}
              disabled={refreshingQuota || quota.loading}
              className="refresh-quota-button"
              title="重新整理統計"
            >
              <RefreshCw
                size={18}
                className={refreshingQuota || quota.loading ? "spinning" : ""}
              />
            </button>
          </div>
          <div className="widget-body">
            {quota.loading ? (
              <div className="quota-loading">
                <div className="loading-spinner"></div>
                <p>載入中...</p>
              </div>
            ) : quota.error ? (
              <div className="quota-error">
                <p className="error-message">{quota.error}</p>
                <p className="error-hint">
                  請確認已在 Superadmin 設定 LINE API
                </p>
              </div>
            ) : (
              <div className="quota-display">
                {/* LINE 官方配額 */}
                {quota.officialQuota ? (
                  <div className="quota-official">
                    <div className="official-header">
                      <h4>LINE 官方配額</h4>
                      <span className="month-badge">{quota.yearMonth}</span>
                    </div>

                    <div className="quota-main">
                      <div className="quota-total">
                        <div className="total-number">
                          {quota.officialQuota.total.toLocaleString()}
                        </div>
                        <div className="total-label">則 / 每月免費額度</div>
                      </div>

                      <div className="quota-progress-container">
                        <div className="quota-progress-bar">
                          <div
                            className={`progress-fill ${
                              quota.officialQuota.percentage >= 80
                                ? "danger"
                                : quota.officialQuota.percentage >= 50
                                ? "caution"
                                : "normal"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                quota.officialQuota.percentage
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className="quota-legend">
                          <div className="legend-item">
                            <span className="legend-label">已使用</span>
                            <span className="legend-value">
                              {quota.officialQuota.used.toLocaleString()} 則
                            </span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-label">剩餘</span>
                            <span className="legend-value">
                              {quota.officialQuota.remaining.toLocaleString()}{" "}
                              則
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 警告提示 */}
                      {quota.officialQuota.percentage >= 80 && (
                        <div
                          className={`quota-warning ${
                            quota.officialQuota.percentage >= 100
                              ? "level-critical"
                              : quota.officialQuota.percentage >= 90
                              ? "level-danger"
                              : "level-caution"
                          }`}
                        >
                          <div className="warning-icon">⚠️</div>
                          <div className="warning-content">
                            {quota.officialQuota.percentage >= 100 ? (
                              <>
                                <div className="warning-title">
                                  已達每月訊息上限
                                </div>
                                <div className="warning-text">
                                  請升級 LINE OA 方案以繼續發送訊息
                                </div>
                              </>
                            ) : quota.officialQuota.percentage >= 90 ? (
                              <>
                                <div className="warning-title">
                                  配額即將用盡
                                </div>
                                <div className="warning-text">
                                  已使用{" "}
                                  {quota.officialQuota.percentage.toFixed(1)}%
                                  ，請注意控制發送量
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="warning-title">
                                  接近配額上限
                                </div>
                                <div className="warning-text">
                                  已使用{" "}
                                  {quota.officialQuota.percentage.toFixed(1)}%
                                  ，請注意使用狀況
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
