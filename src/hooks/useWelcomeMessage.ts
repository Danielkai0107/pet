import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { WelcomeMessage } from "../types/auto-reply";

export const useWelcomeMessage = (shopId: string) => {
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessage | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 讀取歡迎訊息
  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    const fetchWelcomeMessage = async () => {
      try {
        setLoading(true);
        const welcomeDocRef = doc(db, "shops", shopId, "settings", "welcome");
        const welcomeDoc = await getDoc(welcomeDocRef);

        if (welcomeDoc.exists()) {
          setWelcomeMessage(welcomeDoc.data() as WelcomeMessage);
        } else {
          // 如果不存在，設定預設值
          setWelcomeMessage({
            message: "",
            isActive: false,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Error fetching welcome message:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch welcome message"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWelcomeMessage();
  }, [shopId]);

  // 更新歡迎訊息
  const updateWelcomeMessage = async (
    message: string,
    isActive: boolean
  ): Promise<void> => {
    if (!shopId) {
      throw new Error("Shop ID is required");
    }

    try {
      const welcomeDocRef = doc(db, "shops", shopId, "settings", "welcome");
      const now = new Date().toISOString();

      const data: WelcomeMessage = {
        message: message.trim(),
        isActive,
        updatedAt: now,
        createdAt: welcomeMessage?.createdAt || now,
      };

      await setDoc(welcomeDocRef, data);

      setWelcomeMessage(data);
    } catch (err) {
      console.error("Error updating welcome message:", err);
      throw new Error(
        err instanceof Error ? err.message : "Failed to update welcome message"
      );
    }
  };

  return {
    welcomeMessage,
    loading,
    error,
    updateWelcomeMessage,
  };
};
