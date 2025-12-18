# LINE LIFF 多租戶配置指南

## 📋 目前的邏輯流程

### 開發環境

1. 從 `.env` 讀取 `VITE_LIFF_ID`
2. 使用這個 LIFF ID 初始化 LIFF SDK
3. 查詢 Firestore `shops` 集合，找到對應的商家

### 正式環境

1. **情況 A**：URL 包含 `liff.line.me`（尚未重定向）
   - 從 URL 提取 LIFF ID：`https://liff.line.me/2008704504-EFlwzctY`
   - 使用提取的 LIFF ID 初始化
2. **情況 B**：URL 已重定向到 Endpoint URL
   - 使用環境變數的 LIFF ID 作為預設值初始化
   - 初始化後，從 `liff.id` 獲取實際的 LIFF ID
3. 用 LIFF ID 查詢 Firestore，找到對應商家

---

## 🏗️ 多租戶架構方案

### 方案 1：單一 LIFF ID + URL 參數（推薦）

**適用場景**：所有商家共用一個 LINE Bot 和 LIFF App

**配置步驟**：

1. 在 LINE Developers Console 創建一個 LIFF App
2. 設定 Endpoint URL：`https://pet-crm-bb6e9.web.app`
3. 透過 Rich Menu 或訊息按鈕傳遞商家 ID：
   ```
   https://liff.line.me/2008704504-EFlwzctY?shopId=shop1
   ```
4. 在代碼中從 URL query 讀取 `shopId`

**優點**：

- ✅ 配置簡單
- ✅ 只需管理一個 LIFF ID
- ✅ 容易擴展新商家

**缺點**：

- ❌ 所有商家共用同一個 LINE Bot（無法個別品牌化）

---

### 方案 2：多個 LIFF ID + 相同 Endpoint URL（目前採用）

**適用場景**：每個商家有獨立的 LINE Bot

**配置步驟**：

1. **為每個商家創建 LIFF App**

   在 LINE Developers Console 為每個商家的 Channel 創建 LIFF App：

   - 商家 A：LIFF ID = `2008704504-EFlwzctY`
   - 商家 B：LIFF ID = `2009XXXXXX-XXXXXXXX`

2. **設定相同的 Endpoint URL**

   所有 LIFF App 都設定：`https://pet-crm-bb6e9.web.app`

3. **在 Firestore 建立商家資料**

   透過 SuperAdmin 介面（`/superadmin`）：

   - 建立商家
   - 點擊「LINE API」按鈕
   - 設定該商家的 LIFF ID、Channel ID、Access Token

4. **更新 `.env` 設定主要 LIFF ID**

   將最常用的商家 LIFF ID 設定在 `.env`：

   ```bash
   VITE_LIFF_ID=2008704504-EFlwzctY
   ```

**運作流程**：

```
用戶打開 LIFF
  ↓
https://liff.line.me/2008704504-EFlwzctY
  ↓
LIFF 重定向到 Endpoint URL
  ↓
https://pet-crm-bb6e9.web.app?liff.state=...
  ↓
應用初始化，使用 .env 的 LIFF ID
  ↓
查詢 Firestore，找到對應商家
  ↓
綁定商家，顯示該商家的服務和預約
```

**優點**：

- ✅ 每個商家獨立 LINE Bot（可個別品牌化）
- ✅ 每個商家獨立推播額度
- ✅ 符合多租戶架構

**缺點**：

- ⚠️ 需要為每個商家配置 LIFF ID
- ⚠️ 所有 LIFF ID 需要設定相同的 Endpoint URL

---

### 方案 3：多個 LIFF ID + 不同 Endpoint URL（最完整）

**適用場景**：每個商家有獨立的域名或子域名

**配置步驟**：

1. **為每個商家設定域名**

   - 商家 A：`shop-a.example.com`
   - 商家 B：`shop-b.example.com`

