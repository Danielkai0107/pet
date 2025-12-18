import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Shop } from "../types/shop";

export const useShopSettings = (shopId: string | null) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    // 🔧 開發模式：如果是測試商店 ID，返回假資料
    const isDevelopment = import.meta.env.DEV;
    const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    if (isDevelopment && !hasFirebaseConfig && shopId === "test-shop-123") {
      const mockShop: Shop = {
        id: "test-shop-123",
        name: "測試寵物美容店",
        logoUrl:
          "https://ui-avatars.com/api/?name=Test+Shop&background=6366f1&color=fff&size=200",
        businessHours: {
          start: "09:00",
          end: "21:00",
          daysOpen: [0, 1, 2, 3, 4, 5, 6], // Open all days
        },
        services: [
          {
            id: "service-1",
            name: "基礎洗澡",
            price: 500,
            duration: 60,
          },
          {
            id: "service-2",
            name: "美容造型",
            price: 1200,
            duration: 120,
          },
          {
            id: "service-3",
            name: "藥浴SPA",
            price: 800,
            duration: 90,
          },
        ],
        // Multi-Tenant 必填欄位（測試用假資料）
        liffId: "test-liff-id",
        lineChannelId: "test-channel-id",
        lineChannelAccessToken: "test-access-token",
      };
      setShop(mockShop);
      setLoading(false);
      return;
    }

    const fetchShop = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "shops", shopId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setShop({ id: docSnap.id, ...docSnap.data() } as Shop);
        } else {
          // Optional: Handle case where shop doesn't exist but ID is provided
          // For now, we just return null shop
          setShop(null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [shopId]);

  const updateSettings = async (data: Partial<Shop>) => {
    if (!shopId) throw new Error("No shop ID provided");

    try {
      const docRef = doc(db, "shops", shopId);
      // Determine if we need to set (create) or update
      // Logic: If shop exists in state, update. If not, set.
      // Ideally backend ensures shop exists, but here we might be initializing it.

      // We'll use setDoc with merge: true to cover both cases safely for this MVP context
      await setDoc(docRef, data, { merge: true });

      // Update local state
      setShop((prev) =>
        prev ? { ...prev, ...data } : ({ id: shopId, ...data } as Shop)
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { shop, loading, error, updateSettings };
};
