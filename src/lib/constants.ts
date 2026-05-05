// PET_TYPE_LABEL / PET_SIZE_LABEL / TAIWAN_CITIES 已遷移到 SuperAdmin 可管理的
// 資料表（pet_types / pet_sizes / pet_type_size_labels / cities），
// 請改用 src/lib/managedOptions.tsx 提供的 useManagedOptions hook。

export const PLATFORM_NAME =
  import.meta.env.VITE_PLATFORM_NAME ?? "PetStay";

export const LIFF_ID = import.meta.env.VITE_LIFF_ID as string | undefined;

export const LINE_ADD_FRIEND_URL =
  (import.meta.env.VITE_LINE_ADD_FRIEND_URL as string | undefined) ?? "";

export const PUBLIC_SITE_URL =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ??
  "http://localhost:5173";

export const BOOKING_STATUS_LABEL = {
  pending: "待確認",
  confirmed: "已確認",
  declined: "已拒絕",
  cancelled: "已取消",
  checked_in: "入住中",
  checked_out: "已退房",
  no_show: "未出席",
} as const;

/**
 * 狀態色點：Airbnb 風以「6px 圓點 + 文字」呈現，不再用大色塊背景。
 * 每個狀態只配一個 dot 顏色 class（bg-*-500），文字一律 neutral-700。
 */
export const BOOKING_STATUS_DOT = {
  pending: "bg-amber-500",
  confirmed: "bg-brand-500",
  declined: "bg-rose-500",
  cancelled: "bg-neutral-400",
  checked_in: "bg-emerald-500",
  checked_out: "bg-neutral-400",
  no_show: "bg-rose-500",
} as const;
