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

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReload = () => window.location.reload();
  handleGoHome = () => (window.location.href = "/");

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
