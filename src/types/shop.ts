export interface Service {
  id?: string; // Optional ID for services
  name: string;
  duration: number; // in minutes
  price: number;
}

export interface BusinessHours {
  start: string; // "HH:mm" format, e.g., "10:00"
  end: string; // "HH:mm" format, e.g., "19:00"
  daysOpen: number[]; // 0=Sunday, 1=Monday, ...
}

// 訂閱方案類型
export type SubscriptionPlan = "monthly" | "yearly" | "trial" | "lifetime_free";

// 訂閱狀態
export type SubscriptionStatus = "active" | "inactive" | "expired";

// 訂閱資訊
export interface Subscription {
  plan: SubscriptionPlan; // 訂閱方案：月訂閱、年訂閱、試用期
  status: SubscriptionStatus; // 訂閱狀態：啟用、停用、已過期
  startDate: string; // 開始日期 (ISO string)
  expiryDate: string; // 到期日期 (ISO string)
  autoRenew: boolean; // 是否自動續訂
  createdAt: string; // 建立時間
  updatedAt: string; // 最後更新時間
}

export interface Shop {
  id: string; // Firestore Document ID
  name: string;
  logoUrl?: string; // 店鋪頭像 URL
  services: Service[];
  businessHours: BusinessHours;
  petSpecies?: string[]; // 可選的寵物種類，如：['狗', '貓', '兔子']
  petSizes?: string[]; // 可選的寵物體型，如：['小型', '中型', '大型']

  // Multi-Tenant: 每個商家獨立的 LINE 設定
  liffId: string; // 該商家專屬的 LIFF ID（必填）
  lineChannelId: string; // LINE Messaging API Channel ID（必填）
  lineChannelAccessToken: string; // LINE Messaging API Channel Access Token（長期，必填）

  // 訂閱制
  subscription?: Subscription; // 訂閱資訊（選填，向後兼容）
}
