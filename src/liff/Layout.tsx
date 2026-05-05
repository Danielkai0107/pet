import { Outlet } from "react-router-dom";
import { LiffAuthProvider } from "@/liff/auth/LiffAuthProvider";

/**
 * 沒有任何全域導覽列。LIFF 的「導航軸」是 LINE 圖文選單：
 * 每個圖文選單按鈕對應一個 LIFF deeplink（/liff、/liff/history、
 * /liff/discover…），用戶離開頁面回 LINE 再點選單切換。
 * 這樣可以避免在 LIFF webview 內再塞 tab bar 跟 LINE 自己的 UI 打架。
 */
export function LiffLayout() {
  return (
    <LiffAuthProvider>
      <div className="min-h-screen bg-slate-50">
        <Outlet />
      </div>
    </LiffAuthProvider>
  );
}
