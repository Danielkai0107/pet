import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const CHUNK_RELOAD_FLAG = "__chunk_reload_attempted__";

/**
 * 部署新版本後，舊的 index.html 仍被 webview / browser 快取，但裡面引用的
 * lazy chunk 已經換 hash → React.lazy() 在動態 import 時會丟出 ChunkLoadError /
 * "Failed to fetch dynamically imported module"。LINE webview 的快取行為比一般
 * 瀏覽器積極，特別常踩到。這個函式判斷錯誤是否屬於這類「old chunk gone」情境。
 */
function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { name?: string; message?: string };
  if (e.name === "ChunkLoadError") return true;
  const msg = e.message ?? "";
  return (
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    // chunk error：先不要切到錯誤畫面，讓 componentDidCatch 觸發一次 reload
    if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      return { hasError: false, error: null, errorInfo: null };
    }
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isChunkLoadError(error)) {
      // 同一個 session 只自動 reload 一次，避免無限 reload loop。
      if (!sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
        sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
        console.warn(
          "[ErrorBoundary] Chunk load failed, reloading to fetch fresh index.html",
          error,
        );
        window.location.reload();
        return;
      }
      // 已經 reload 過一次還是失敗 → 顯示錯誤畫面讓使用者手動重整
    }
    this.setState({ error, errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    window.location.reload();
  };
  handleGoHome = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="card w-full max-w-md p-8 text-center">
          <AlertTriangle
            className="mx-auto mb-6 h-12 w-12 text-neutral-400"
            strokeWidth={1.5}
          />
          <h1 className="mb-2 text-xl font-bold text-neutral-900">
            哎呀，出錯了
          </h1>
          <p className="mb-6 text-sm text-neutral-600">
            應用程式遇到一個未預期的錯誤，請重新載入或返回首頁。
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre className="mb-6 max-h-48 overflow-auto rounded-lg bg-neutral-100 p-3 text-left text-xs text-neutral-700">
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}

          <div className="space-y-2">
            <button onClick={this.handleReload} className="btn-primary w-full">
              <RefreshCw className="h-4 w-4" />
              重新載入
            </button>
            <button onClick={this.handleGoHome} className="btn-secondary w-full">
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }
}
