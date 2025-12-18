import { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  limit,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, firebaseConfig } from "../../lib/firebase";
import type {
  Shop,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../types/shop";
import {
  UserPlus,
  QrCode,
  Store,
  ExternalLink,
  Copy,
  Users,
  Eye,
  EyeOff,
  CreditCard,
  RefreshCw,
  Ban,
  Edit,
} from "lucide-react";

interface Admin {
  id: string;
  email: string;
  shopId: string;
  role: string;
  createdAt: any;
}

interface CreatedAdminInfo {
  email: string;
  password: string;
  shopName: string;
}

export const ShopManager = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newShopName, setNewShopName] = useState("");

  // Admin Creation State
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [createdAdminInfo, setCreatedAdminInfo] =
    useState<CreatedAdminInfo | null>(null);

  // QR Code State
  const [showQrFor, setShowQrFor] = useState<string | null>(null);

  // Admin List State
  const [showAdminsFor, setShowAdminsFor] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // LINE API Settings State
  const [editingLineApiFor, setEditingLineApiFor] = useState<string | null>(
    null
  );
  const [liffId, setLiffId] = useState("");
  const [lineChannelId, setLineChannelId] = useState("");
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState("");
  const [savingLineApi, setSavingLineApi] = useState(false);

  // Subscription Management State
  const [editingSubscriptionFor, setEditingSubscriptionFor] = useState<
    string | null
  >(null);
  const [subscriptionPlan, setSubscriptionPlan] =
    useState<SubscriptionPlan>("monthly");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("active");
  const [autoRenew, setAutoRenew] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);

  useEffect(() => {
    fetchShops();
    fetchAdmins();
  }, []);

  const fetchShops = async () => {
    try {
      // P0 優化：加入查詢限制（預期最多 200 家店家）
      const q = query(collection(db, "shops"), limit(200));
      const querySnapshot = await getDocs(q);
      const shopsData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Shop)
      );
      setShops(shopsData);
    } catch (err) {
      // Error fetching shops
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      // P0 優化：加入查詢限制（預期最多 500 位管理員）
      const q = query(collection(db, "admins"), limit(500));
      const querySnapshot = await getDocs(q);
      const adminsData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Admin)
      );
      setAdmins(adminsData);
    } catch (err) {
      console.error("Error fetching admins:", err);
    }
  };

  // 開始編輯 LINE API 設定
  const handleStartEditLineApi = (shop: Shop) => {
    setEditingLineApiFor(shop.id);
    setLiffId(shop.liffId || "");
    setLineChannelId(shop.lineChannelId || "");
    setLineChannelAccessToken(shop.lineChannelAccessToken || "");
  };

  // 取消編輯 LINE API 設定
  const handleCancelEditLineApi = () => {
    setEditingLineApiFor(null);
    setLiffId("");
    setLineChannelId("");
    setLineChannelAccessToken("");
  };

  // 儲存 LINE API 設定
  const handleSaveLineApi = async (shopId: string) => {
    // Multi-Tenant: LIFF ID, Channel ID, Access Token 都是必填
    if (!liffId.trim()) {
      alert("請輸入 LIFF ID");
      return;
    }
    if (!lineChannelId.trim()) {
      alert("請輸入 Channel ID");
      return;
    }
    if (!lineChannelAccessToken.trim()) {
      alert("請輸入 Channel Access Token");
      return;
    }

    setSavingLineApi(true);
    try {
      const shopRef = doc(db, "shops", shopId);
      await setDoc(
        shopRef,
        {
          liffId: liffId.trim(),
          lineChannelId: lineChannelId.trim(),
          lineChannelAccessToken: lineChannelAccessToken.trim(),
        },
        { merge: true }
      );

      // 更新本地狀態
      setShops((prevShops) =>
        prevShops.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                liffId: liffId.trim(),
                lineChannelId: lineChannelId.trim(),
                lineChannelAccessToken: lineChannelAccessToken.trim(),
              }
            : shop
        )
      );

      alert("LINE API 設定已儲存！");
      handleCancelEditLineApi();
    } catch (error) {
      console.error("儲存 LINE API 設定失敗:", error);
      alert("儲存失敗，請稍後再試");
    } finally {
      setSavingLineApi(false);
    }
  };

  // ===== 訂閱管理功能 =====

  // 計算到期日
  const calculateExpiryDate = (
    startDate: Date,
    plan: SubscriptionPlan
  ): Date => {
    const expiry = new Date(startDate);

    switch (plan) {
      case "monthly":
        expiry.setMonth(expiry.getMonth() + 1);
        break;
      case "yearly":
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
      case "trial":
        expiry.setMonth(expiry.getMonth() + 3);
        break;
      case "lifetime_free":
        // 終身免費設定為100年後
        expiry.setFullYear(expiry.getFullYear() + 100);
        break;
    }

    return expiry;
  };

  // 計算剩餘天數
  const getDaysRemaining = (expiryDate: string): number => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // 取得訂閱方案顯示名稱
  const getPlanDisplayName = (plan: SubscriptionPlan): string => {
    switch (plan) {
      case "monthly":
        return "月訂閱";
      case "yearly":
        return "年訂閱";
      case "trial":
        return "試用期";
      case "lifetime_free":
        return "終身免費";
      default:
        return "未知";
    }
  };

  // 取得訂閱狀態顯示名稱
  const getStatusDisplayName = (status: SubscriptionStatus): string => {
    switch (status) {
      case "active":
        return "啟用中";
      case "inactive":
        return "已停用";
      case "expired":
        return "已過期";
      default:
        return "未知";
    }
  };

  // 開始編輯訂閱
  const handleStartEditSubscription = (shop: Shop) => {
    setEditingSubscriptionFor(shop.id);
    if (shop.subscription) {
      setSubscriptionPlan(shop.subscription.plan);
      setSubscriptionStatus(shop.subscription.status);
      setAutoRenew(shop.subscription.autoRenew);
    } else {
      setSubscriptionPlan("trial");
      setSubscriptionStatus("active");
      setAutoRenew(false);
    }
  };

  // 取消編輯訂閱
  const handleCancelEditSubscription = () => {
    setEditingSubscriptionFor(null);
    setSubscriptionPlan("monthly");
    setSubscriptionStatus("active");
    setAutoRenew(false);
  };

  // 儲存訂閱設定
  const handleSaveSubscription = async (shopId: string) => {
    setSavingSubscription(true);
    try {
      const now = new Date();
      const expiryDate = calculateExpiryDate(now, subscriptionPlan);

      const subscriptionData: Subscription = {
        plan: subscriptionPlan,
        status: subscriptionStatus,
        startDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        autoRenew: autoRenew,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      const shopRef = doc(db, "shops", shopId);
      await setDoc(
        shopRef,
        { subscription: subscriptionData },
        { merge: true }
      );

      // 更新本地狀態
      setShops((prevShops) =>
        prevShops.map((shop) =>
          shop.id === shopId
            ? { ...shop, subscription: subscriptionData }
            : shop
        )
      );

      alert("訂閱設定已儲存！");
      handleCancelEditSubscription();
    } catch (error) {
      console.error("儲存訂閱設定失敗:", error);
      alert("儲存失敗，請稍後再試");
    } finally {
      setSavingSubscription(false);
    }
  };

  // 續訂
  const handleRenewSubscription = async (shop: Shop) => {
    if (!shop.subscription) {
      alert("此店鋪尚未設定訂閱");
      return;
    }

    if (
      !confirm(
        `確定要續訂 ${shop.name} 的 ${getPlanDisplayName(
          shop.subscription.plan
        )} 嗎？`
      )
    ) {
      return;
    }

    try {
      const now = new Date();
      const newExpiryDate = calculateExpiryDate(now, shop.subscription.plan);

      const updatedSubscription: Subscription = {
        ...shop.subscription,
        startDate: now.toISOString(),
        expiryDate: newExpiryDate.toISOString(),
        status: "active",
        updatedAt: now.toISOString(),
      };

      const shopRef = doc(db, "shops", shop.id);
      await setDoc(
        shopRef,
        { subscription: updatedSubscription },
        { merge: true }
      );

      await fetchShops();
      alert("續訂成功！");
    } catch (error) {
      console.error("續訂失敗:", error);
      alert("續訂失敗，請稍後再試");
    }
  };

  // 停用訂閱
  const handleDeactivateSubscription = async (shop: Shop) => {
    if (!shop.subscription) return;

    if (
      !confirm(`確定要停用 ${shop.name} 的訂閱嗎？停用後該店鋪將無法登入系統。`)
    ) {
      return;
    }

    try {
      const shopRef = doc(db, "shops", shop.id);
      await setDoc(
        shopRef,
        {
          subscription: {
            ...shop.subscription,
            status: "inactive",
            updatedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );

      await fetchShops();
      alert("訂閱已停用");
    } catch (error) {
      console.error("停用失敗:", error);
      alert("停用失敗，請稍後再試");
    }
  };

  // 修改方案
  const handleChangePlan = async (shop: Shop, newPlan: SubscriptionPlan) => {
    if (!shop.subscription) return;

    if (
      !confirm(
        `確定要將 ${shop.name} 的方案從 ${getPlanDisplayName(
          shop.subscription.plan
        )} 改為 ${getPlanDisplayName(newPlan)} 嗎？`
      )
    ) {
      return;
    }

    try {
      const now = new Date();
      const newExpiryDate = calculateExpiryDate(now, newPlan);

      const updatedSubscription: Subscription = {
        ...shop.subscription,
        plan: newPlan,
        startDate: now.toISOString(),
        expiryDate: newExpiryDate.toISOString(),
        updatedAt: now.toISOString(),
      };

      const shopRef = doc(db, "shops", shop.id);
      await setDoc(
        shopRef,
        { subscription: updatedSubscription },
        { merge: true }
      );

      await fetchShops();
      alert("方案已更新！");
    } catch (error) {
      console.error("更新方案失敗:", error);
      alert("更新失敗，請稍後再試");
    }
  };

  // 篩選即將到期的店家
  const filteredShops = useMemo(() => {
    if (!filterExpiringSoon) return shops;

    return shops.filter((shop) => {
      if (!shop.subscription || shop.subscription.status !== "active")
        return false;
      const daysRemaining = getDaysRemaining(shop.subscription.expiryDate);
      return daysRemaining <= 7 && daysRemaining > 0;
    });
  }, [shops, filterExpiringSoon]);

  // 計算即將到期的數量
  const expiringSoonCount = useMemo(() => {
    return shops.filter((shop) => {
      if (!shop.subscription || shop.subscription.status !== "active")
        return false;
      const daysRemaining = getDaysRemaining(shop.subscription.expiryDate);
      return daysRemaining <= 7 && daysRemaining > 0;
    }).length;
  }, [shops]);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    // Multi-Tenant: 提示需要 LINE 設定
    if (
      !confirm(
        "創建商家後，請立即點擊「LINE API」設定該商家的 LIFF ID 和 Channel 資訊，否則預約功能無法使用。\n\n確定要繼續嗎？"
      )
    ) {
      return;
    }

    try {
      // 創建商家時使用臨時值，稍後必須通過 LINE API 設定完整資訊
      const docRef = await addDoc(collection(db, "shops"), {
        name: newShopName,
        services: [],
        businessHours: {
          start: "10:00",
          end: "19:00",
          daysOpen: [1, 2, 3, 4, 5, 6],
        },
        // Multi-Tenant 必填欄位（使用臨時值）
        liffId: "未設定",
        lineChannelId: "未設定",
        lineChannelAccessToken: "未設定",
      });

      const newShop: Shop = {
        id: docRef.id,
        name: newShopName,
        services: [],
        businessHours: {
          start: "10:00",
          end: "19:00",
          daysOpen: [1, 2, 3, 4, 5, 6],
        },
        liffId: "未設定",
        lineChannelId: "未設定",
        lineChannelAccessToken: "未設定",
      };

      setShops([...shops, newShop]);
      setNewShopName("");
    } catch (err) {
      alert("建立店鋪失敗");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !adminEmail || !adminPassword) return;

    setCreatingAdmin(true);
    setAdminMessage(null);

    // 1. Initialize secondary app
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 2. Create user in secondary app
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        adminEmail,
        adminPassword
      );
      const uid = userCredential.user.uid;

      // 3. Create admin doc in primary firestore (using primary db instance)
      await setDoc(doc(db, "admins", uid), {
        email: adminEmail,
        shopId: selectedShopId,
        role: "admin",
        createdAt: new Date(),
      });

      // 4. Cleanup
      await signOut(secondaryAuth);

      // 保存創建的帳號信息（包含密碼，僅用於顯示）
      const shopName =
        shops.find((s) => s.id === selectedShopId)?.name || "未知店鋪";
      setCreatedAdminInfo({
        email: adminEmail,
        password: adminPassword,
        shopName: shopName,
      });

      setAdminMessage(`成功建立管理員！請記錄以下登入資訊：`);

      // 重新獲取管理員列表
      await fetchAdmins();

      setAdminEmail("");
      setAdminPassword("");
    } catch (err: any) {
      setAdminMessage("建立失敗：" + err.message);
      setCreatedAdminInfo(null);
    } finally {
      // Always delete the app
      await deleteApp(secondaryApp);
      setCreatingAdmin(false);
    }
  };

  const getShopAdmins = (shopId: string) => {
    return admins.filter((admin) => admin.shopId === shopId);
  };

  const getBookingLink = (shopId: string) => {
    // Multi-Tenant: 使用該商家專屬的 LIFF ID（不需要 shopId 參數）
    const shop = shops.find((s) => s.id === shopId);
    if (shop?.liffId && shop.liffId !== "未設定") {
      return `https://liff.line.me/${shop.liffId}`;
    }

    // 如果商家還沒有設定 LIFF ID，返回提示
    return `請先設定該商家的 LIFF ID`;
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="space-y-8">
      {/* Create Shop */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Store className="w-5 h-5 mr-2" /> 建立新店鋪
        </h2>
        <form onSubmit={handleCreateShop} className="flex gap-4">
          <input
            type="text"
            placeholder="店鋪名稱"
            className="flex-1 border-gray-300 rounded-lg p-2 border"
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newShopName.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            建立
          </button>
        </form>
      </div>

      {/* Create Admin Modal/Section */}
      {selectedShopId && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-indigo-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            新增管理員 - {shops.find((s) => s.id === selectedShopId)?.name}
          </h2>

          {/* 提示：可多人管理 */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>提示：</strong>
              同一店鋪可以新增多位管理員，所有管理員都能管理該店鋪的預約和設定。
            </p>
          </div>

          {adminMessage && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                adminMessage.includes("成功")
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-sm font-medium mb-2 ${
                  adminMessage.includes("成功")
                    ? "text-green-800"
                    : "text-red-800"
                }`}
              >
                {adminMessage}
              </p>

              {createdAdminInfo && (
                <div className="mt-3 p-3 bg-white rounded border border-green-300">
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    登入資訊（請妥善保管）：
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">店鋪：</span>
                      <span className="font-mono font-medium">
                        {createdAdminInfo.shopName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">帳號（Email）：</span>
                      <span className="font-mono font-medium">
                        {createdAdminInfo.email}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">密碼：</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {showPassword
                            ? createdAdminInfo.password
                            : "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const text = `店鋪：${createdAdminInfo.shopName}\n帳號：${createdAdminInfo.email}\n密碼：${createdAdminInfo.password}`;
                      navigator.clipboard.writeText(text);
                      alert("登入資訊已複製到剪貼簿！");
                    }}
                    className="mt-3 w-full bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    複製登入資訊
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleCreateAdmin} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full border-gray-300 rounded-lg p-2 border"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密碼
              </label>
              <input
                type="password"
                required
                className="w-full border-gray-300 rounded-lg p-2 border"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={creatingAdmin}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {creatingAdmin ? "建立中..." : "建立帳號"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedShopId(null);
                  setAdminMessage(null);
                  setCreatedAdminInfo(null);
                  setShowPassword(false);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shop List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 篩選按鈕 */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">店鋪列表</h3>
          <button
            onClick={() => setFilterExpiringSoon(!filterExpiringSoon)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterExpiringSoon
                ? "bg-orange-100 text-orange-700 border border-orange-300"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>即將到期 ({expiringSoonCount})</span>
          </button>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                名稱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                訂閱方案
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                訂閱狀態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                到期日（剩餘天數）
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                管理員數量
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredShops.map((shop) => {
              const shopAdmins = getShopAdmins(shop.id);
              const daysRemaining =
                shop.subscription && shop.subscription.status === "active"
                  ? getDaysRemaining(shop.subscription.expiryDate)
                  : null;

              return (
                <tr key={shop.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {shop.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {shop.subscription ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          shop.subscription.plan === "monthly"
                            ? "bg-blue-100 text-blue-800"
                            : shop.subscription.plan === "yearly"
                            ? "bg-yellow-100 text-yellow-800"
                            : shop.subscription.plan === "lifetime_free"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {getPlanDisplayName(shop.subscription.plan)}
                      </span>
                    ) : (
                      <span className="text-gray-400">未訂閱</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {shop.subscription ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          shop.subscription.status === "active"
                            ? "bg-green-100 text-green-800"
                            : shop.subscription.status === "inactive"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getStatusDisplayName(shop.subscription.status)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {shop.subscription &&
                    shop.subscription.status === "active" ? (
                      <div>
                        <div className="text-gray-900">
                          {new Date(
                            shop.subscription.expiryDate
                          ).toLocaleDateString("zh-TW")}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            daysRemaining !== null && daysRemaining <= 7
                              ? "text-orange-600 font-medium"
                              : "text-gray-500"
                          }`}
                        >
                          剩餘 {daysRemaining} 天
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <button
                      onClick={() => setShowAdminsFor(shop.id)}
                      className="flex items-center gap-2 hover:text-indigo-600"
                    >
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{shopAdmins.length}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStartEditSubscription(shop)}
                        className="text-purple-600 hover:text-purple-900 p-1"
                        title="訂閱管理"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedShopId(shop.id)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="新增管理員"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStartEditLineApi(shop)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="LINE API"
                      >
                        <Store className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowQrFor(shop.id)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title="QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Admin List Modal */}
      {showAdminsFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {shops.find((s) => s.id === showAdminsFor)?.name} - 管理員列表
            </h3>

            <div className="mb-4">
              {getShopAdmins(showAdminsFor).length === 0 ? (
                <p className="text-gray-500 text-center py-8">尚無管理員</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Email（帳號）
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          角色
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          建立時間
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getShopAdmins(showAdminsFor).map((admin) => (
                        <tr key={admin.id}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">
                            {admin.email}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {admin.role === "admin" ? "管理員" : admin.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {admin.createdAt
                              ?.toDate?.()
                              ?.toLocaleDateString("zh-TW") || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mb-4">
              <p>
                <strong>提示：</strong>
                密碼無法從系統中查詢（已加密存儲）。如需重設密碼，請使用
                Firebase Console 或聯繫技術人員。
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedShopId(showAdminsFor);
                  setShowAdminsFor(null);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700"
              >
                新增管理員
              </button>
              <button
                onClick={() => setShowAdminsFor(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-300"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINE API Settings Modal */}
      {editingLineApiFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" />
              {shops.find((s) => s.id === editingLineApiFor)?.name} - LINE
              Messaging API 設定
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LIFF ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border-gray-300 rounded-lg p-2 border font-mono text-sm"
                  value={liffId}
                  onChange={(e) => setLiffId(e.target.value)}
                  placeholder="例如: 2008650556-8kWdz6Pv"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  該商家專屬的 LIFF 應用 ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border-gray-300 rounded-lg p-2 border font-mono text-sm"
                  value={lineChannelId}
                  onChange={(e) => setLineChannelId(e.target.value)}
                  placeholder="例如: 2008703252"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Access Token（長期）
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border-gray-300 rounded-lg p-2 border font-mono text-xs"
                  rows={3}
                  value={lineChannelAccessToken}
                  onChange={(e) => setLineChannelAccessToken(e.target.value)}
                  placeholder="例如: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  required
                />
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="font-medium mb-2 text-blue-800">
                  📱 Multi-Tenant 設定說明
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li className="font-medium">
                    在{" "}
                    <a
                      href="https://developers.line.biz/"
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      LINE Developers Console
                    </a>{" "}
                    為此商家創建：
                    <ul className="list-disc list-inside ml-4 mt-1 font-normal">
                      <li>新的 Messaging API Channel</li>
                      <li>新的 LIFF 應用（連結到該 Channel）</li>
                    </ul>
                  </li>
                  <li>
                    取得 <strong>LIFF ID</strong>（在 LIFF 應用頁面）
                  </li>
                  <li>
                    取得 <strong>Channel ID</strong>（在 Channel 的 Basic
                    settings）
                  </li>
                  <li>
                    發行 <strong>Channel Access Token（長期）</strong>（在
                    Messaging API 頁面）
                  </li>
                  <li>將這三個資訊填入上方欄位並儲存</li>
                </ol>
                <p className="mt-3 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                  <strong>重要：</strong>每個商家必須有獨立的 LIFF 和
                  Channel，這樣才能正確發送 LINE 訊息給該商家的客戶。
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEditLineApi}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-300"
                disabled={savingLineApi}
              >
                取消
              </button>
              <button
                onClick={() => handleSaveLineApi(editingLineApiFor)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50"
                disabled={savingLineApi}
              >
                {savingLineApi ? "儲存中..." : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold mb-4">預約連結 QR Code</h3>
            <div className="flex justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  getBookingLink(showQrFor)
                )}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <div className="flex items-center justify-center space-x-2 mb-6 bg-gray-50 p-2 rounded">
              <p className="text-xs text-gray-500 break-all">
                {getBookingLink(showQrFor)}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getBookingLink(showQrFor));
                  alert("連結已複製！");
                }}
                className="text-gray-500 hover:text-indigo-600 p-1"
                title="複製連結"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center space-x-2">
              <a
                href={getBookingLink(showQrFor)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> 開啟
              </a>
              <button
                onClick={() => setShowQrFor(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Management Modal */}
      {editingSubscriptionFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {shops.find((s) => s.id === editingSubscriptionFor)?.name} -
              訂閱管理
            </h3>

            {(() => {
              const shop = shops.find((s) => s.id === editingSubscriptionFor);
              const currentSubscription = shop?.subscription;

              return (
                <>
                  {/* 當前訂閱資訊 */}
                  {currentSubscription ? (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        當前訂閱資訊
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">方案：</span>
                          <span className="font-medium ml-2">
                            {getPlanDisplayName(currentSubscription.plan)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">狀態：</span>
                          <span className="font-medium ml-2">
                            {getStatusDisplayName(currentSubscription.status)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">開始日期：</span>
                          <span className="font-medium ml-2">
                            {new Date(
                              currentSubscription.startDate
                            ).toLocaleDateString("zh-TW")}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">到期日期：</span>
                          <span className="font-medium ml-2">
                            {new Date(
                              currentSubscription.expiryDate
                            ).toLocaleDateString("zh-TW")}
                          </span>
                        </div>
                        {currentSubscription.status === "active" && (
                          <div className="col-span-2">
                            <span className="text-gray-600">剩餘天數：</span>
                            <span className="font-medium ml-2 text-orange-600">
                              {getDaysRemaining(currentSubscription.expiryDate)}{" "}
                              天
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 操作按鈕 */}
                      <div className="space-y-3">
                        {/* 續訂（維持原方案） */}
                        {currentSubscription.status === "active" && (
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm text-gray-800">
                                  續訂
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  維持{" "}
                                  {getPlanDisplayName(currentSubscription.plan)}
                                  ，延長相同期限
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  shop && handleRenewSubscription(shop)
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                              >
                                <RefreshCw className="w-4 h-4" />
                                續訂
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 修改方案 */}
                        {currentSubscription.status === "active" && (
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="font-medium text-sm text-gray-800 mb-2">
                              修改方案
                            </div>
                            <div className="text-xs text-gray-500 mb-3">
                              切換訂閱方案，到期日將重新計算
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {(
                                [
                                  "monthly",
                                  "yearly",
                                  "trial",
                                  "lifetime_free",
                                ] as SubscriptionPlan[]
                              ).map((plan) => (
                                <button
                                  key={plan}
                                  onClick={() =>
                                    shop && handleChangePlan(shop, plan)
                                  }
                                  disabled={plan === currentSubscription.plan}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    plan === currentSubscription.plan
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                  }`}
                                >
                                  {getPlanDisplayName(plan)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 停用訂閱 */}
                        {currentSubscription.status === "active" && (
                          <div className="p-3 bg-white rounded-lg border border-red-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm text-gray-800">
                                  停用訂閱
                                </div>
                                <div className="text-xs text-red-600 mt-0.5">
                                  ⚠️ 停用後該店鋪將無法登入系統
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  shop && handleDeactivateSubscription(shop)
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                              >
                                <Ban className="w-4 h-4" />
                                停用
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 重新啟用（如果是 inactive 或 expired） */}
                        {(currentSubscription.status === "inactive" ||
                          currentSubscription.status === "expired") && (
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="font-medium text-sm text-gray-800 mb-2">
                              重新啟用訂閱
                            </div>
                            <div className="text-xs text-gray-600 mb-3">
                              選擇新的訂閱方案來重新啟用此店鋪
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {(
                                [
                                  "monthly",
                                  "yearly",
                                  "trial",
                                  "lifetime_free",
                                ] as SubscriptionPlan[]
                              ).map((plan) => (
                                <button
                                  key={plan}
                                  onClick={async () => {
                                    if (!shop) return;
                                    if (
                                      !confirm(
                                        `確定要重新啟用 ${
                                          shop.name
                                        } 的訂閱嗎？\n方案：${getPlanDisplayName(
                                          plan
                                        )}`
                                      )
                                    ) {
                                      return;
                                    }

                                    try {
                                      const now = new Date();
                                      const expiryDate = calculateExpiryDate(
                                        now,
                                        plan
                                      );

                                      const updatedSubscription = {
                                        ...currentSubscription,
                                        plan: plan,
                                        status: "active" as const,
                                        startDate: now.toISOString(),
                                        expiryDate: expiryDate.toISOString(),
                                        updatedAt: now.toISOString(),
                                      };

                                      const shopRef = doc(db, "shops", shop.id);
                                      await setDoc(
                                        shopRef,
                                        { subscription: updatedSubscription },
                                        { merge: true }
                                      );

                                      await fetchShops();
                                      alert("訂閱已重新啟用！");
                                    } catch (error) {
                                      console.error("重新啟用失敗:", error);
                                      alert("重新啟用失敗，請稍後再試");
                                    }
                                  }}
                                  className="px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                >
                                  {getPlanDisplayName(plan)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // 新增訂閱（沒有現有訂閱）
                    <div className="space-y-4 mb-6">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                        <p className="text-sm text-blue-700">
                          此店鋪尚未設定訂閱，請選擇方案來啟用
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          選擇訂閱方案
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                          {(
                            [
                              "trial",
                              "monthly",
                              "yearly",
                              "lifetime_free",
                            ] as SubscriptionPlan[]
                          ).map((plan) => (
                            <button
                              key={plan}
                              type="button"
                              onClick={() => setSubscriptionPlan(plan)}
                              className={`p-4 rounded-lg border-2 text-center transition-all ${
                                subscriptionPlan === plan
                                  ? "border-purple-500 bg-purple-50 shadow-md"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="font-medium text-base mb-1">
                                {getPlanDisplayName(plan)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {plan === "monthly"
                                  ? "1 個月"
                                  : plan === "yearly"
                                  ? "12 個月"
                                  : plan === "lifetime_free"
                                  ? "永久免費"
                                  : "3 個月免費"}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="font-medium mb-1 text-blue-800">說明</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>新訂閱將從現在開始計算，自動設定到期日</li>
                          <li>建議新店鋪先使用試用期（3個月免費）</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleCancelEditSubscription}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-300"
                      disabled={savingSubscription}
                    >
                      關閉
                    </button>
                    {!currentSubscription && (
                      <button
                        onClick={() =>
                          handleSaveSubscription(editingSubscriptionFor)
                        }
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        disabled={savingSubscription}
                      >
                        {savingSubscription ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>儲存中...</span>
                          </>
                        ) : (
                          <>
                            <Edit className="w-4 h-4" />
                            <span>新增訂閱</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
