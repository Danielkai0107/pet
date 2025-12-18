# LINE Follow 事件自動註冊會員 - 設定與測試指南

## 📋 功能說明

當用戶在 LINE 中點擊「加入好友」時，系統會自動：

1. 接收 LINE 平台發送的 follow 事件
2. 透過 LINE Profile API 取得用戶的個人資料（暱稱、大頭貼）
3. 將用戶資料自動寫入 Firestore 的 `shops/{shopId}/users/{userId}` collection
4. 在管理後台的客戶列表中顯示已加好友的會員標記（綠色勾勾圖標）

當用戶封鎖或取消好友時，系統會自動將該用戶的狀態更新為 `blocked`。

---

## 🚀 部署狀態

✅ **已完成部署**

- Cloud Function URL: `https://linewebhook-44vuidr3wq-de.a.run.app`
- 區域：asia-east1
- 部署時間：2024-12-18

---

## ⚙️ 設定步驟

### 步驟 1：在 LINE Developer Console 設定 Webhook URL

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 LINE Official Account Channel
3. 進入 **Messaging API** 標籤
4. 找到 **Webhook settings** 區塊
5. 設定 Webhook URL：
   ```
   https://linewebhook-44vuidr3wq-de.a.run.app
   ```
6. 啟用 **Use webhook**
7. 點擊 **Verify** 測試連線（應該會顯示成功）

### 步驟 2：設定 Webhook 事件訂閱

在同一頁面的 **Webhook settings**：

1. 確保已啟用 **Use webhook**
2. 建議關閉 **Auto-reply messages**（避免與自動回覆衝突）
3. 建議關閉 **Greeting messages**（可選）

### 步驟 3：在 Firestore 中設定商家的 Bot User ID

有兩種方式取得 Bot User ID：

#### 方式 A：從第一次 Webhook 日誌中取得（推薦）

