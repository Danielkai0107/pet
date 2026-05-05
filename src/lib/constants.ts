import type { PetType, PetSize } from "./types";

export const PLATFORM_NAME =
  import.meta.env.VITE_PLATFORM_NAME ?? "PetStay";

export const LIFF_ID = import.meta.env.VITE_LIFF_ID as string | undefined;

export const LINE_ADD_FRIEND_URL =
  (import.meta.env.VITE_LINE_ADD_FRIEND_URL as string | undefined) ?? "";

export const PUBLIC_SITE_URL =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ??
  "http://localhost:5173";

export const PET_TYPE_LABEL: Record<PetType, string> = {
  dog: "狗",
  cat: "貓",
  rabbit: "兔",
  other: "其他",
};

export const PET_SIZE_LABEL: Record<PetType | "default", Record<PetSize, string>> = {
  default: {
    small: "小型",
    medium: "中型",
    large: "大型",
    xlarge: "超大型",
  },
  dog: {
    small: "小型 (≤10kg)",
    medium: "中型 (10-25kg)",
    large: "大型 (25-40kg)",
    xlarge: "超大型 (>40kg)",
  },
  cat: {
    small: "幼貓 / 小型",
    medium: "成貓",
    large: "大型品種",
    xlarge: "超大型",
  },
  rabbit: {
    small: "幼兔",
    medium: "成兔",
    large: "大型品種",
    xlarge: "超大型",
  },
  other: {
    small: "小型",
    medium: "中型",
    large: "大型",
    xlarge: "超大型",
  },
};

export const TAIWAN_CITIES: string[] = [
  "台北市",
  "新北市",
  "桃園市",
  "台中市",
  "台南市",
  "高雄市",
  "基隆市",
  "新竹市",
  "新竹縣",
  "苗栗縣",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義市",
  "嘉義縣",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "台東縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
];

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
