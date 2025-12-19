import { Timestamp } from "firebase/firestore";

export type UserStatus = "active" | "blocked";

export interface User {
  uid: string; // LINE User ID
  displayName: string;
  pictureUrl: string;
  email?: string;
  phone?: string;
  gender?: string; // 性別：'男' | '女'
  createdAt: Timestamp;
  role: "customer" | "admin";

  // 商家會員相關欄位
  shopId?: string; // 所屬商家 ID（對於商家會員）
  followedAt?: string; // 加入 LINE 好友時間（ISO string）
  unfollowedAt?: string; // 封鎖或取消好友時間（ISO string）
  lastInteractionAt?: string; // 最後互動時間（ISO string）
  status?: UserStatus; // 用戶狀態（追蹤用戶是否封鎖）
}
