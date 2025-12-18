# P1-6 優化回退說明

**日期**: 2024-12-17
**狀態**: 已回退

## 回退原因

原本的 P1-6 優化（將 LINE Token 從 Firestore 遷移到環境變數）改變了原有的工作流程。

**原有設計**: 在 SuperAdmin 後台直接管理所有店家的 LINE Token
**P1-6 變更**: 需要使用命令行設定環境變數

基於以下考量，決定回退此優化：

1. **便利性**: SuperAdmin 介面管理更直觀方便
2. **靈活性**: 新增/更新店家時無需重新部署 Functions
3. **實用性**: 對於需要經常管理店家的場景更合適

## 當前狀態

✅ **已恢復**: LINE Token 存儲在 Firestore 的 `shops` collection 中
✅ **已部署**: Cloud Functions 已更新並部署
✅ **工作流程**: SuperAdmin 可以直接在後台管理 Token

## 安全性說明

雖然 Token 存在 Firestore，但仍有以下保護：

1. **Firestore Rules**:

   - 只有 SuperAdmin 可以創建/更新店鋪
   - 普通用戶無法讀取 Token（規則限制）

2. **最佳實踐建議**:
   - 定期更換 LINE Channel Access Token
   - 監控異常的 API 使用
   - 限制 SuperAdmin 帳號數量

## 保留的其他 P0/P1 優化

以下優化仍然有效：

✅ P0-1: 查詢分頁和限制
✅ P0-2: Firestore 複合索引
✅ P0-3: 批次查詢優化
✅ P1-4: Firebase Analytics 錯誤監控
✅ P1-5: 即時監聽優化

## 如何管理 LINE Token

### 在 SuperAdmin 後台：

1. 登入 SuperAdmin (`/superadmin`)
2. 找到要設定的店家
3. 點擊「LINE API」按鈕
4. 填入：
   - LIFF ID
   - Channel ID
   - **Channel Access Token** ← 直接在此輸入
5. 點擊「儲存」

無需重新部署，立即生效！

## 文件清理

已刪除：

- `functions/ENV_SETUP.md`（不再需要）
- `setup-line-tokens.sh`（不再需要）

已更新：

- `functions/src/index.ts`（恢復從 Firestore 讀取 Token）

---

**結論**: 系統已恢復原有的 Token 管理方式，SuperAdmin 可以正常使用後台管理所有店家的 LINE 設定。


