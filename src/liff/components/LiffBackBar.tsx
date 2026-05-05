import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  /**
   * 預設 navigate(-1)；若提供字串則 navigate(to)。
   */
  back?: string;
  /** 中央可選文字（小字、不喧賓奪主，通常給商家名 / 訂單編號） */
  caption?: string;
}

/**
 * LIFF 共享頁（ShopDetailPage / BookingViewPage / BookingFlowPage 等）
 * 在 LIFF 路徑底下時的最上方返回列：
 *   - 安全區留白 (env safe-area-inset-top)
 *   - 純白底 + 底部細灰線
 *   - 左：返回鍵；中：可選 caption；右：留空
 *   - 高度約 56px，符合 mobile/POS 觸控目標
 */
export function LiffBackBar({ back, caption }: Props) {
  const navigate = useNavigate();
  const handle = () => {
    if (back) navigate(back);
    else navigate(-1);
  };

  return (
    <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white pt-[max(env(safe-area-inset-top),0px)]">
      <div className="flex h-12 items-center px-2">
        <button
          type="button"
          onClick={handle}
          aria-label="返回"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {caption && (
          <span className="mx-auto max-w-[70%] truncate pr-9 text-sm font-medium text-neutral-700">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
