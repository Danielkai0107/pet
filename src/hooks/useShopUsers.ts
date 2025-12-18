import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { User } from "../types/user";

interface ShopUser extends User {
  id: string;
}

export const useShopUsers = (shopId: string) => {
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!shopId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usersRef = collection(db, "shops", shopId, "users");
      const q = query(usersRef, orderBy("followedAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const usersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ShopUser[];

          setUsers(usersData);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching shop users:", err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up shop users listener:", err);
      setError(err as Error);
      setLoading(false);
    }
  }, [shopId]);

  return { users, loading, error };
};

