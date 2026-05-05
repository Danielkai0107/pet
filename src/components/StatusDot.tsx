import { cn } from "@/lib/cn";
import {
  BOOKING_STATUS_DOT,
  BOOKING_STATUS_LABEL,
} from "@/lib/constants";
import type { BookingStatus } from "@/lib/types";

interface Props {
  status: BookingStatus;
  /** 是否要省略 label（只顯示 dot） */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Airbnb 風狀態指示：6px 色點 + 文字，沒有大色塊背景。
 * 狀態語意只透過色點傳達，主視覺仍為白底黑字。
 */
export function StatusDot({ status, iconOnly = false, className }: Props) {
  const dotColor = BOOKING_STATUS_DOT[status];
  const label = BOOKING_STATUS_LABEL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      {!iconOnly && <span>{label}</span>}
    </span>
  );
}
