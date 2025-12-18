// 服務紀錄相關的類型定義

export interface ServiceReport {
  id: string;
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  petName?: string;

  // 臨時回報
  tempReportImage?: string; // 圖片 URL
  tempReportMessage?: string; // 文字訊息
  tempReportTimestamp?: any; // Firestore Timestamp

  // 完成分享
  completionImage?: string; // 圖片 URL
  completionMessage?: string; // 文字訊息
  completionTimestamp?: any; // Firestore Timestamp

  // 設定
  serviceNotes?: string; // 顧客注記
  isCompleted: boolean; // 是否已標註完成
  completedAt?: any; // Firestore Timestamp

  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface ServiceReportInput {
  tempReportImage?: File | string;
  tempReportMessage?: string;
  completionImage?: File | string;
  completionMessage?: string;
  serviceNotes?: string;
  isCompleted?: boolean;
}