2. **在 Firebase Hosting 配置多站點**

   ```bash
   firebase hosting:sites:create shop-a
   firebase hosting:sites:create shop-b
   ```

3. **設定不同的 Endpoint URL**

   - LIFF ID A → `https://shop-a.example.com`
   - LIFF ID B → `https://shop-b.example.com`

4. **在各自的 `.env` 設定 LIFF ID**

**優點**：

- ✅ 完全獨立的品牌體驗
- ✅ 可以為每個商家客製化功能
- ✅ 最清晰的架構

**缺點**：

- ❌ 配置複雜
- ❌ 需要管理多個域名和部署
- ❌ 成本較高

---

## 🔧 當前配置建議

基於您目前的架構（方案 2），請確認：

### 1. 在 LINE Developers Console

對於 LIFF ID `2008704504-EFlwzctY`：

- ✅ Endpoint URL 設定為：`https://pet-crm-bb6e9.web.app`
- ✅ Scope 包含：`profile`, `openid`
- ✅ 已發布（Published）

### 2. 在 Firestore

確認 `shops` 集合中有對應的文檔：

```json
{
  "name": "小寵物店",
  "liffId": "2008704504-EFlwzctY",
  "lineChannelId": "2008703252",
  "lineChannelAccessToken": "LC8wA4NtQDI...",
  "services": [...],
  "businessHours": {...}
}
```

### 3. 在 `.env` 文件

```bash
VITE_LIFF_ID=2008704504-EFlwzctY
```

### 4. 測試流程

1. **在 LINE App 中測試**

   - 打開：`https://liff.line.me/2008704504-EFlwzctY`
   - 應該能正常載入並顯示商家資訊

2. **檢查 Console Log**
   - 在 LINE App 中打開 LIFF
   - 使用 LINE LIFF Inspector 查看 console
   - 應該看到：
     ```
     ✅ LIFF 初始化完成，實際 LIFF ID: 2008704504-EFlwzctY
     ✅ Multi-Tenant: 綁定商家 { liffId: "...", shopId: "..." }
     ```

---

## 🐛 常見問題排查

### 問題 1：顯示「找不到使用 LIFF ID XXX 的商家」

**原因**：Firestore 中沒有對應的商家資料

**解決方案**：

1. 前往 SuperAdmin 介面：`https://pet-crm-bb6e9.web.app/superadmin`
2. 確認商家已建立
3. 點擊「LINE API」按鈕，設定正確的 LIFF ID

### 問題 2：LIFF 初始化失敗

**原因**：LIFF ID 不正確或 Endpoint URL 設定錯誤

**解決方案**：

1. 檢查 LINE Developers Console 的 LIFF 設定
2. 確認 Endpoint URL 是 `https://pet-crm-bb6e9.web.app`
3. 確認 LIFF App 已發布

### 問題 3：開發環境測試失敗

**解決方案**：

1. 確認 `.env` 文件中的 `VITE_LIFF_ID` 已設定
2. 或者，註解掉 `VITE_LIFF_ID`，使用測試用戶模式

---

## 📚 相關文件

- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/)
- [Firebase Hosting Multi-site](https://firebase.google.com/docs/hosting/multisites)
- 專案開發指南：`./DEVELOPMENT.md`
- 開發模式指南：`./DEV_MODE_GUIDE.md`

---

## 🔄 未來改進建議

1. **支援從 URL 參數讀取商家 ID**

   - 修改 Endpoint URL 為：`https://pet-crm-bb6e9.web.app?shopId=xxx`
   - 在代碼中優先從 URL 參數讀取 shopId
   - 降低對 LIFF ID 的依賴

2. **建立 LIFF ID 映射表**

   - 在代碼中維護一個 LIFF ID → Shop ID 的映射
   - 不需要查詢 Firestore 即可識別商家
   - 提升初始化速度

3. **支援子域名部署**
   - 為每個商家配置獨立子域名
   - 提供更好的品牌體驗
   - 簡化 LIFF 配置
