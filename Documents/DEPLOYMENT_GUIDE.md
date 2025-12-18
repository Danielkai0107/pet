# 🚀 Pet Medical CRM - 部署指南

**最後更新**: $(date +"%Y-%m-%d %H:%M")

---

## 📋 部署前檢查清單

### 必要項目

- [x] ✅ 代碼構建成功（`npm run build`）
- [x] ✅ 本地預覽測試（`npm run preview`）
- [ ] ⚠️ 環境變數已正確設定（`.env`）
- [ ] ⚠️ Firebase 專案已設定（production）
- [ ] ⚠️ LIFF ID 已設定並測試

### 建議項目

- [ ] 📝 Staging 環境測試完成
- [ ] 📝 Firebase 安全規則已檢查
- [ ] 📝 備份當前生產環境代碼
- [ ] 📝 準備回滾計劃

---

## 🔧 環境設定

### 1. 環境變數（.env）

創建或更新 `.env` 檔案：

\`\`\`bash

# Firebase Configuration

VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# LINE LIFF Configuration

VITE_LIFF_ID=1234567890-AbCdEfGh
\`\`\`

### 2. Firebase 專案設定

\`\`\`bash

# 安裝 Firebase CLI（如未安裝）

npm install -g firebase-tools

# 登入 Firebase

firebase login

# 初始化專案（如需要）

firebase init

# 查看當前專案

firebase projects:list

# 切換到生產專案

firebase use production
\`\`\`

---

## 📦 構建步驟

### 1. 安裝依賴

\`\`\`bash
npm install
\`\`\`

### 2. 執行構建

\`\`\`bash
npm run build
\`\`\`

**預期輸出**：
\`\`\`
✓ 1806 modules transformed.
dist/index.html 2.96 kB │ gzip: 1.28 kB
dist/assets/index-BjbMzrMD.css 159.91 kB │ gzip: 20.90 kB
dist/assets/firebase-D9MPoQ4e.js 375.12 kB │ gzip: 116.35 kB
dist/assets/index-DlOd9w_s.js 250.63 kB │ gzip: 80.15 kB
✓ built in 2.82s
\`\`\`

### 3. 本地預覽（建議）

\`\`\`bash
npm run preview

# 訪問 http://localhost:4173 測試

\`\`\`

---

## 🌐 部署到 Firebase Hosting

### 方法一：完整部署

⚠️ **注意**: 完整部署不會自動設定環境變數，請先執行環境變數設定。

\`\`\`bash

# 先設定環境變數（如尚未設定）

firebase functions:config:set line.tokens='{"shop-id-1":"token1"}'

# 部署所有服務（Indexes + Rules + Functions + Hosting）

firebase deploy
\`\`\`

### 方法二：分階段部署（推薦）⭐

\`\`\`bash

# 1. 部署 Firestore 索引（P0-2 性能優化）

firebase deploy --only firestore:indexes

# 注意：索引建立可能需要數分鐘到數小時，請等待完成

# 2. 部署 Firestore 規則

firebase deploy --only firestore:rules

# 3. 部署 Storage 規則

firebase deploy --only storage:rules

# 4. 設定 Cloud Functions 環境變數（P1-6 安全性優化）

# ⚠️ 重要：請先設定 LINE Tokens 環境變數

firebase functions:config:set line.tokens='{"shop-id-1":"token1","shop-id-2":"token2"}'

# 詳細說明請參考: functions/ENV_SETUP.md

# 5. 部署 Cloud Functions

cd functions && npm run build && cd ..
firebase deploy --only functions

# 6. 最後部署 Hosting

firebase deploy --only hosting
\`\`\`

**⚠️ 首次部署或有重大更新時，請務必按照此順序執行！**

### 方法三：僅部署 Hosting

\`\`\`bash
firebase deploy --only hosting
\`\`\`

---

## 🔍 部署後驗證

### 1. 檢查部署狀態

\`\`\`bash

# 查看部署歷史

firebase hosting:releases:list

# 查看最新部署

firebase hosting:releases:list --limit 1
\`\`\`

### 2. 訪問生產環境

訪問您的 Firebase Hosting URL：
\`\`\`
https://your-project-id.web.app
或
https://your-project-id.firebaseapp.com
\`\`\`

### 3. 測試關鍵功能

- [ ] ✅ LINE LIFF 登入流程
- [ ] ✅ 首頁載入速度
- [ ] ✅ 預約建立功能
- [ ] ✅ 圖片上傳
- [ ] ✅ 管理後台登入

### 4. 監控指標

開啟 Firebase Console 監控：

1. **Performance Monitoring**

   - https://console.firebase.google.com/project/YOUR_PROJECT/performance

2. **Analytics**

   - https://console.firebase.google.com/project/YOUR_PROJECT/analytics

3. **Hosting**
   - https://console.firebase.google.com/project/YOUR_PROJECT/hosting

---

## 🔙 回滾計劃

如果部署後出現問題，可以快速回滾：

\`\`\`bash

# 方法一：使用 Firebase CLI 回滾到前一個版本

firebase hosting:rollback

# 方法二：透過 Firebase Console

# 1. 前往 Hosting > Release history

# 2. 選擇之前的版本

# 3. 點擊「Rollback」

\`\`\`

---

## ⚠️ 常見問題排查

### 問題 1：LIFF 初始化失敗

**症狀**：載入中卡住或顯示「LIFF 初始化失敗」

**解決方案**：

1. 檢查 `.env` 中的 `VITE_LIFF_ID` 是否正確
2. 確認 LIFF ID 在 LINE Developers Console 中存在
3. 檢查 LIFF Endpoint URL 是否指向正確的 Firebase Hosting URL

### 問題 2：Firebase 連線錯誤

**症狀**：無法讀取/寫入 Firestore 或 Storage

**解決方案**：

1. 檢查 Firebase 配置（API Key, Project ID 等）
2. 檢查 Firestore 和 Storage 規則是否正確部署
3. 在 Firebase Console 中檢查規則測試

### 問題 3：靜態資源 404

**症狀**：JS/CSS 檔案無法載入

**解決方案**：

1. 確認 `dist/` 目錄存在且完整
2. 重新執行 `npm run build`
3. 檢查 Firebase Hosting 設定中的 `public` 路徑

### 問題 4：快取問題

**症狀**：更新後用戶看到的還是舊版本

**解決方案**：

1. 等待 5-10 分鐘讓 CDN 快取更新
2. 用戶可以硬重新整理（Ctrl+Shift+R 或 Cmd+Shift+R）
3. 檢查 `index.html` 的 Cache-Control headers

---

## 📊 性能監控設定

### Firebase Performance Monitoring

\`\`\`typescript
// 已在 src/lib/monitoring.ts 中設定
// 會自動追蹤：
// - 頁面載入時間
// - 網路請求
// - 自定義追蹤
\`\`\`

### Web Vitals 追蹤

\`\`\`typescript
// 已在 src/lib/web-vitals.ts 中設定
// 會自動追蹤：
// - LCP, INP, CLS, FCP, TTFB
// - 數據發送到 Firebase Analytics
\`\`\`

### 建議的額外監控

1. **Uptime 監控**（外部服務）

   - 推薦：UptimeRobot (https://uptimerobot.com)
   - 設定：每 5 分鐘檢查一次
   - 告警：Email/SMS

2. **錯誤追蹤**
   - 推薦：Sentry (https://sentry.io)
   - 或使用 Firebase Crashlytics

---

## 🎯 部署檢查表

### 部署前

- [ ] 代碼已提交到版本控制
- [ ] 本地測試通過
- [ ] 環境變數已設定
- [ ] 備份當前生產環境

### 部署中

- [ ] 構建成功（無錯誤）
- [ ] Firebase 部署成功
- [ ] CDN 快取已更新

### 部署後（前 1 小時）

- [ ] 首頁可正常訪問
- [ ] LIFF 登入流程正常
- [ ] 關鍵功能測試通過
- [ ] 無嚴重錯誤報告

### 部署後（前 24 小時）

- [ ] Performance Monitoring 正常
- [ ] Analytics 數據正常
- [ ] Web Vitals 指標達標
- [ ] 用戶反饋收集

---

## 📞 支援資源

- **Firebase Console**: https://console.firebase.google.com
- **LINE Developers**: https://developers.line.biz/console/
- **Firebase Documentation**: https://firebase.google.com/docs
- **LIFF Documentation**: https://developers.line.biz/en/docs/liff/

---

## 📝 部署記錄範本

記錄每次部署的詳細資訊：

\`\`\`
部署日期：YYYY-MM-DD HH:MM
部署人員：[姓名]
版本號：v1.0.0
部署類型：[完整部署 / Hosting only]
測試狀況：[通過 / 部分通過 / 失敗]
問題記錄：[無 / 描述]
回滾狀況：[無需 / 已回滾]
備註：[其他說明]
\`\`\`

---

**祝部署順利！** 🎉

如有問題請參考：

- [優化總結報告](./OPTIMIZATION_SUMMARY.md)
- [生產環境檢查清單](./PRODUCTION_CHECKLIST.md)
