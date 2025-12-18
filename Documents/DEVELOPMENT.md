# 🚀 開發指南

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 並重新命名為 `.env`：

```bash
cp .env.example .env
```

## 開發模式設定

### 方案 A：不連接 LINE LIFF（適合切版 Demo）

**直接留空 VITE_LIFF_ID**，系統會自動使用測試用戶資料：

```env
# .env 檔案
VITE_LIFF_ID=

# Firebase 設定（如果不需要後端功能，也可以先留空）
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**特點：**

- ✅ 可以在 `http://localhost:5173` 直接開發
- ✅ 不需要 LINE LIFF 設定
- ✅ 使用假資料，適合 UI 切版
- ✅ Console 會顯示：`⚠️ 開發模式：未設定 VITE_LIFF_ID，使用測試用戶資料`

**測試用戶資料：**

```typescript
{
  uid: 'dev-user-123',
  displayName: '測試用戶',
  pictureUrl: 'https://via.placeholder.com/150',
  role: 'customer'
}
```

### 方案 B：使用 ngrok（需要測試真實 LINE LIFF）

如果需要在手機上測試真實 LINE LIFF：

1. **安裝 ngrok**

   ```bash
   # macOS
   brew install ngrok

   # 或從官網下載
   # https://ngrok.com/download
   ```

2. **啟動開發伺服器**

   ```bash
   npm run dev
   ```

3. **開啟 ngrok 隧道**（另開終端）

   ```bash
   ngrok http 5173
   ```

4. **複製 HTTPS URL**

   ```
   Forwarding  https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:5173
   ```

5. **在 LINE Developers Console 設定**

   - Endpoint URL: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`

6. **更新 .env**
   ```env
   VITE_LIFF_ID=your-liff-id-here
   ```

### 方案 C：部署測試環境到 Firebase

```bash
# 建置並部署
npm run build
firebase deploy --only hosting

# 使用正式網址測試
# https://pet-crm-bb6e9.web.app
```

## 啟動開發伺服器

```bash
npm run dev
```

開發伺服器會在 `http://localhost:5173` 啟動。

## 開發流程建議

### 階段 1：切版 Demo（目前階段）

- 使用**方案 A**（不連接 LIFF）
- 專注於 UI/UX 開發
- 使用測試資料
- 快速迭代

### 階段 2：整合測試

- 使用**方案 B**（ngrok）或**方案 C**（Firebase）
- 連接真實 LIFF
- 測試 LINE 登入流程
- 測試手機瀏覽器兼容性

### 階段 3：正式上線

- 部署到 Firebase Hosting
- 更新 LINE LIFF Endpoint URL
- 完整測試所有功能

## 常見問題

### Q: 為什麼 LINE LIFF 不支援 localhost?

A: LINE LIFF 要求必須使用 HTTPS 協議，且不接受 `localhost` 或 `127.0.0.1`。開發時可以：

- 使用本專案的**開發模式**（方案 A）
- 使用 ngrok 建立 HTTPS 隧道（方案 B）
- 直接部署到 Firebase Hosting 測試（方案 C）

### Q: 開發模式下如何測試不同的用戶角色？

A: 可以修改 `src/contexts/LineAuthProvider.tsx` 中的 `mockUser` 資料：

```typescript
const mockUser: User = {
  uid: "dev-admin-456",
  displayName: "測試管理員",
  pictureUrl: "https://via.placeholder.com/150",
  createdAt: Timestamp.now(),
  role: "admin", // 改成 'admin' 測試管理員功能
};
```

### Q: Console 出現 Firebase 錯誤怎麼辦？

A: 如果只是切版，不需要後端功能，可以忽略 Firebase 相關錯誤。如需使用 Firebase 功能，請正確設定 `.env` 中的 Firebase 配置。

### Q: 如何在團隊中共享開發設定？

A:

1. 將 `.env.example` 加入版本控制
2. 實際的 `.env` 不要加入版本控制（已在 `.gitignore`）
3. 團隊成員各自複製並修改自己的 `.env`

## 部署

請參考 [DEPLOY.md](./DEPLOY.md) 了解完整的部署流程。

## 相關連結

- [Firebase Console](https://console.firebase.google.com/project/pet-crm-bb6e9)
- [LINE Developers Console](https://developers.line.biz/console/)
- [專案 README](./README.md)
- [部署指南](./DEPLOY.md)

---

最後更新：2025-12-12
