# Multi-Tenant SaaS 架構升級指南

## 🎉 升級完成！

系統已成功升級為 Multi-Tenant SaaS 架構，現在每個商家都擁有：

- 獨立的 LIFF 應用
- 獨立的 LINE Channel
- 獨立的資料儲存空間（Firestore Subcollections）

---

## 📋 下一步操作

### 步驟 1：清空舊資料

由於架構改變，需要清空舊的頂層 collections：

1. 前往 [Firebase Console - Firestore](https://console.firebase.google.com/project/pet-crm-bb6e9/firestore)
2. 刪除以下 collections：
   - `appointments`
   - `serviceReports`
3. 保留這些 collections：
   - `shops`（已更新為 Multi-Tenant）
   - `admins`
   - `users`

---

### 步驟 2：為每個商家設定 LINE

#### 2.1 在 LINE Developers Console 創建資源

為**每個商家**執行以下步驟：

1. **創建 Messaging API Channel**

   - 前往 [LINE Developers Console](https://developers.line.biz/)
   - 選擇您的 Provider
   - 點擊「Create a new channel」
   - 選擇「Messaging API」
   - 填寫商家資訊並創建

2. **創建 LIFF 應用**

   - 在該 Channel 的「LIFF」標籤頁
   - 點擊「Add」創建新 LIFF
   - **Endpoint URL**: `https://您的網域.web.app`（或您的 hosting URL）
   - **Scope**: 勾選 `profile`, `openid`
   - **Bot link feature**: 選擇「On」
   - 創建後會獲得 **LIFF ID**（例如：`2008650556-8kWdz6Pv`）

3. **取得 Channel Access Token**

   - 在該 Channel 的「Messaging API」標籤頁
   - 找到「Channel access token (long-lived)」
   - 點擊「Issue」發行長期 Token
   - **複製完整的 Token**

4. **關閉自動回覆**
   - 在「Messaging API」標籤頁
   - 將「Auto-reply messages」改為 **Disabled**
   - 將「Greeting messages」改為 **Disabled**

#### 2.2 在 Superadmin 設定

1. 登入 Superadmin (`/superadmin`)
2. 找到要設定的商家
3. 點擊「LINE API」按鈕
4. 填入：
   - **LIFF ID**: `2008650556-xxxxxxx`（該商家的 LIFF ID）
   - **Channel ID**: `200870xxxx`（該商家的 Channel ID）
   - **Channel Access Token**: 貼上完整的 Token
5. 點擊「儲存」

---

### 步驟 3：測試 Multi-Tenant 功能

#### 測試商家 A

1. **掃描商家 A 的 QR Code**（在 Superadmin 生成）
2. 會開啟商家 A 專屬的 LIFF 應用
3. 建立預約
4. 系統會將資料儲存到 `shops/{商家A的ID}/appointments/`
5. 客戶的 User ID 會綁定到商家 A 的 Channel

#### 測試 Admin/Mobile 功能

1. 以商家 A 的管理員登入
2. 在 admin/mobile 發送完成照給客戶
3. 客戶應該能收到來自商家 A Channel 的 LINE 訊息

#### 測試資料隔離

1. 商家 A 的管理員只能看到商家 A 的預約
2. 商家 B 的管理員只能看到商家 B 的預約
3. 資料完全隔離

---

## 🔄 新的資料結構

### Firestore Collections

```
/shops/{shopId}
  - name, services, businessHours
  - liffId, lineChannelId, lineChannelAccessToken (新增)

  /appointments/{appointmentId}
    - 該商家的所有預約

  /serviceReports/{reportId}
    - 該商家的服務紀錄

  /daily_schedules/{date}
    - 該商家的每日時段

/admins/{adminId}
  - shopId (綁定到特定商家)

/users/{userId}
  - LINE 用戶資料
```

---

## 🎯 Multi-Tenant 優勢

1. **完全隔離**

   - 每個商家的客戶資料完全獨立
   - User ID 綁定到專屬 Channel，不會混淆

2. **獨立運作**

   - 每個商家有自己的 LINE 官方帳號
   - 可以獨立設定訊息、自動回覆等

3. **可擴展性**

   - 未來可以輕鬆擴展到數百個商家
   - 可以為每個商家設定不同的費率方案

4. **安全性**
   - Firestore 規則確保商家只能存取自己的資料
   - Admin 無法跨商家操作

---

## ⚠️ 重要提醒

### LINE 訊息發送規則

- ✅ 客戶必須從**該商家的 LIFF** 進入並預約
- ✅ 這樣客戶的 User ID 才會綁定到該商家的 Channel
- ✅ 該商家的管理員才能發送 LINE 訊息給客戶

### 錯誤情況

- ❌ 如果使用商家 A 的 Channel Access Token 發送給商家 B 的客戶 → 失敗
- ✅ 使用商家 A 的 Token 發送給從商家 A LIFF 預約的客戶 → 成功

---

## 📝 新商家加入流程

每次新增商家時：

1. **在 LINE Developers Console**

   - 創建新的 Messaging API Channel
   - 創建新的 LIFF 應用（連結到該 Channel）
   - 發行 Channel Access Token
   - 關閉 Auto-reply 和 Greeting messages

2. **在 Superadmin**

   - 建立商家
   - 設定該商家的 LIFF ID, Channel ID, Access Token

3. **測試**
   - 掃描該商家的 QR Code
   - 建立測試預約
   - 發送測試訊息

---

## 🔧 故障排除

### Q: 發送 LINE 訊息失敗

**檢查：**

1. 客戶是否從該商家的 LIFF 進入並預約？
2. 客戶是否已加入該商家的 LINE 官方帳號？
3. Channel Access Token 是否正確？
4. Auto-reply 和 Greeting messages 是否已關閉？

### Q: 看不到預約資料

**檢查：**

1. Admin 是否綁定到正確的 shopId？
2. 資料是否存在 `shops/{shopId}/appointments` 中？

---

## 📊 架構對比

### 升級前（Single-Tenant）

```
所有商家 → 同一個 LIFF ID → 所有客戶的 User ID 綁定到同一個 Channel
問題：無法為不同商家發送 LINE 訊息（User ID 不匹配）
```

### 升級後（Multi-Tenant）

```
商家 A → LIFF-A → Channel-A → 客戶 A 的 User ID（Channel-A）
商家 B → LIFF-B → Channel-B → 客戶 B 的 User ID（Channel-B）
商家 C → LIFF-C → Channel-C → 客戶 C 的 User ID（Channel-C）

完全隔離 ✅
```

---

## ✅ 系統已就緒

Multi-Tenant SaaS 架構已完成升級！請按照上述步驟設定每個商家的 LINE 資源。
