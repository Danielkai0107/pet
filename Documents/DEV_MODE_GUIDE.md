# 🔧 開發模式完整指南

## ✅ 已設置完成的功能

### 1. **LINE LIFF 開發模式**

- ✅ 不需要真實 LINE LIFF ID
- ✅ 使用測試用戶資料
- ✅ 不會跳轉 LINE 登入頁面

### 2. **Firebase 開發模式**

- ✅ 不需要真實 Firebase 配置
- ✅ 使用假的 API Key（不會報錯）
- ✅ 所有資料庫操作都模擬成功

### 3. **商店管理開發模式**

- ✅ 自動提供測試商店 ID：`test-shop-123`
- ✅ 測試商店資料（名稱、營業時間、服務項目）
- ✅ 管理後台可以正常顯示

### 4. **預約系統開發模式**

- ✅ 預約頁面不需要 URL 參數
- ✅ 建立預約會模擬成功
- ✅ 管理後台顯示測試預約資料

### 5. **檔案上傳開發模式**

- ✅ 寵物照片上傳會轉換為 base64（本地預覽）
- ✅ 商店 Logo 上傳會轉換為 base64（本地預覽）
- ✅ 不需要 Firebase Storage
- ✅ 上傳後可以正常預覽圖片

## 🚀 快速開始

### 當前設定（純切版模式）

您的 `.env` 檔案中所有配置都已註解：

```env
# 🔧 開發模式配置
# 註解掉所有設定 = 純前端切版模式（不連接任何後端）

# Firebase 設定（已註解）
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_PROJECT_ID=...
# ...

# LINE LIFF 設定（已註解）
# VITE_LIFF_ID=...
```

### 可訪問的頁面

#### 1. **用戶端首頁**

```
http://localhost:5173/
```

- 測試用戶：測試用戶
- UID: dev-user-123

#### 2. **預約頁面**

```
http://localhost:5173/booking
```

- 自動使用測試商店 ID
- 可以完整體驗預約流程
- 提交預約會模擬成功

#### 3. **管理後台**

```
http://localhost:5173/admin
```

- 測試管理員自動登入
- 測試商店 ID: test-shop-123
- 顯示測試預約資料

## 📊 測試資料

### 測試用戶

```typescript
{
  uid: "dev-user-123",
  displayName: "測試用戶",
  pictureUrl: "https://via.placeholder.com/150",
  role: "customer"
}
```

### 測試管理員

```typescript
{
  uid: "test-admin-123",
  email: "admin@test.com",
  shopId: "test-shop-123"
}
```

### 測試商店

```typescript
{
  id: "test-shop-123",
  name: "測試寵物美容店",
  businessHours: { start: "09:00", end: "21:00" },
  services: [
    { name: "基礎洗澡", price: 500, duration: 60 },
    { name: "美容造型", price: 1200, duration: 120 },
    { name: "藥浴SPA", price: 800, duration: 90 }
  ]
}
```

### 測試預約資料

**管理後台會顯示：**

- 測試客戶 A - 小白（狗） - 2025-12-15 10:00 - 基礎洗澡 - 已確認
- 測試客戶 B - 小黑（貓） - 2025-12-15 14:00 - 美容造型 - 待確認

**用戶端首頁會顯示：**

進行中的預約：

- 小白（狗） - 明天 10:00 - 基礎洗澡 - 待確認
- 花花（貓） - 下週 14:00 - 美容造型 - 已確認

歷史紀錄：

- 小白（狗） - 上週 11:00 - 藥浴 SPA - 已完成
- 花花（貓） - 上個月 15:00 - 基礎洗澡 - 已完成
- 小白（狗） - 上週 16:00 - 美容造型 - 已取消

## 🎯 Console 提示

當開發模式正常運作時，瀏覽器 Console 會顯示：

```
⚠️ 開發模式：使用 Firebase 模擬配置（不會真實連接後端）
⚠️ 開發模式：未設定 VITE_LIFF_ID，使用測試用戶資料
⚠️ 開發模式：使用測試管理員帳號
⚠️ 開發模式：使用測試商店 ID
⚠️ 開發模式：使用測試商店資料
⚠️ 開發模式：使用測試預約資料
⚠️ 開發模式：使用測試用戶預約資料
⚠️ 開發模式：模擬照片上傳成功（使用本地預覽）
⚠️ 開發模式：跳過客戶/寵物資料儲存
⚠️ 開發模式：模擬建立預約成功
⚠️ 開發模式：模擬預約狀態更新成功
```

## 🔄 如何切換到正式環境

### 步驟 1：啟用 Firebase（保持離線 LIFF）

取消註解 Firebase 配置：

```env
# Firebase 設定
VITE_FIREBASE_API_KEY=AIzaSyDTy0XSq0qpecK2GBmKycg8E_74T_uEGdQ
VITE_FIREBASE_PROJECT_ID=pet-crm-bb6e9
# ... 其他 Firebase 設定

# LINE LIFF（保持註解）
# VITE_LIFF_ID=2008650556-8kWdz6Pv
```

### 步驟 2：啟用完整正式環境

取消所有註解：

```env
# Firebase 設定（取消註解）
VITE_FIREBASE_API_KEY=AIzaSyDTy0XSq0qpecK2GBmKycg8E_74T_uEGdQ
# ...

# LINE LIFF（取消註解）
VITE_LIFF_ID=2008650556-8kWdz6Pv
```

## 🐛 常見問題

### Q: Firebase API Key 錯誤可以忽略嗎？

A: 是的！在開發模式下，Console 中的 Firebase 錯誤都可以忽略。UI 功能完全正常。

### Q: 圖片載入失敗（via.placeholder.com）？

A: 這是網路問題，不影響功能。測試用戶的頭像使用 placeholder 服務。

### Q: 預約提交後沒有資料？

A: 開發模式下預約只會模擬成功，不會真的儲存。切換到正式環境後就會正常儲存。

### Q: 上傳照片後可以預覽嗎？

A: 可以！開發模式下照片會轉換為 base64 格式，可以在本地正常預覽。不會上傳到 Firebase Storage，但不影響 UI 顯示。

### Q: 如何測試不同的用戶角色？

A: 修改 `src/contexts/LineAuthProvider.tsx` 中的 `mockUser.role`：

- `customer` - 一般用戶
- `admin` - 管理員

## 📝 注意事項

1. **開發模式僅用於 UI 切版**，不會真的寫入資料庫
2. **重新整理頁面後測試資料會重置**
3. **正式上線前務必啟用真實配置**
4. **不要將 `.env` 檔案加入版本控制**

## 🎨 適合做的事情

在開發模式下，您可以：

- ✅ 調整 UI/UX 設計
- ✅ 修改樣式（CSS/SCSS）
- ✅ 測試頁面流程
- ✅ 調整版面配置
- ✅ 測試響應式設計
- ✅ 修改文案內容

## 🚫 不適合做的事情

在開發模式下，無法：

- ❌ 測試真實資料儲存
- ❌ 測試 LINE 登入流程
- ❌ 測試 Firebase 權限
- ❌ 測試圖片上傳
- ❌ 測試手機瀏覽器兼容性

---

**準備好開始切版了！** 🎉

最後更新：2025-12-12
