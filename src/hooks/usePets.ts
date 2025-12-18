import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useLineAuth } from "../contexts/LineAuthProvider";
import type { Pet } from "../types/pet";

export const usePets = () => {
  const { user } = useLineAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (pets.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPets([]);
      }
      if (loading) setLoading(false);
      return;
    }

    const petsRef = collection(db, "users", user.uid, "pets");
    // P0 優化：限制查詢數量（一般用戶不會有超過 50 隻寵物）
    const q = query(petsRef, limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const petsData: Pet[] = [];
        snapshot.forEach((doc) => {
          petsData.push(doc.data() as Pet);
        });
        setPets(petsData);
        setLoading(false);
      },
      () => {
        setError("Failed to fetch pets");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const addPet = async (pet: Pet) => {
    if (!user?.uid) return;
    try {
      // Use pet.id as document ID
      await setDoc(doc(db, "users", user.uid, "pets", pet.id), pet);
    } catch (err) {
      throw err;
    }
  };

  const updatePet = async (petId: string, updates: Partial<Pet>) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "pets", petId), updates);
    } catch (err) {
      throw err;
    }
  };

  const deletePet = async (petId: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "pets", petId));
    } catch (err) {
      throw err;
    }
  };

  return { pets, loading, error, addPet, updatePet, deletePet };
};
