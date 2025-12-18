# Firebase Security Rules 設定指南

## 📋 概述

本專案包含兩個安全規則文件：

- `firestore.rules` - Firestore 數據庫安全規則
- `storage.rules` - Storage 儲存空間安全規則

## 🏗️ 數據結構

### Firestore Collections

```
├── users/{userId}                    # LINE 用戶資料
│   └── pets/{petId}                  # 用戶的寵物（子集合）
├── appointments/{appointmentId}      # 預約記錄
├── shops/{shopId}                    # 店鋪設定
│   └── daily_schedules/{date}        # 每日預約時段（子集合）
└── admins/{adminId}                  # 管理員帳號與權限
```

### Storage Paths

```
├── pets/{userId}/{petId}/{fileName}              # 寵物照片
├── users/{userId}/profileImages/{fileName}       # 用戶頭像
├── users/{userId}/businessDocuments/{fileName}   # 企業文件
├── users/{userId}/bankbook/{fileName}            # 存摺封面
├── users/{userId}/idCards/{fileName}             # 身分證
├── shops/{shopId}/{fileName}                     # 店鋪圖片
└── appointments/{appointmentId}/{fileName}       # 預約附件
```

## 🔐 權限層級

### 1. 客戶端（LINE LIFF）

- ✅ 創建自己的 user 文檔
- ✅ 讀取/寫入自己的 pets
- ✅ 創建預約（appointments）
- ✅ 讀取店鋪資訊（shops）
- ✅ 上傳寵物照片和個人文件

### 2. 店鋪管理員（Admin）

- ✅ 讀取所屬店鋪的預約
- ✅ 更新預約狀態
- ✅ 更新所屬店鋪的設定
- ✅ 上傳店鋪相關圖片

### 3. 超級管理員（SuperAdmin）

- ✅ 所有管理員權限
- ✅ 創建/刪除店鋪
- ✅ 管理所有管理員帳號
- ✅ 刪除預約記錄

## 🚀 部署步驟

### 1. 確認 Firebase CLI 已安裝

```bash
firebase --version
```

如果未安裝：

```bash
npm install -g firebase-tools
```

### 2. 登入 Firebase

```bash
firebase login
```

### 3. 初始化專案（如果尚未初始化）

```bash
firebase init
```

選擇：

- Firestore
- Storage
- Hosting

### 4. 部署安全規則

**僅部署規則（推薦用於規則更新）：**

```bash
firebase deploy --only firestore:rules,storage:rules
```

**部署所有內容：**

```bash
firebase deploy
```

### 5. 驗證部署

前往 Firebase Console：

- Firestore: `https://console.firebase.google.com/project/YOUR_PROJECT/firestore/rules`
- Storage: `https://console.firebase.google.com/project/YOUR_PROJECT/storage/rules`

## ⚠️ 重要注意事項

### LINE LIFF 的安全性限制

由於 LINE LIFF 客戶端無法使用 Firebase Authentication，目前的規則對客戶端操作採用較寬鬆的權限（`allow: if true`）。

**生產環境建議：**

1. **使用 Cloud Functions 作為中間層**

   ```typescript
   // functions/src/index.ts
   export const createAppointment = functions.https.onCall(
     async (data, context) => {
       // 驗證 LINE User ID
       const lineUserId = await verifyLineToken(data.lineToken);

       // 在 Cloud Function 中執行寫入
       await admin
         .firestore()
         .collection("appointments")
         .add({
           ...data,
           userId: lineUserId,
           createdAt: admin.firestore.FieldValue.serverTimestamp(),
         });
     }
   );
   ```

2. **更新 Firestore Rules 使用自定義驗證**

   ```javascript
   match /appointments/{appointmentId} {
     // 只允許通過 Cloud Functions 創建
     allow create: if request.auth.token.admin == true;
   }
   ```

3. **在 Cloud Functions 中設置 Custom Claims**
   ```typescript
   await admin.auth().setCustomUserClaims(uid, {
     lineUserId: "U1234567890",
     verified: true,
   });
   ```

### 檔案大小限制

- 所有圖片上傳限制為 **10MB**
- 只接受 `image/*` MIME 類型

### Admin 管理員設置

在 Firestore 中手動創建管理員文檔：

```javascript
// 在 Firebase Console 中手動添加
// Collection: admins
// Document ID: {Firebase Auth UID}

{
  "email": "admin@example.com",
  "role": "admin",           // 或 "superadmin"
  "shopId": "shop_123",      // 店鋪管理員需要此欄位
  "createdAt": Timestamp
}
```

**SuperAdmin 範例：**

```javascript
{
  "email": "superadmin@example.com",
  "role": "superadmin",
  "createdAt": Timestamp
}
```

## 🧪 測試規則

### 使用 Firebase Emulator

```bash
firebase emulators:start
```

### 使用 Rules Playground

前往 Firebase Console > Firestore > Rules > Rules Playground

測試範例：

```javascript
// 測試客戶端創建預約
Operation: get
Location: /appointments/test123
```

## 📝 常見問題

### Q: 為什麼客戶端可以讀寫所有資料？

A: 因為 LINE LIFF 環境限制，目前無法直接使用 Firebase Auth。生產環境應該使用 Cloud Functions 作為安全的後端 API。

### Q: 如何限制用戶只能訪問自己的資料？

A: 在有 Firebase Auth 的情況下，可以使用：

```javascript
allow read: if request.auth.uid == userId;
```

### Q: 如何添加新的管理員？

A:

1. 在 Firebase Console 創建新的 Auth 用戶
2. 在 Firestore `admins` 集合中添加對應文檔
3. 設置正確的 `role` 和 `shopId`

## 🔄 更新記錄

- **2024-12-08**: 初始版本創建
  - 基礎 Firestore 規則
  - Storage 規則
  - 支援多店鋪架構
  - 三層權限系統（客戶/管理員/超級管理員）

## 📞 支援

如有問題，請檢查：

1. Firebase Console 中的錯誤日誌
2. 瀏覽器開發者工具的 Console
3. Firebase Emulator 的輸出日誌
