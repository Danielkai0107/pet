/**
 * LINE 關鍵字自動回覆相關型別定義
 */

/**
 * 自動回覆規則
 */
export interface AutoReplyRule {
  /** 規則 ID */
  id: string;

  /** 關鍵字（例如：「營業時間」） */
  keyword: string;

  /** 回覆訊息內容 */
  replyMessage: string;

  /** 匹配方式（固定為部分符合） */
  matchType: "partial";

  /** 是否啟用 */
  isActive: boolean;

  /** 建立時間（ISO 8601 格式） */
  createdAt: string;

  /** 更新時間（ISO 8601 格式） */
  updatedAt: string;

  /** 建立者（admin ID，可選） */
  createdBy?: string;
}

/**
 * 歡迎訊息設定
 */
export interface WelcomeMessage {
  /** 歡迎訊息內容 */
  message: string;

  /** 是否啟用 */
  isActive: boolean;

  /** 更新時間（ISO 8601 格式） */
  updatedAt: string;

  /** 建立時間（ISO 8601 格式） */
  createdAt?: string;
}

/**
 * 新增自動回覆規則的輸入
 */
export interface CreateAutoReplyRuleInput {
  /** 關鍵字 */
  keyword: string;

  /** 回覆訊息 */
  replyMessage: string;

  /** 是否啟用（預設為 true） */
  isActive?: boolean;
}

/**
 * 更新自動回覆規則的輸入
 */
export interface UpdateAutoReplyRuleInput {
  /** 規則 ID */
  id: string;

  /** 關鍵字（可選） */
  keyword?: string;

  /** 回覆訊息（可選） */
  replyMessage?: string;

  /** 是否啟用（可選） */
  isActive?: boolean;
}

/**
 * LINE Webhook Event 相關型別
 */

/**
 * LINE Webhook 事件
 */
export interface LineWebhookEvent {
  type: string;
  replyToken: string;
  source: {
    type: string;
    userId: string;
  };
  timestamp: number;
  message?: {
    type: string;
    id: string;
    text?: string;
  };
}

/**
 * LINE Webhook 請求體
 */
export interface LineWebhookRequest {
  destination: string;
  events: LineWebhookEvent[];
}
