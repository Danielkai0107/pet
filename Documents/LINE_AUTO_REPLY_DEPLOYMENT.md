# LINE 關鍵字自動回覆 - 部署指南

## 📋 功能概述

本次更新新增了 LINE 關鍵字自動回覆功能，讓商家可以設定當客戶傳送包含特定關鍵字的訊息時，系統會自動回覆預設內容。

**主要特點**：

- ✅ 部分匹配（用戶訊息包含關鍵字即觸發）
- ✅ 純文字回覆
- ✅ 使用 Reply Token（免費）
- ✅ 後台管理介面
- ✅ 啟用/停用規則
- ✅ 完整的權限控制

---

## 🆕 新增檔案清單

### 前端

1. **`src/types/auto-reply.ts`**

   - 自動回覆規則的型別定義
   - LINE Webhook 事件型別

2. **`src/hooks/useAutoReplyRules.ts`**

   - Custom Hook，處理規則的 CRUD 操作
   - 即時監聽規則變化
   - 表單驗證邏輯

3. **`src/features/admin/AutoReplyManagement.tsx`**
   - 自動回覆管理頁面
   - 規則列表、新增/編輯表單
   - 刪除確認、啟用切換

### 後端

4. **`functions/src/index.ts`** (修改)
   - 新增 `lineWebhook` Cloud Function
   - 新增 `validateLineSignature` 函數
   - 新增 `findShopIdByUserId` 函數

### 其他

5. **`firestore.rules`** (修改)

   - 新增 `autoReplyRules` 子集合的安全規則
   - 允許 Cloud Function 讀取規則

6. **`src/features/admin/AdminDashboard.tsx`** (修改)
   - 新增「自動回覆」Tab
   - 側邊欄新增機器人圖示按鈕

---

## 🚀 部署步驟

### 1. 部署 Firestore 規則

```bash
cd /Users/danielkai/Desktop/pet-medical-crm
firebase deploy --only firestore:rules
```

**預期輸出**：

```
✔  Deploy complete!
```

### 2. 部署 Cloud Functions

```bash
cd /Users/danielkai/Desktop/pet-medical-crm/functions
npm run build
cd ..
firebase deploy --only functions:lineWebhook
```

**預期輸出**：

```
✔  functions[asia-east1-lineWebhook]: Successful create operation.
Function URL (lineWebhook): https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/lineWebhook
```

**⚠️ 重要**：記下 Function URL，下一步會用到。

### 3. 部署前端

```bash
npm run build
firebase deploy --only hosting
```

**預期輸出**：

```
✔  Deploy complete!
Hosting URL: https://pet-crm-bb6e9.web.app
```

---

## 🔧 LINE Developers Console 設定

### 步驟 1：設定 Webhook URL

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇您的 **Messaging API Channel**
3. 點擊「**Messaging API**」標籤
4. 找到「**Webhook settings**」區塊
5. 設定 Webhook URL：
   ```
   https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/lineWebhook
   ```
6. 點擊「**Update**」
7. 點擊「**Verify**」測試連線
   - ✅ 顯示 "Success" 表示設定正確

### 步驟 2：啟用 Webhook

在同一個頁面：

1. 找到「**Use webhook**」開關
2. **開啟**這個開關 ✅

### 步驟 3：關閉 LINE OA 自動回覆

這一步很重要，避免 LINE OA 和 CRM 同時回覆造成混亂：

1. 在「**Messaging API**」標籤頁
2. 找到「**Auto-reply messages**」
3. 點擊「**Edit**」
4. **關閉**所有自動回覆功能 ❌
5. 點擊「**Save**」

### 步驟 4：確認權限

確保以下權限已啟用：

- ✅ **Messaging API** 已啟用
- ✅ **Webhook** 已設定並開啟
- ✅ Bot 可以接收訊息

---

## ✅ 功能測試

### 測試 1：新增關鍵字規則

