import { LogIn, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LINE_ADD_FRIEND_URL, PLATFORM_NAME } from "@/lib/constants";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";

interface LiffGateProps {
  children: ReactNode;
  /** When true, page can render even if user is not logged in (e.g. /liff/discover). */
  allowAnonymous?: boolean;
}

export function LiffGate({ children, allowAnonymous }: LiffGateProps) {
  const { ready, hasLiffId, loggedIn, login, error } = useLiffAuth();

  if (!ready) return <LoadingScreen label="連接 LINE…" />;

  if (!hasLiffId) {
    return (
      <Center>
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-3 text-base font-bold text-slate-900">
          尚未設定 LIFF
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          請於 .env 設定 <code className="rounded bg-slate-100 px-1.5 py-0.5">VITE_LIFF_ID</code>
          後重新載入。
        </p>
      </Center>
    );
  }

  if (error) {
    return (
      <Center>
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-3 text-base font-bold text-slate-900">無法連接 LINE</h1>
        <p className="mt-1 text-sm text-slate-600">{error}</p>
        {LINE_ADD_FRIEND_URL && (
          <a
            href={LINE_ADD_FRIEND_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-4"
          >
            從 LINE 開啟
          </a>
        )}
      </Center>
    );
  }

  if (!loggedIn && !allowAnonymous) {
    return (
      <Center>
        <h1 className="text-base font-bold text-slate-900">
          請先以 LINE 帳號登入
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          登入後即可在 {PLATFORM_NAME} 內查看您的訂單與歷史。
        </p>
        <button onClick={() => void login()} className="btn-primary mt-4">
          <LogIn className="h-4 w-4" />
          以 LINE 登入
        </button>
      </Center>
    );
  }

  return <>{children}</>;
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="card max-w-sm p-6 text-center">{children}</div>
    </div>
  );
}
