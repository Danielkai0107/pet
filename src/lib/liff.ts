import liff from "@line/liff";

// 快取鍵
const SHOP_ID_CACHE_KEY = "liff_shop_id_cache";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 小時

interface ShopIdCache {
  [liffId: string]: {
    shopId: string;
    timestamp: number;
  };
}

export const initLiff = async (liffId: string, timeout = 5000) => {
  try {
    // 建立超時 Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("LIFF 初始化超時"));
      }, timeout);
    });

    // 與 liff.init 競速，誰先完成就用誰
    await Promise.race([liff.init({ liffId }), timeoutPromise]);

    return liff;
  } catch (error) {
    throw error;
  }
};

// 從快取中獲取 shopId
export const getCachedShopId = (liffId: string): string | null => {
  try {
    const cacheStr = localStorage.getItem(SHOP_ID_CACHE_KEY);
    if (!cacheStr) return null;

    const cache: ShopIdCache = JSON.parse(cacheStr);
    const cached = cache[liffId];

    if (!cached) return null;

    // 檢查快取是否過期
    const now = Date.now();
    if (now - cached.timestamp > CACHE_EXPIRY_MS) {
      // 快取過期，清除
      delete cache[liffId];
      localStorage.setItem(SHOP_ID_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return cached.shopId;
  } catch (error) {
    return null;
  }
};

// 儲存 shopId 到快取
export const cacheShopId = (liffId: string, shopId: string) => {
  try {
    const cacheStr = localStorage.getItem(SHOP_ID_CACHE_KEY);
    const cache: ShopIdCache = cacheStr ? JSON.parse(cacheStr) : {};

    cache[liffId] = {
      shopId,
      timestamp: Date.now(),
    };

    localStorage.setItem(SHOP_ID_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    // 靜默失敗，不影響主流程
  }
};

// Multi-Tenant: 通過 LIFF ID 取得商家 ID（帶快取）
export const getShopIdByLiffId = async (
  liffId: string,
  useCache = true
): Promise<string | null> => {
  try {
    // 先檢查快取
    if (useCache) {
      const cachedShopId = getCachedShopId(liffId);
      if (cachedShopId) {
        return cachedShopId;
      }
    }

    // 快取未命中，查詢 Firestore
    const { collection, query, where, getDocs } = await import(
      "firebase/firestore"
    );
    const { db } = await import("./firebase");

    const q = query(collection(db, "shops"), where("liffId", "==", liffId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const shopId = querySnapshot.docs[0].id;
      // 存入快取
      cacheShopId(liffId, shopId);
      return shopId;
    }

    return null;
  } catch (error) {
    return null;
  }
};

// 清除快取（用於測試或錯誤恢復）
export const clearShopIdCache = () => {
  try {
    localStorage.removeItem(SHOP_ID_CACHE_KEY);
  } catch (error) {
    // 靜默失敗
  }
};

export default liff;
