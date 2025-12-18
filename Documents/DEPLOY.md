# 🚀 部署指南

## 當前狀態

✅ **已完成：**
- Firestore Security Rules 已成功部署
- 部署腳本已創建

⚠️ **待完成：**
- Firebase Storage 需要手動啟用

---

## 📦 已部署的內容

### Firestore Rules
```
✅ 已部署並生效
```

查看規則：https://console.firebase.google.com/project/pet-crm-bb6e9/firestore/rules

### Storage Rules
```
⚠️ 需要先啟用 Storage
```

---

## 🔧 啟用 Firebase Storage

### 步驟：

1. **開啟 Firebase Console**
   ```
   https://console.firebase.google.com/project/pet-crm-bb6e9/storage
   ```

2. **點擊「Get Started」**

3. **選擇安全規則模式**
   - 建議選擇「Production mode」（我們已經準備好自定義規則）

4. **選擇 Storage 位置**
   - 推薦：`asia-east1` (台灣)
   - 或：`asia-northeast1` (日本東京)

5. **完成啟用**

6. **部署 Storage 規則**
   ```bash
   ./deploy-storage.sh
   ```

---

## 🛠️ 部署指令

### 快速部署（僅規則）

```bash
# 部署 Firestore 規則
firebase deploy --only firestore:rules

# 部署 Storage 規則（需先啟用 Storage）
firebase deploy --only storage:rules

# 一次部署兩者
firebase deploy --only firestore:rules,storage:rules
```

### 完整部署（規則 + Hosting）

```bash
# 使用自動化腳本
./deploy-all.sh
```

這個腳本會：
1. ✅ 檢查 Firebase 登入狀態
2. ✅ 部署 Firestore 規則
3. ⚠️ 嘗試部署 Storage 規則（如果已啟用）
4. 💬 詢問是否要建置並部署 Hosting

### 僅部署前端

```bash
# 建置
npm run build

# 部署到 Firebase Hosting
firebase deploy --only hosting
```

---

## 📋 部署檢查清單

### 部署前
- [ ] 已登入 Firebase CLI (`firebase login`)
- [ ] 已選擇正確專案 (`firebase use pet-crm-bb6e9`)
- [ ] 已啟用 Firebase Storage（如需要）
- [ ] 程式碼無 linter 錯誤
- [ ] 已測試主要功能

### 部署後
- [ ] 檢查 Firestore Rules 是否生效
- [ ] 檢查 Storage Rules 是否生效（如已啟用）
- [ ] 測試前端網站是否正常運作
- [ ] 測試 LINE LIFF 登入功能
- [ ] 測試預約功能
- [ ] 檢查 Firebase Console 無錯誤日誌

---

## 🔗 重要連結

### Firebase Console
- **總覽**: https://console.firebase.google.com/project/pet-crm-bb6e9/overview
- **Firestore**: https://console.firebase.google.com/project/pet-crm-bb6e9/firestore
- **Storage**: https://console.firebase.google.com/project/pet-crm-bb6e9/storage
- **Hosting**: https://console.firebase.google.com/project/pet-crm-bb6e9/hosting
- **Authentication**: https://console.firebase.google.com/project/pet-crm-bb6e9/authentication

### 文檔
- [Firebase Rules 詳細說明](./FIREBASE_RULES_README.md)
- [專案 README](./README.md)

---

## 🐛 常見問題

### Q: 部署時出現 "Error: HTTP Error: 403, Permission denied"
A: 確認你的 Firebase 帳號有此專案的管理權限

### Q: Storage 部署失敗
A: 確認已在 Firebase Console 中啟用 Storage

### Q: Firestore Rules 更新後沒有生效
A: 
1. 檢查 Firebase Console 確認規則已更新
2. 清除瀏覽器快取
3. 等待 1-2 分鐘讓規則傳播

### Q: 如何回滾到之前的規則版本？
A: 在 Firebase Console > Firestore > Rules 頁面可以查看歷史版本並回滾

---

## 📞 需要幫助？

1. 檢查 Firebase Console 的錯誤日誌
2. 查看瀏覽器開發者工具的 Console
3. 執行 `firebase --debug deploy` 查看詳細日誌

---

最後更新：2024-12-08