1. 使用任意 LINE 帳號加入您的 OA
2. 前往 [Firebase Console](https://console.firebase.google.com/project/pet-crm-bb6e9/functions/logs)
3. 查看 `lineWebhook` 的日誌
4. 找到 `destination` 欄位的值（格式：`Uxxxxxxxxxxxx`）
5. 複製這個 Bot User ID

#### 方式 B：從 LINE Developer Console 取得

1. 前往 LINE Developers Console
2. 選擇您的 Channel
3. 在 **Basic settings** 標籤找到 **Your user ID**
4. 複製這個值

#### 將 Bot User ID 寫入 Firestore

1. 前往 [Firestore Console](https://console.firebase.google.com/project/pet-crm-bb6e9/firestore)
2. 找到您的商家文檔：`shops/{您的商家ID}`
3. 點擊編輯
4. 新增欄位：
   - 欄位名稱：`lineBotUserId`
   - 類型：string
   - 值：貼上剛才複製的 Bot User ID
5. 儲存

### 步驟 4：設定 Firestore Security Rules（已完成）

以下規則已自動包含在部署中，無需手動設定：

```javascript
// shops/{shopId}/users 子集合
match /shops/{shopId}/users/{userId} {
  // 客戶只能讀取自己的資料
  allow read: if request.auth != null && request.auth.uid == userId;

  // 管理員可以讀取所有客戶資料
  allow read: if isShopAdmin(shopId);

  // Cloud Function 可以寫入
  allow write: if request.auth == null; // 來自 Cloud Function
}
```

---

## 🧪 測試步驟

### 測試 1：Follow 事件（加入好友）

1. **準備測試帳號**

   - 使用一個未加入過您 OA 的 LINE 帳號
   - 或先將測試帳號從好友列表中移除

2. **執行測試**

   - 在 LINE 中搜尋您的 OA
   - 點擊「加入好友」

3. **檢查 Cloud Function 日誌**

   ```bash
   # 查看即時日誌
   firebase functions:log --only lineWebhook
   ```

   應該會看到類似以下的日誌：

   ```
   收到 LINE Webhook 請求
   收到 follow 事件 { userId: 'Uxxxx***', destination: 'Uxxxx***' }
   找到對應商家 { shopId: 'your-shop-id' }
   取得用戶資料成功 { userId: 'Uxxxx***', displayName: '張小明' }
   用戶資料已寫入 Firestore { shopId: 'your-shop-id', userId: 'Uxxxx***' }
   ```

4. **檢查 Firestore**

   - 前往 Firestore Console
   - 導航至 `shops/{您的商家ID}/users`
   - 應該會看到新增的用戶文檔，包含：
     ```javascript
     {
       uid: "Uxxxxxxxxxxxx",
       displayName: "張小明",
       pictureUrl: "https://profile.line-scdn.net/...",
       shopId: "your-shop-id",
       followedAt: "2024-12-18T12:34:56.789Z",
       status: "active",
       role: "customer",
       createdAt: Timestamp
     }
     ```

5. **檢查前端顯示**
   - 登入管理後台
   - 切換到「客戶管理」標籤
   - 應該會看到新會員出現在列表中
   - 會員名稱旁邊有綠色的 ✓ 圖標（表示已加好友）
   - 顯示「加入好友：2024-12-18」

### 測試 2：Unfollow 事件（封鎖或取消好友）

1. **執行測試**

   - 在 LINE 中進入 OA 的聊天室
   - 點擊右上角的選單
   - 選擇「封鎖」或「刪除好友」

2. **檢查日誌**

   ```
   收到 unfollow 事件 { userId: 'Uxxxx***', destination: 'Uxxxx***' }
   找到對應的商家 { shopId: 'your-shop-id' }
   用戶狀態已更新為 blocked { shopId: 'your-shop-id', userId: 'Uxxxx***' }
   ```

3. **檢查 Firestore**

   - 該用戶文檔應該更新為：
     ```javascript
     {
       ...原有欄位,
       status: "blocked",
       unfollowedAt: "2024-12-18T12:40:00.000Z"
     }
     ```

4. **檢查前端顯示**
   - 被封鎖的用戶不會出現在客戶列表中（已過濾）

### 測試 3：重複 Follow（再次加入好友）

1. **執行測試**
   - 解除封鎖後再次加入好友
2. **預期結果**
   - 系統使用 `merge: true`，不會覆蓋現有資料
   - 會更新 `status` 為 `active`
   - 保留原有的預約記錄和其他資料

---

## 🔍 故障排除

### 問題 1：Webhook 收不到事件

**可能原因：**

- Webhook URL 設定錯誤
- Webhook 未啟用
- Channel Access Token 過期

**解決方法：**

1. 檢查 LINE Developer Console 的 Webhook URL
2. 確認 **Use webhook** 已啟用
3. 點擊 **Verify** 測試連線
4. 查看 Cloud Function 日誌確認有無錯誤

### 問題 2：找不到對應商家

**錯誤訊息：**

```
找不到對應的商家 { botUserId: 'Uxxxx***' }
```

**可能原因：**

- 商家的 `lineBotUserId` 欄位未設定
- `lineBotUserId` 值不正確

**解決方法：**

1. 從日誌中複製 `destination` 的值
2. 在 Firestore 中設定 `shops/{shopId}/lineBotUserId` 為該值
3. 再次測試

### 問題 3：取得用戶資料失敗

**錯誤訊息：**

```
取得用戶資料失敗 { status: 401, error: '...' }
```

**可能原因：**

- Channel Access Token 過期或不正確

**解決方法：**

1. 前往 LINE Developer Console
2. 重新發行 Channel Access Token
3. 在 Firestore 更新 `shops/{shopId}/lineChannelAccessToken`
4. 或在管理後台的商家設定中更新

### 問題 4：用戶資料寫入 Firestore 失敗

**錯誤訊息：**

```
Error: Missing or insufficient permissions
```

**可能原因：**

- Firestore Security Rules 設定錯誤

**解決方法：**

1. 檢查 Firestore Rules
2. 確認 Cloud Function 有寫入權限
3. 重新部署 Rules：
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 📊 資料結構說明

### Firestore Collection 結構

```
shops/
  {shopId}/
    - name: string
    - lineBotUserId: string ← 新增欄位
    - lineChannelAccessToken: string
    - ... 其他欄位

    users/ ← 新增子集合
      {userId}/
        - uid: string (LINE User ID)
        - displayName: string (LINE 暱稱)
        - pictureUrl: string (LINE 大頭貼)
        - shopId: string (所屬商家)
        - followedAt: string (加入好友時間)
        - unfollowedAt?: string (取消好友時間)
        - status: "active" | "blocked"
        - role: "customer"
        - phone?: string (可選)
        - createdAt: Timestamp
```

---

## 🎯 功能特點

### 1. 自動化會員註冊

- ✅ 無需用戶手動填寫資料
- ✅ 自動取得 LINE 個人資料
- ✅ 即時寫入資料庫

### 2. 智慧資料合併

- ✅ 合併預約客戶和 LINE 好友
- ✅ 優先顯示有預約記錄的客戶
- ✅ 使用 `merge: true` 避免覆蓋現有資料

### 3. 狀態追蹤

- ✅ 追蹤用戶是否為好友
- ✅ 記錄加入/取消好友時間
- ✅ 過濾已封鎖的用戶

### 4. 前端整合

- ✅ 客戶列表顯示 LINE 好友標記
- ✅ 顯示 LINE 大頭貼
- ✅ 顯示加入好友日期

---

## 📈 後續優化建議

### 1. 歡迎訊息（可選）

在 follow 事件處理完成後，可以發送歡迎訊息：

```typescript
// 在 follow 事件處理的最後
await fetch("https://api.line.me/v2/bot/message/reply", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${channelAccessToken}`,
  },
  body: JSON.stringify({
    replyToken: event.replyToken,
    messages: [
      {
        type: "text",
        text: `歡迎加入 ${shopData.name}！我們期待為您和您的寶貝提供服務 🐾`,
      },
    ],
  }),
});
```

### 2. 自動記錄 Bot User ID

第一次收到 webhook 事件時，自動將 `destination` 寫入商家文檔：

```typescript
if (!shopData.lineBotUserId) {
  await shopDoc.ref.update({
    lineBotUserId: destination,
  });
}
```

### 3. 會員標籤系統

可以為會員添加標籤（VIP、常客等）：

```typescript
interface User {
  ...
  tags?: string[]; // ['VIP', '常客', '新客戶']
}
```

### 4. 統計分析

在管理後台顯示會員統計：

- 總會員數
- 本月新增會員數
- 活躍會員數
- 流失會員數（封鎖）

---

## 🔗 相關文件

- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)
- [Webhook 事件參考](https://developers.line.biz/en/reference/messaging-api/#webhook-event-objects)
- [Get Profile API](https://developers.line.biz/en/reference/messaging-api/#get-profile)

---

## ✅ 測試檢查清單

完成以下測試後，可以標記此功能為「已完成」：

- [ ] Webhook URL 已設定並驗證成功
- [ ] 商家的 `lineBotUserId` 已設定
- [ ] 測試帳號加入好友後，資料成功寫入 Firestore
- [ ] 取得的 `displayName` 和 `pictureUrl` 正確
- [ ] 前端客戶列表顯示新會員及 LINE 好友標記
- [ ] 測試帳號取消好友後，狀態更新為 `blocked`
- [ ] 重複加入好友不會覆蓋現有資料
- [ ] Cloud Function 日誌正常無錯誤
- [ ] 多個商家的 webhook 能正確路由到對應商家

---

**最後更新**：2024-12-18  
**版本**：v1.0.0  
**作者**：AI Assistant

