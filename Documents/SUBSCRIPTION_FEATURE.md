# 訂閱制功能實作說明

## 📋 功能概述

本次實作為 Pet Medical CRM 系統新增了完整的訂閱制管理功能，讓 SuperAdmin 能夠管理每個店家的訂閱狀態，並在訂閱到期時自動停用帳號。

## 🎯 已實作功能

### 1. 數據結構 ✅

- **位置**: `src/types/shop.ts`
- **新增類型**:
  - `SubscriptionPlan`: 訂閱方案類型（月訂閱、年訂閱、試用期）
  - `SubscriptionStatus`: 訂閱狀態（啟用、停用、已過期）
  - `Subscription`: 完整的訂閱資訊介面
- **Shop 介面擴展**: 新增 `subscription?` 選填欄位

### 2. SuperAdmin 訂閱管理 ✅

- **位置**: `src/features/superadmin/ShopManager.tsx`
- **功能**:
  - ✅ 訂閱方案管理（月訂閱、年訂閱、3 個月試用）
  - ✅ 續訂功能（維持原方案延長）
  - ✅ 停用訂閱
  - ✅ 修改方案（切換不同訂閱類型）
  - ✅ 即將到期篩選（顯示 7 天內到期的店家）
  - ✅ 自動計算到期日和剩餘天數
  - ✅ 表格顯示訂閱狀態、方案、到期日
  - ✅ 訂閱管理 Modal（完整的訂閱設定介面）

### 3. Admin Dashboard 訂閱顯示 ✅

- **位置**: `src/features/admin/ShopSettings.tsx`
- **功能**:
  - ✅ 在 settings-widget 區域顯示訂閱狀態 widget
  - ✅ 顯示訂閱方案徽章（月訂閱、年訂閱、試用期）
  - ✅ 顯示訂閱狀態（啟用中、已停用、已過期）
  - ✅ 顯示到期日期和剩餘天數
  - ✅ 剩餘天數 ≤ 7 天時顯示警告樣式
  - ✅ 停用/過期狀態顯示聯繫客服提示

### 4. 登入檢查 ✅

- **位置**: `src/features/admin/AdminLogin.tsx`
- **功能**:
  - ✅ 登入時檢查訂閱狀態
  - ✅ 如果訂閱已停用或過期，顯示聯繫客服彈窗
  - ✅ 阻止停用/過期帳號登入
  - ✅ SuperAdmin 不受訂閱檢查限制
  - ✅ 提供客服電話、信箱、LINE 官方帳號聯繫方式

### 5. 自動過期檢查 ✅

- **位置**: `functions/src/index.ts`
- **功能**:
  - ✅ Cloud Function 定時任務（每天 00:00 執行）
  - ✅ 自動檢查所有店家訂閱狀態
  - ✅ 將過期的 active 訂閱標記為 expired
  - ✅ 記錄執行日誌
  - ✅ 手動觸發端點（用於測試）

### 6. 樣式設計 ✅

- **位置**:
  - `src/styles/pages/_admin-login.scss`
  - `src/styles/pages/_shop-settings.scss`
  - `src/styles/pages/_superadmin-layout.scss`
- **功能**:
  - ✅ 聯繫客服彈窗樣式
  - ✅ 訂閱狀態 widget 樣式
  - ✅ 訂閱方案和狀態徽章樣式
  - ✅ 警告動畫效果
  - ✅ 響應式設計

## 📊 訂閱方案說明

### 方案類型

| 方案名稱 | 識別碼    | 期限    | 適用對象   |
| -------- | --------- | ------- | ---------- |
| 試用期   | `trial`   | 3 個月  | 新店家體驗 |
| 月訂閱   | `monthly` | 1 個月  | 短期使用   |
| 年訂閱   | `yearly`  | 12 個月 | 長期客戶   |

### 訂閱狀態

| 狀態名稱 | 識別碼     | 說明               |
| -------- | ---------- | ------------------ |
| 啟用中   | `active`   | 正常使用中         |
| 已停用   | `inactive` | 手動停用，無法登入 |
| 已過期   | `expired`  | 自動過期，無法登入 |

## 🚀 使用流程

### SuperAdmin 操作流程

