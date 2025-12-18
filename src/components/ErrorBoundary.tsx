import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logError } from "../lib/firebase";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 記錄錯誤到監控服務
    this.setState({
      error,
      errorInfo,
    });

    // P1-4: 使用 Firebase Analytics 記錄錯誤
    logError(error, {
      componentStack: errorInfo.componentStack?.substring(0, 200) || "",
      errorBoundary: true,
    });

    // 向後兼容：保留 gtag 支援
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "exception", {
        description: error.toString(),
        fatal: false,
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              哎呀！出錯了
            </h1>

            <p className="text-gray-600 mb-6">
              很抱歉，應用程式遇到了一個錯誤。請嘗試重新載入頁面或返回首頁。
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left overflow-auto max-h-48">
                <p className="text-sm font-mono text-red-600">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                重新載入頁面
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                返回首頁
              </button>
            </div>

            {!import.meta.env.DEV && (
              <p className="mt-6 text-sm text-gray-500">
                如果問題持續發生，請聯繫客服支援
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
