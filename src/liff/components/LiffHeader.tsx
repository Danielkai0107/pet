import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";

interface Props {
  /** 主標題（24px 黑色加粗） */
  title: string;
  /** 副標（14px 灰字） */
  description?: string;
  /**
   * 顯示左上的返回鍵；點擊會 navigate(-1)。
   * 若提供字串，當作返回目的地（用 navigate(to)）。
   */
  back?: boolean | string;
  /** 右側自訂內容（例如重新整理按鈕） */
  action?: React.ReactNode;
  className?: string;
}

/**
 * LIFF 共用頂部列：
 *   - 安全區留白：頂部 padding 包含 env(safe-area-inset-top)
 *     避免被 LINE webview 狀態列遮住
 *   - 純白底、底部細灰線
 *   - 可選返回鍵（icon-only 圓形 button）+ 標題 + 副標 + 右側 action
 *   - 標題、副標跟 web 公開頁/店家後台 PageHeader 用同樣語彙
 *
 * Mobile-first：永遠單欄、字級偏大、觸控目標 ≥40px。
 */
export function LiffHeader({
  title,
  description,
  back,
  action,
  className,
}: Props) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof back === "string") {
      navigate(back);
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-neutral-200 bg-white",
        "pt-[max(env(safe-area-inset-top),0px)]",
        className,
      )}
    >
      <div className="flex items-start gap-3 px-4 pb-4 pt-4">
        {back && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="返回"
            className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 self-center">{action}</div>}
      </div>
    </header>
  );
}