1. **新增訂閱**

   - 登入 SuperAdmin 後台
   - 在店鋪列表中點擊 💳 圖示
   - 選擇訂閱方案（試用期/月訂閱/年訂閱）
   - 選擇狀態（啟用/停用）
   - 設定是否自動續訂
   - 點擊「儲存設定」

2. **續訂**

   - 在訂閱管理 Modal 中點擊「續訂（維持原方案）」
   - 系統會自動延長相同期限

3. **修改方案**

   - 在訂閱管理 Modal 中點擊想要更改的方案按鈕
   - 系統會重新計算到期日

4. **停用訂閱**

   - 在訂閱管理 Modal 中點擊「停用訂閱」
   - 確認後，該店家將無法登入

5. **查看即將到期**
   - 點擊「即將到期」篩選按鈕
   - 顯示 7 天內到期的店家

### Admin 使用體驗

1. **查看訂閱狀態**

   - 登入後進入「店鋪設定」頁面
   - 在右上角 widget 區域查看訂閱狀態
   - 看到到期日和剩餘天數

2. **訂閱到期提醒**
   - 剩餘天數 ≤ 7 天時，數字會以警告色顯示
   - 訂閱過期後無法登入，會顯示聯繫客服彈窗

## 🔧 部署說明

### Cloud Function 部署

```bash
cd functions
npm install
firebase deploy --only functions:checkExpiredSubscriptions,functions:manualCheckExpiredSubscriptions
```

### 測試 Cloud Function

手動觸發檢查過期訂閱：

```bash
curl -X POST \
  https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/manualCheckExpiredSubscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## 📝 Firestore 數據結構

```typescript
// shops/{shopId}
{
  name: "店鋪名稱",
  // ... 其他欄位
  subscription: {
    plan: "monthly" | "yearly" | "trial",
    status: "active" | "inactive" | "expired",
    startDate: "2024-12-17T00:00:00.000Z",
    expiryDate: "2025-01-17T00:00:00.000Z",
    autoRenew: false,
    createdAt: "2024-12-17T10:30:00.000Z",
    updatedAt: "2024-12-17T10:30:00.000Z"
  }
}
```

## 🎨 UI 設計說明

### 顏色方案

- **月訂閱**: 藍色系 (`#dbeafe` / `#1e40af`)
- **年訂閱**: 黃色系 (`#fef3c7` / `#92400e`)
- **試用期**: 綠色系 (`#dcfce7` / `#166534`)
- **啟用**: 綠色 (`#dcfce7` / `#166534`)
- **停用**: 紅色 (`#fee2e2` / `#991b1b`)
- **過期**: 灰色 (`#f3f4f6` / `#6b7280`)
- **警告**: 橙色 (`#f59e0b`)

## ⚠️ 注意事項

1. **SuperAdmin 不受限制**

   - SuperAdmin 帳號不檢查訂閱狀態
   - 可以正常登入和管理所有店家

2. **自動過期時間**

   - Cloud Function 每天 00:00（台北時間）執行
   - 建議在部署後測試執行時間

3. **客服資訊**

   - 請在 `AdminLogin.tsx` 中更新實際的客服聯繫方式
   - 目前使用的是範例資料

4. **向後兼容**
   - `subscription` 欄位為選填
   - 現有店家不會受影響
   - 需要手動為現有店家設定訂閱

## 🔍 測試清單

- [ ] SuperAdmin 可以新增訂閱
- [ ] SuperAdmin 可以續訂
- [ ] SuperAdmin 可以修改方案
- [ ] SuperAdmin 可以停用訂閱
- [ ] SuperAdmin 可以篩選即將到期的店家
- [ ] Admin 可以看到訂閱狀態 widget
- [ ] Admin 登入時檢查訂閱狀態
- [ ] 停用/過期帳號無法登入
- [ ] 顯示聯繫客服彈窗
- [ ] Cloud Function 自動過期檢查運作正常
- [ ] 剩餘天數 ≤ 7 天時顯示警告樣式

## 📞 聯繫客服資訊

請更新以下實際聯繫方式：

- **客服電話**: 0800-123-456
- **客服信箱**: support@petcrm.com
- **LINE 官方帳號**: @petcrm

---

## 🎉 完成狀態

✅ 所有功能已完成實作
✅ 所有樣式已完成設計
✅ Cloud Function 已完成設置
✅ 文件已完成撰寫

**實作日期**: 2024-12-17
**版本**: v1.0.0
