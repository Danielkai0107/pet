# 手機版管理功能說明

## 功能概述

新增了一套完整的手機版管理系統，讓管理員可以在手機上便捷地操作今日預約和服務紀錄。

## 功能清單

### 1. 裝置選擇頁面 (`DeviceSelection.tsx`)

- **位置**：`/admin` (登入後)
- **功能**：
  - 登入成功後，管理員可選擇使用電腦版或手機版
  - 選擇電腦版 → 進入完整的 Admin Dashboard
  - 選擇手機版 → 進入手機版今日預約頁面
  - 裝置選擇會儲存在 `sessionStorage`

### 2. 手機版今日預約頁面 (`MobileDailyView.tsx`)

- **位置**：`/admin/mobile`
- **功能**：
  - 顯示今日預約時間軸（與電腦版今日預約相同邏輯）
  - 只顯示時間軸和圖卡，針對手機操作優化
  - 自動捲動到當前時間
  - 點擊圖卡開啟滿版 Popup
  - Header 提供切換回電腦版和登出按鈕

### 3. 滿版 Popup 組件 (`AppointmentDetailPopup.tsx`)

- **功能**：

  - **三個 Tabs**，可左右滑動切換：

    #### Tab 1: 臨時回報

    - 圖片上傳區域（使用手機相機）
    - 文字訊息輸入
    - 「傳送給主人」按鈕
    - 圖片直接上傳到 Firebase Storage
    - 資料儲存到 Firestore (`serviceReports` collection)

    #### Tab 2: 完成分享

    - 完成照片上傳區域
    - 文字訊息輸入
    - 「傳送給主人」按鈕
    - 圖片上傳和資料儲存同上

    #### Tab 3: 設定

    - **顧客注記**：文字輸入框（自動儲存）
    - **聯絡**：「打給主人」按鈕（直接撥打客戶電話）
    - **狀態更新**：「標註已完成」按鈕（更新預約狀態為 completed）

### 4. AdminDashboard 切換按鈕

- **位置**：Sidebar 底部使用者區域
- **功能**：
  - 新增「切換到手機版」按鈕（綠色手機圖示）
  - 點擊後切換到手機版頁面
  - 與登出按鈕並排顯示

## 技術實現

### 1. 類型定義

**文件**：`src/types/service-record.ts`

```typescript
interface ServiceReport {
  id: string;
  appointmentId: string;
  tempReportImage?: string; // 臨時回報圖片
  tempReportMessage?: string; // 臨時回報訊息
  completionImage?: string; // 完成分享圖片
  completionMessage?: string; // 完成分享訊息
  serviceNotes?: string; // 顧客注記
  isCompleted: boolean; // 是否已完成
  // ... 其他欄位
}
```

### 2. Firebase Storage

- **配置**：已在 `src/lib/firebase.ts` 配置完成
- **儲存路徑**：
  - 臨時回報：`service-reports/{shopId}/{appointmentId}/temp-report-{timestamp}.jpg`
  - 完成分享：`service-reports/{shopId}/{appointmentId}/completion-{timestamp}.jpg`
- **特點**：圖片可覆蓋（新上傳會產生新的時間戳）

### 3. Firestore 資料結構

**Collection**: `serviceReports`
**Document ID**: `{appointmentId}`

每個預約對應一筆 service report，包含：

- 臨時回報資料
- 完成分享資料
- 顧客注記
- 完成狀態

### 4. 路由配置

```typescript
// Admin Routes
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<DeviceSelection />} /> // 裝置選擇
  <Route path="login" element={<AdminLogin />} /> // 登入頁
  <Route path="dashboard" element={<AdminDashboard />} /> // 電腦版
  <Route path="mobile" element={<MobileDailyView />} /> // 手機版
</Route>
```

### 5. 樣式文件

- `src/styles/pages/_device-selection.scss` - 裝置選擇頁面樣式
- `src/styles/pages/_mobile-daily-view.scss` - 手機版今日預約樣式
- `src/styles/components/_appointment-detail-popup.scss` - Popup 組件樣式
- `src/styles/layouts/_admin-dashboard.scss` - 更新了 sidebar 切換按鈕樣式

## 使用流程

1. **管理員登入** (`/admin/login`)
   ↓
2. **選擇裝置** (`/admin`)
   ↓
3. **選擇手機版** → 進入手機版今日預約 (`/admin/mobile`)
   ↓
4. **點擊預約圖卡** → 開啟滿版 Popup
   ↓
5. **在 Popup 中操作**：
   - 上傳臨時回報或完成照片
   - 輸入訊息並傳送
   - 填寫顧客注記
   - 打電話給客戶
   - 標註服務完成

## 未來擴展

目前資料已儲存到 Firebase，預留了以下擴展功能的接口：

1. **LINE Message API 整合**

   - 臨時回報和完成分享可透過 LINE 訊息發送給客戶
   - 圖片和文字訊息都已準備好傳送格式

2. **通知系統**
   - 可在客戶端顯示店家的臨時回報和完成分享
   - 客戶可在自己的帳戶查看歷史記錄

## 注意事項

1. **圖片上傳**：使用 `<input type="file" capture="environment">` 確保在手機上直接調用相機
2. **手機優化**：所有樣式都採用 Mobile-First 設計，確保在手機上體驗流暢
3. **權限控制**：需要管理員登入才能存取手機版功能
4. **資料安全**：所有資料都透過 Firebase Authentication 和 Firestore Rules 保護

## 測試建議

1. 使用手機瀏覽器測試裝置選擇流程
2. 測試圖片上傳（相機調用）
3. 測試 Tabs 左右滑動
4. 測試打電話功能
5. 驗證資料是否正確儲存到 Firestore

---

開發完成時間：2025-12-15
開發者：Cursor AI Assistant