1. 登入 Admin 後台：`https://pet-crm-bb6e9.web.app/admin/dashboard`
2. 點擊側邊欄的「🤖」機器人圖示
3. 點擊「**新增關鍵字**」
4. 輸入：
   - 關鍵字：`營業時間`
   - 回覆訊息：
     ```
     我們的營業時間是：
     週一至週五：09:00-18:00
     週六：09:00-17:00
     週日公休
     ```
5. 點擊「**儲存**」
6. 確認規則出現在列表中，且狀態為「✅ 已啟用」

### 測試 2：測試自動回覆

1. 用手機打開 LINE App
2. 找到您的 LINE 官方帳號
3. 傳送訊息：`請問營業時間`
4. **預期結果**：
   - 幾秒內收到自動回覆
   - 內容為您剛才設定的營業時間訊息

### 測試 3：測試部分匹配

傳送以下訊息，都應該觸發自動回覆：

- ✅ `營業時間`（完全符合）
- ✅ `請問營業時間`（前方有文字）
- ✅ `營業時間是幾點`（後方有文字）
- ✅ `請問你們的營業時間是幾點`（中間有關鍵字）

### 測試 4：測試停用規則

1. 在後台點擊規則的「✅ 已啟用」按鈕
2. 狀態變更為「❌ 已停用」
3. 再次傳送 `營業時間` 給 LINE Bot
4. **預期結果**：不會收到自動回覆

### 測試 5：測試編輯規則

1. 點擊規則的「✏️ 編輯」按鈕
2. 修改回覆訊息
3. 點擊「**儲存**」
4. 傳送關鍵字測試
5. **預期結果**：收到更新後的訊息

### 測試 6：測試刪除規則

1. 點擊規則的「🗑️ 刪除」按鈕
2. 確認刪除
3. 規則從列表中消失
4. 傳送關鍵字測試
5. **預期結果**：不會收到自動回覆

---

## 🔍 常見問題排解

### 問題 1：Webhook 驗證失敗

**症狀**：在 LINE Developers Console 點擊「Verify」時顯示錯誤

**解決方法**：

1. 確認 Cloud Function 已成功部署
2. 檢查 Function URL 是否正確
3. 查看 Cloud Functions 日誌：
   ```bash
   firebase functions:log --only lineWebhook
   ```

### 問題 2：傳送訊息沒有自動回覆

**可能原因與解決方法**：

**原因 1：規則未啟用**

- 檢查後台規則狀態是否為「✅ 已啟用」

**原因 2：關鍵字不匹配**

- 檢查您傳送的訊息是否包含關鍵字
- 注意：匹配不區分大小寫

**原因 3：Webhook 未設定**

- 確認 LINE Developers Console 的 Webhook 已開啟

**原因 4：店鋪未設定 Channel Access Token**

- 登入 Superadmin：`/superadmin`
- 點擊店鋪的「LINE API」按鈕
- 確認已填入 Channel Access Token

**原因 5：用戶不屬於任何店鋪**

- 系統會根據用戶的預約記錄判斷所屬店鋪
- 如果用戶從未預約過，系統無法識別店鋪
- **解決方法**：讓用戶先透過 LIFF 預約一次

### 問題 3：收到雙重回覆（LINE OA + CRM 都回覆）

**原因**：LINE OA 的自動回覆未關閉

**解決方法**：

1. 前往 LINE Developers Console
2. 找到「Auto-reply messages」
3. **關閉**所有自動回覆功能

### 問題 4：後台看不到「自動回覆」Tab

**原因**：可能是瀏覽器快取

**解決方法**：

1. 清除瀏覽器快取
2. 強制重新整理（Cmd/Ctrl + Shift + R）
3. 或使用無痕模式測試

---

## 📊 查看日誌

### Firebase Console

```bash
# 查看 Webhook 日誌
firebase functions:log --only lineWebhook

# 即時監聽日誌
firebase functions:log --only lineWebhook --tail
```

### 日誌範例（成功）

```
2025-12-18T10:30:45.123Z  收到 LINE Webhook 請求
2025-12-18T10:30:45.234Z  處理文字訊息 { userId: "U1234...", message: "營業時間" }
2025-12-18T10:30:45.345Z  找到用戶所屬店鋪 { shopId: "shop-001" }
2025-12-18T10:30:45.456Z  匹配到關鍵字 { keyword: "營業時間" }
2025-12-18T10:30:45.567Z  準備回覆訊息
2025-12-18T10:30:45.678Z  回覆訊息成功
```

