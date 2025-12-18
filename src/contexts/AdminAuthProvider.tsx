import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import app from "../lib/firebase";

interface AdminAuthContextType {
  adminUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  adminUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    // 🔧 開發模式：如果沒有 Firebase 配置，使用測試管理員
    const isDevelopment = import.meta.env.DEV;
    const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    if (isDevelopment && !hasFirebaseConfig) {
      // 檢查是否剛剛登出
      const isLoggedOut = sessionStorage.getItem("dev_admin_logged_out");

      if (isLoggedOut === "true") {
        setAdminUser(null);
        setLoading(false);
        return;
      }

      const mockAdminUser = {
        uid: "test-admin-123",
        email: "admin@test.com",
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: "",
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => "test-token",
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        displayName: null,
        phoneNumber: null,
        photoURL: null,
        providerId: "firebase",
      } as User;

      setAdminUser(mockAdminUser);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("管理員登入錯誤:", error);
      throw error;
    }
  };

  const logout = async () => {
    // 🔧 開發模式：手動清除測試管理員
    const isDevelopment = import.meta.env.DEV;
    const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    if (isDevelopment && !hasFirebaseConfig) {
      sessionStorage.setItem("dev_admin_logged_out", "true");
      setAdminUser(null);
      window.location.href = "/admin/login";
      return;
    }

    await signOut(auth);
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
