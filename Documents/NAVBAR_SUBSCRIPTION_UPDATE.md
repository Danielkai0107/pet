# Navbar 訂閱狀態更新

## 📍 更新位置

訂閱狀態現在顯示在 **Admin Dashboard 的 Navbar** 中，位於頁面標題右側。

## 🎨 設計特點

### 簡潔設計

- 🟢 **啟用狀態**: 綠色漸層背景 + 綠點 + 方案名稱 + 剩餘天數
- 🔴 **停用狀態**: 紅色漸層背景 + 紅點 + "已停用"
- ⚪ **過期狀態**: 灰色漸層背景 + 灰點 + "已過期"

### 顯示資訊

- **方案類型**: 月訂閱 / 年訂閱 / 試用期
- **剩餘天數**: 自動計算並顯示（僅啟用狀態）
- **狀態指示點**: 彩色圓點即時顯示狀態

## 📐 樣式設計

```scss
// 位置: navbar-left (頁面標題旁)
// 大小: 精簡徽章樣式
// 間距: gap: 1rem (與標題保持適當距離)
```

### 顏色方案

| 狀態   | 背景漸層 | 文字色  | 圓點色  |
| ------ | -------- | ------- | ------- |
| 啟用中 | 綠色漸層 | #166534 | #10b981 |
| 已停用 | 紅色漸層 | #991b1b | #ef4444 |
| 已過期 | 灰色漸層 | #4b5563 | #9ca3af |

## 📱 顯示位置

```
┌─────────────────────────────────────────────────┐
│ [Logo] [今日預約] [●月訂閱 剩7天]    [篩選器...] │
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │                                              ││
│ │            Main Content                      ││
│ │                                              ││
│ └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## 🔄 即時更新

訂閱狀態透過 Firebase Realtime Listener 自動更新：

- ✅ SuperAdmin 更新訂閱 → Admin Navbar 即時反映
- ✅ 訂閱過期 → 自動更新顯示狀態
- ✅ 剩餘天數每次進入頁面重新計算

## 📝 程式碼更新

### AdminDashboard.tsx

```typescript
// 新增狀態
const [shopSubscription, setShopSubscription] = useState<any>(null);

// 監聽訂閱資訊
setShopSubscription(shopData.subscription || null);

// Navbar 顯示
<div className="subscription-badge-navbar">
  <span className={`plan-indicator ${status}`}>
    <span className="status-dot"></span>
    <span className="status-text">{planName}</span>
    <span className="days-remaining">剩 {days} 天</span>
  </span>
</div>;
```

### \_admin-dashboard.scss

```scss
.subscription-badge-navbar {
  .plan-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    // ... 漸層背景 + 圓點樣式
  }
}
```

## ✨ 使用體驗

### Admin 登入後

1. 進入任何頁面（今日預約 / 所有預約 / 客戶列表 / 服務紀錄 / 店鋪設定）
2. Navbar 標題旁自動顯示訂閱狀態
3. 一目了然看到：
   - 當前訂閱方案
   - 訂閱狀態
   - 剩餘天數（如果啟用中）

### SuperAdmin 操作後

1. SuperAdmin 更新店家訂閱
2. 該店家的 Admin 立即看到 Navbar 更新
3. 無需重新整理頁面

## 🎯 優點

✅ **隨時可見**: 不需要進入設定頁面就能看到訂閱狀態  
✅ **簡潔美觀**: 不佔用過多空間，保持介面清爽  
✅ **即時更新**: 透過 Firestore Realtime Listener 自動同步  
✅ **視覺友善**: 顏色編碼讓狀態一目了然  
✅ **資訊完整**: 方案 + 狀態 + 剩餘天數一次顯示

## 📊 更新說明

### ✅ 已移除 Settings 頁面的訂閱 Widget

為了避免重複顯示，已將 `ShopSettings` 頁面中的訂閱狀態 Widget 移除。

**理由**:

- ✅ Navbar 徽章在所有頁面都可見，更方便
- ✅ 避免資訊重複顯示
- ✅ 保持介面簡潔
- ✅ 減少 bundle size

**現在**:

- 訂閱狀態統一在 Navbar 顯示
- 所有頁面都能看到
- 一個位置，統一管理

---

**更新日期**: 2024-12-17  
**更新內容**: 新增 Navbar 訂閱狀態顯示  
**狀態**: ✅ 已實作並測試通過