### 日誌範例（找不到店鋪）

```
2025-12-18T10:30:45.123Z  收到 LINE Webhook 請求
2025-12-18T10:30:45.234Z  處理文字訊息 { userId: "U5678...", message: "營業時間" }
2025-12-18T10:30:45.345Z  找不到用戶所屬的店鋪
```

---

## 💰 成本估算

### LINE Messaging API 費用

- **Reply Token 回覆**：**完全免費** ✅
- **Push 訊息**：需要付費

本功能使用 Reply Token 機制，**不會產生任何 LINE API 費用**。

### Firebase 費用

- **Cloud Functions 調用**：每月前 200 萬次免費
- **Firestore 讀取**：每月前 5 萬次免費
- **Firestore 寫入**：每月前 2 萬次免費

**預估**：每月約 1000 次自動回覆

- Cloud Functions：1000 次（遠低於免費額度）
- Firestore 讀取：每次約 2-3 次（店鋪資料 + 規則列表）
- 總讀取：約 3000 次（遠低於免費額度）

**預計每月成本**：**$0 USD** （在免費額度內）

---

## 🔄 回滾方案

如果部署後發現問題，可以快速回滾：

### 回滾 Cloud Functions

```bash
# 查看部署歷史
firebase functions:list

# 刪除新部署的 Function
firebase functions:delete lineWebhook
```

### 回滾 Firestore 規則

```bash
# 切換回 main 分支
git checkout main

# 重新部署舊的規則
firebase deploy --only firestore:rules
```

### 回滾前端

```bash
# 切換回 main 分支
git checkout main

# 重新建置並部署
npm run build
firebase deploy --only hosting
```

---

## 📈 未來擴展建議

目前實作的是基礎版本，未來可以考慮新增：

1. **多個關鍵字觸發同一則回覆**

   - 例如：「價格」、「費用」、「收費」都觸發同一則回覆

2. **支援圖片回覆**

   - 回覆時可以附上圖片（例如價目表、地圖）

3. **Flex Message 回覆**

   - 使用 LINE 的 Flex Message 製作精美卡片

4. **關鍵字優先順序**

   - 當多個關鍵字匹配時，可以設定優先順序

5. **時間排程**

   - 營業時間內外回覆不同內容
   - 例如：非營業時間自動回覆「目前非營業時間，明天 9 點開始營業」

6. **統計功能**

   - 記錄每個關鍵字被觸發的次數
   - 分析客戶最常問的問題

7. **匯入/匯出規則**

   - 批次匯入關鍵字規則
   - 匯出備份

8. **關鍵字分類**
   - 將關鍵字分類管理（例如：營業資訊、服務項目、價格）

---

## ✅ 部署檢查清單

在完成部署後，請確認：

- [ ] Firestore 規則已部署
- [ ] Cloud Function `lineWebhook` 已部署
- [ ] 前端已部署並可以訪問
- [ ] LINE Webhook URL 已設定
- [ ] LINE Webhook 已啟用
- [ ] LINE OA 自動回覆已關閉
- [ ] 已在後台新增至少一個測試規則
- [ ] 已用手機測試自動回覆功能
- [ ] 已查看 Cloud Functions 日誌確認運作正常

---

## 📞 技術支援

如有任何問題，請查看：

1. **Cloud Functions 日誌**：

   ```bash
   firebase functions:log --only lineWebhook
   ```

2. **Firestore Console**：

   - 檢查 `shops/{shopId}/autoReplyRules` collection
   - 確認規則格式正確

3. **LINE Developers Console**：

   - 檢查 Webhook 設定
   - 查看 API 錯誤訊息

4. **瀏覽器 Console**：
   - 檢查前端是否有錯誤訊息

---

**部署完成！🎉**

現在您的客戶可以透過 LINE 傳送關鍵字，獲得即時自動回覆了！
