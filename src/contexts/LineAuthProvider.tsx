import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { initLiff, getShopIdByLiffId } from "../lib/liff";
import type { User } from "../types/user";
import liff from "@line/liff";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  shopId: string | null; // Multi-Tenant: 當前商家 ID
}

const LineAuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  shopId: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useLineAuth = () => useContext(LineAuthContext);

export const LineAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null); // Multi-Tenant

  /* eslint-disable react-hooks/exhaustive-deps */
  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 添加超時保護機制（8秒）
    const timeoutId = setTimeout(() => {
      console.error("⏱️ LIFF 初始化超時");
      setError("載入超時");
      setLoading(false);

      // 如果在 LINE LIFF 環境中，自動關閉視窗
      if (liff.isInClient()) {
        console.log("🚪 自動關閉 LIFF 視窗");
        setTimeout(() => {
          liff.closeWindow();
        }, 1000); // 延遲 1 秒讓用戶看到錯誤訊息
      }
    }, 8000);

    const initialize = async () => {
      try {
        const isDevelopment = import.meta.env.DEV;

        // 🔧 開發模式：如果沒有 LIFF ID，使用假資料
        if (isDevelopment && !import.meta.env.VITE_LIFF_ID) {
          console.log("⚠️ 開發模式：未設定 VITE_LIFF_ID，使用測試用戶資料");

          const mockUser: User = {
            uid: "dev-user-123",
            displayName: "測試用戶",
            pictureUrl: "https://via.placeholder.com/150",
            createdAt: Timestamp.now(),
            role: "customer",
          };
          setUser(mockUser);
          setShopId("test-shop-123");
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        // Multi-Tenant: 取得 LIFF ID
        let currentLiffId: string;

        if (isDevelopment) {
          // 開發環境：使用環境變數的 LIFF ID
          currentLiffId = import.meta.env.VITE_LIFF_ID;
          console.log("🔧 開發模式：使用 .env 的 LIFF ID", currentLiffId);
          await initLiff(currentLiffId);
        } else {
          // 正式環境：先嘗試從 URL 提取（在重定向前）
          const currentUrl = window.location.href;
          const liffUrlMatch = currentUrl.match(/liff\.line\.me\/([^\/\?]+)/);

          if (liffUrlMatch) {
            // 情況 1：URL 還包含 liff.line.me（尚未重定向）
            currentLiffId = liffUrlMatch[1];
            console.log("📍 從 URL 提取 LIFF ID:", currentLiffId);
            await initLiff(currentLiffId);
          } else {
            // 情況 2：已經重定向到 Endpoint URL
            const defaultLiffId =
              import.meta.env.VITE_LIFF_ID || "2008704504-EFlwzctY";
            console.log("🔄 URL 已重定向，使用預設 LIFF ID:", defaultLiffId);
            await initLiff(defaultLiffId);

            // 初始化後，從 LIFF SDK 獲取實際的 LIFF ID
            currentLiffId = liff.id || defaultLiffId;
            console.log("✅ LIFF 初始化完成，實際 LIFF ID:", currentLiffId);
          }
        }

        // Multi-Tenant: 通過 LIFF ID 查找對應的商家
        const foundShopId = await getShopIdByLiffId(currentLiffId);

        if (!foundShopId) {
          throw new Error(
            `找不到使用 LIFF ID ${currentLiffId} 的商家，請聯繫管理員。`
          );
        }

        setShopId(foundShopId);
        console.log("✅ Multi-Tenant: 綁定商家", {
          liffId: currentLiffId,
          shopId: foundShopId,
        });

        // 檢查登入狀態
        if (!liff.isLoggedIn()) {
          console.log("🔐 用戶未登入，準備跳轉到 LINE 登入頁面");

          // 🔧 修復：在重定向前先結束 loading 狀態
          clearTimeout(timeoutId);
          setLoading(false);

          // 延遲一點點再跳轉，確保 UI 更新
          setTimeout(() => {
            liff.login({ redirectUri: window.location.href });
          }, 100);

          return;
        }

        // 獲取用戶資料
        const profile = await liff.getProfile();
        const userId = profile.userId;

        // MVP Strategy: Check Firestore directly using LINE User ID
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // 用戶已存在，保留飼主姓名（displayName），只更新頭像
          const existingData = userDoc.data();
          const updatedUser: User = {
            ...existingData,
            displayName: existingData.displayName || profile.displayName,
            pictureUrl: profile.pictureUrl || existingData.pictureUrl || "",
          } as User;

          // 只更新頭像，不更新 displayName
          await setDoc(
            userDocRef,
            {
              pictureUrl: profile.pictureUrl || "",
            },
            { merge: true }
          );

          setUser(updatedUser);
        } else {
          // 新用戶：自動註冊
          const newUser: User = {
            uid: userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || "",
            createdAt: Timestamp.now(),
            role: "customer",
          };

          await setDoc(userDocRef, newUser);
          setUser(newUser);
        }
      } catch (err: unknown) {
        console.error("❌ LIFF 初始化錯誤:", err);
        setError((err as Error).message || "Failed to initialize LIFF");
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  return (
    <LineAuthContext.Provider value={{ user, loading, error, shopId }}>
      {children}
    </LineAuthContext.Provider>
  );
};
