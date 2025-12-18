import { useState, useEffect } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  AutoReplyRule,
  CreateAutoReplyRuleInput,
  UpdateAutoReplyRuleInput,
} from "../types/auto-reply";
import toast from "react-hot-toast";

/**
 * Custom Hook: 管理自動回覆規則
 * @param shopId 商店 ID
 */
export const useAutoReplyRules = (shopId: string) => {
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 即時監聽規則變化
  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    const rulesRef = collection(db, "shops", shopId, "autoReplyRules");
    const q = query(rulesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rulesData: AutoReplyRule[] = [];
        snapshot.forEach((doc) => {
          rulesData.push({
            id: doc.id,
            ...doc.data(),
          } as AutoReplyRule);
        });
        setRules(rulesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching auto-reply rules:", err);
        setError("無法讀取自動回覆規則");
        setLoading(false);
        toast.error("無法讀取自動回覆規則");
      }
    );

    return () => unsubscribe();
  }, [shopId]);

  /**
   * 新增規則
   */
  const createRule = async (input: CreateAutoReplyRuleInput): Promise<void> => {
    try {
      // 驗證輸入
      if (!input.keyword || input.keyword.trim().length === 0) {
        throw new Error("關鍵字不可為空");
      }
      if (input.keyword.length > 50) {
        throw new Error("關鍵字長度不可超過 50 字元");
      }
      if (!input.replyMessage || input.replyMessage.trim().length === 0) {
        throw new Error("回覆訊息不可為空");
      }
      if (input.replyMessage.length > 2000) {
        throw new Error("回覆訊息長度不可超過 2000 字元");
      }

      // 檢查是否有重複的關鍵字
      const duplicateRule = rules.find(
        (rule) => rule.keyword.toLowerCase() === input.keyword.toLowerCase()
      );
      if (duplicateRule) {
        throw new Error(`關鍵字「${input.keyword}」已存在`);
      }

      const now = new Date().toISOString();
      const rulesRef = collection(db, "shops", shopId, "autoReplyRules");

      await addDoc(rulesRef, {
        keyword: input.keyword.trim(),
        replyMessage: input.replyMessage.trim(),
        matchType: "partial",
        isActive: input.isActive !== undefined ? input.isActive : true,
        createdAt: now,
        updatedAt: now,
      });

      toast.success("自動回覆規則已新增");
    } catch (err) {
      console.error("Error creating auto-reply rule:", err);
      const errorMessage = err instanceof Error ? err.message : "新增規則失敗";
      toast.error(errorMessage);
      throw err;
    }
  };

  /**
   * 更新規則
   */
  const updateRule = async (input: UpdateAutoReplyRuleInput): Promise<void> => {
    try {
      // 驗證輸入
      if (input.keyword !== undefined) {
        if (input.keyword.trim().length === 0) {
          throw new Error("關鍵字不可為空");
        }
        if (input.keyword.length > 50) {
          throw new Error("關鍵字長度不可超過 50 字元");
        }

        // 檢查是否有重複的關鍵字（排除自己）
        const duplicateRule = rules.find(
          (rule) =>
            rule.id !== input.id &&
            rule.keyword.toLowerCase() === input.keyword?.toLowerCase()
        );
        if (duplicateRule) {
          throw new Error(`關鍵字「${input.keyword}」已存在`);
        }
      }

      if (input.replyMessage !== undefined) {
        if (input.replyMessage.trim().length === 0) {
          throw new Error("回覆訊息不可為空");
        }
        if (input.replyMessage.length > 2000) {
          throw new Error("回覆訊息長度不可超過 2000 字元");
        }
      }

      const ruleRef = doc(db, "shops", shopId, "autoReplyRules", input.id);
      const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (input.keyword !== undefined) {
        updateData.keyword = input.keyword.trim();
      }
      if (input.replyMessage !== undefined) {
        updateData.replyMessage = input.replyMessage.trim();
      }
      if (input.isActive !== undefined) {
        updateData.isActive = input.isActive;
      }

      await updateDoc(ruleRef, updateData);
      toast.success("自動回覆規則已更新");
    } catch (err) {
      console.error("Error updating auto-reply rule:", err);
      const errorMessage = err instanceof Error ? err.message : "更新規則失敗";
      toast.error(errorMessage);
      throw err;
    }
  };

  /**
   * 刪除規則
   */
  const deleteRule = async (ruleId: string): Promise<void> => {
    try {
      const ruleRef = doc(db, "shops", shopId, "autoReplyRules", ruleId);
      await deleteDoc(ruleRef);
      toast.success("自動回覆規則已刪除");
    } catch (err) {
      console.error("Error deleting auto-reply rule:", err);
      toast.error("刪除規則失敗");
      throw err;
    }
  };

  /**
   * 切換啟用狀態
   */
  const toggleRule = async (ruleId: string): Promise<void> => {
    try {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) {
        throw new Error("找不到規則");
      }

      const ruleRef = doc(db, "shops", shopId, "autoReplyRules", ruleId);
      await updateDoc(ruleRef, {
        isActive: !rule.isActive,
        updatedAt: new Date().toISOString(),
      });

      const status = !rule.isActive ? "已啟用" : "已停用";
      toast.success(`規則${status}`);
    } catch (err) {
      console.error("Error toggling auto-reply rule:", err);
      toast.error("切換狀態失敗");
      throw err;
    }
  };

  return {
    rules,
    loading,
    error,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
};
