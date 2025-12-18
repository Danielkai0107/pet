# 上線前檢查清單

## ✅ 已完成的優化

### 性能優化
- [x] Vite 構建配置優化（chunk splitting）
- [x] 路由層級 Code Splitting（React.lazy）
- [x] LIFF 初始化流程優化（快取機制）
- [x] 超時時間從 15 秒減少到 8 秒

### 用戶體驗
- [x] 全域 ErrorBoundary 組件
- [x] LoadingScreen 組件
- [x] PWA 基礎配置（manifest.json）
- [x] iOS Safari PWA 支援

### 監控與分析
- [x] Firebase Performance Monitoring 整合
- [x] Firebase Analytics 整合
- [x] Web Vitals 追蹤（CLS, FID, LCP, FCP, TTFB）
- [x] 自定義事件追蹤（預約、錯誤等）

### 代碼品質
- [x] 移除測試檔案（test-login.html）
- [x] 移除臨時環境變數檔案
- [x] 生產環境自動禁用 console

## ⚠️ 需要手動處理的項目

### 安全性 - 高優先級

#### 1. 環境變數保護
```bash
# 確保 .env 檔案包含正確的生產環境配置
# 請檢查以下變數：
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_LIFF_ID
```

#### 2. Firebase 安全規則
**注意**：當前的 Firestore 和 Storage 規則過於寬鬆，建議在 Staging 環境測試後再部署。

**Firestore 規則問題**：
- `users` 集合：`allow read, update: if true;` - 任何人都可以讀取和更新
- `pets` 子集合：`allow read, write: if true;` - 任何人都可以操作

**建議**：
由於 LIFF 不提供 Firebase Auth token，建議：
1. 實作 Cloud Functions 驗證 LINE User ID
2. 使用 Custom Token 機制
3. 或者至少加入 rate limiting

#### 3. 檢查 Git 歷史
```bash
# 如果您的專案已經是 Git repository，請檢查：
git log --all --full-history -- .env
# 如果有提交記錄，需要清除歷史並輪換所有密鑰
```

### 性能

#### 4. 樣式優化（選擇性）
當前所有 SCSS 樣式（包括管理後台）都會在首次載入時下載。

**選項 A（推薦）**：遷移到 Tailwind CSS
**選項 B（保守）**：將管理後台樣式分離為 CSS Modules

#### 5. 圖片優化
- 確保所有圖片使用 `LazyImage` 組件
- 檢查圖片壓縮率配置（browser-image-compression）
- 考慮加入 WebP 格式支援

#### 6. Service Worker（選擇性）
當前未實作 Service Worker。如需離線支援，可以考慮：
- 使用 Workbox 或 vite-plugin-pwa
- 快取靜態資源和 API 回應

### 測試

#### 7. 構建測試
```bash
# 執行構建並檢查輸出
npm run build

# 檢查構建產物大小
du -sh dist/
ls -lh dist/assets/

# 預覽構建結果
npm run preview
```

#### 8. Lighthouse 測試
```bash
# 使用 Chrome DevTools 或 CLI
lighthouse https://your-staging-url.com --view

# 目標分數：
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 85
```

#### 9. LINE LIFF 環境測試
- [ ] 在 LINE 內建瀏覽器測試所有流程
- [ ] 測試 iOS 和 Android 裝置
- [ ] 測試弱網路環境（3G）
- [ ] 測試 LIFF 登入/登出流程
- [ ] 驗證多租戶功能（不同商家）

### 部署

#### 10. Staging 環境驗證
建議設定獨立的 Firebase 專案作為 Staging：
```bash
# 部署到 Staging
firebase use staging
npm run build
firebase deploy
```

#### 11. 部署策略
1. **先部署 Firebase Rules**（Firestore + Storage）
2. **部署 Cloud Functions**（如有更新）
3. **部署 Hosting**
4. **監控錯誤**：觀察 Firebase Console 24 小時

#### 12. 監控設定
- [ ] 設定 Firebase Hosting 健康檢查
- [ ] 建立 Uptime 監控（推薦 UptimeRobot）
- [ ] 設定告警通知（Email/LINE Notify）
- [ ] 啟用 Firebase Performance Monitoring
- [ ] 啟用 Firebase Analytics

## 📊 預期成果

### 性能指標（建構後）
- 首次載入時間：< 3 秒（3G 網路）
- Time to Interactive：< 5 秒
- JS Bundle 減少：60-70%
- CSS 大小減少：50-60%（如完成樣式優化）

### Web Vitals 目標
- LCP（最大內容繪製）：< 2.5s
- FID（首次輸入延遲）：< 100ms
- CLS（累積佈局偏移）：< 0.1

## 🚨 已知風險

1. **Firebase 規則變更**：務必在 Staging 測試，避免影響現有功能
2. **SCSS 載入**：管理後台樣式仍會在用戶端載入（考慮未來優化）
3. **離線支援**：尚未實作 Service Worker
4. **圖片格式**：尚未支援 WebP

## 📝 部署命令

```bash
# 1. 確保在正確的專案
firebase use production

# 2. 構建
npm run build

# 3. 測試構建結果
npm run preview

# 4. 部署（建議分階段）
# 先部署 Firestore rules
firebase deploy --only firestore:rules

# 再部署 Storage rules
firebase deploy --only storage:rules

# 最後部署 Hosting
firebase deploy --only hosting

# 或一次部署全部
firebase deploy
```

## 🔄 回滾計劃

如果部署後出現問題：

```bash
# 查看部署歷史
firebase hosting:releases:list

# 回滾到前一個版本
firebase hosting:rollback
```

## 📞 支援資源

- Firebase Console: https://console.firebase.google.com
- LINE Developers: https://developers.line.biz/console/
- Performance Monitoring: Firebase Console > Performance
- Analytics: Firebase Console > Analytics

---

**最後更新**: $(date +"%Y-%m-%d")
**負責人**: [填入您的名字]
**預計上線日期**: [填入日期]
