# LINE Messaging API 整合說明

## 📱 功能概述

從 admin/mobile 頁面傳送服務通知訊息給客戶的 LINE。

### 支援的訊息類型

1. **臨時回報**：服務過程中的進度回報
2. **完成分享**：服務完成的通知和照片

---

## 🔧 設定步驟

### 1. 在 LINE Developers Console 取得 Channel Access Token

⚠️ **重要更新**：需要使用 **Channel Access Token（長期）** 而不是 Channel Secret

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇您的 Provider 和 **Messaging API** Channel（例如：Channel ID `2008703252`）
3. 點擊「Messaging API」標籤頁
4. 找到「**Channel access token (long-lived)**」區塊
5. 點擊「**Issue**」按鈕發行長期 Token
6. 複製完整的 Token（很長的字串，例如：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`）

### 2. 在 Superadmin 介面設定

1. 登入 Superadmin（`/superadmin`）
2. 找到要設定的店鋪
3. 點擊「**LINE API**」按鈕
4. **Channel ID**：輸入 `2008703252`（選填，僅供參考）
5. **Channel Access Token**：貼上剛才複製的長期 Token（**必填**）
6. 點擊「儲存」

⚠️ **如果之前設定過 Channel Secret，請重新設定為 Channel Access Token**

### 3. LINE Channel 設定檢查清單

確保您的 LINE Channel 已正確設定：

- ✅ Messaging API 已啟用
- ✅ Channel access token 已發行（長期或短期）
- ✅ Webhook 已設定（如果使用雙向互動）
- ✅ Bot 已加入好友（客戶需要先加入您的官方帳號）

---

## 📤 使用方法

### 從 Admin/Mobile 發送訊息

1. **打開預約詳情**

   - 在 admin/mobile 頁面點擊任一預約卡片

2. **發送臨時回報**

   - 切換到「臨時回報」標籤
   - 上傳照片（選填）
   - 輸入訊息（選填）
   - 點擊「傳送給主人」
   - 客戶會收到包含圖片和訊息的 Flex Message

3. **發送完成分享**
   - 切換到「完成分享」標籤
   - 上傳完成照片（選填）
   - 輸入訊息（選填）
   - 點擊「傳送給主人」
   - 客戶會收到服務完成通知

---

## 🚫 限制與注意事項

### Walk-in 客戶

- 現場預約（Walk-in）的客戶**無法**接收 LINE 訊息
- 系統會自動檢測並禁用發送按鈕

### LINE ID 檢查

- 只有透過 LINE LIFF 預約的客戶才有 LINE User ID
- 系統會自動檢查是否有有效的 LINE ID

### 圖片要求

- 必須是 HTTPS URL
- Firebase Storage 的圖片符合要求
- 建議使用 16:9 比例的圖片以獲得最佳顯示效果

---

## 🎨 訊息樣式

### 臨時回報訊息

```
┌─────────────────────┐
│   [圖片]（如果有）   │
├─────────────────────┤
│ 🔔 服務臨時回報      │
│ ─────────────────   │
│ 寵物：小白          │
│ 狀態：🔄 服務進行中  │
│ ─────────────────   │
│ 訊息：              │
│ [您的訊息內容]      │
│ ─────────────────   │
│ 服務人員會持續...   │
└─────────────────────┘
```

### 完成分享訊息

```
┌─────────────────────┐
│   [完成照]（如果有） │
├─────────────────────┤
│ ✨ 服務完成通知      │
│ ─────────────────   │
│ 寵物：小白          │
│ 狀態：✅ 服務完成    │
│ ─────────────────   │
│ 訊息：              │
│ [您的訊息內容]      │
│ ─────────────────   │
│ 感謝您的光臨！🐾    │
└─────────────────────┘
```

---

## 🔍 錯誤處理

### 常見錯誤與解決方法

1. **"LINE API not configured for this shop"**

   - 原因：店鋪尚未設定 LINE Channel ID 和 Secret
   - 解決：在 Superadmin 介面設定 LINE API

2. **"Failed to get access token"**

   - 原因：Channel ID 或 Secret 不正確
   - 解決：檢查並重新設定正確的 Channel 資訊

3. **"Cannot send message to walk-in customers"**

   - 原因：嘗試發送給現場預約的客戶
   - 解決：Walk-in 客戶無法接收 LINE 訊息（這是正常的）

4. **LINE 發送失敗但 Firestore 已儲存**
   - 系統會顯示：「已送出（LINE 通知失敗）」
   - 資料已安全儲存到 Firestore
   - 可以在 Cloud Functions 日誌中查看詳細錯誤

---

## 📊 查看發送日誌

### Firebase Console

```bash
# 查看 Cloud Functions 日誌
firebase functions:log --only sendLineCompletionMessage,sendLineTempReportMessage

# 或在 Firebase Console 中查看
https://console.firebase.google.com/project/pet-crm-bb6e9/functions/logs
```

### 瀏覽器 Console

- 打開瀏覽器開發者工具（F12）
- 查看 Console 標籤中的發送日誌

---

## 🔐 安全性

- Channel Secret 儲存在 Firestore（shops collection）
- 每次發送都會動態取得 Access Token
- Access Token 不會儲存在前端或 Firestore
- Cloud Functions 會驗證 shopId 和 userId

---

## 🚀 Cloud Functions 端點

- **完成照訊息**: `https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/sendLineCompletionMessage`
- **臨時回報訊息**: `https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/sendLineTempReportMessage`

---

## 📝 下一步擴展

可考慮的功能增強：

1. **訊息模板**：預設的訊息範本供選擇
2. **發送歷史**：記錄所有發送的訊息
3. **重發功能**：如果發送失敗，可以重新發送
4. **預約提醒**：在預約前一天自動發送提醒
5. **評價請求**：服務完成後請求客戶評價

---

## ⚠️ 重要提醒

1. **客戶必須先加入您的 LINE 官方帳號**才能收到訊息
2. **Channel ID 和 Secret 請妥善保管**，不要洩漏
3. **LINE Messaging API 有費率限制**，請參考 LINE 官方文件
4. 第一次使用 2nd gen functions 可能需要等待幾分鐘讓權限生效
