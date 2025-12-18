# LINE 訊息配額優化策略

## 優化目標

最大化利用 LINE OA 免費配額（台灣地區：200 則/月），避免不必要的 Push API 使用。

---

## 關鍵概念

### Push API vs Reply API vs sendMessages

| 方法             | 類型       | 計入配額 | 費用    | 使用時機            |
| ---------------- | ---------- | -------- | ------- | ------------------- |
| **Push API**     | 主動推送   | ✅ 是    | 💰 計費 | 主動通知客戶        |
| **Reply API**    | 被動回覆   | ❌ 否    | 🆓 免費 | 自動回覆關鍵字      |
| **sendMessages** | 聊天室訊息 | ❌ 否    | 🆓 免費 | LIFF 內發送到聊天室 |

---

## 優化策略

### 原本的訊息流程（每個預約 2-3 則 Push）

```
客戶預約
  ↓
1. Cloud Function: onAppointmentCreated
   → Push API 發送「預約成功」通知  💰 計入配額
  ↓
管理員確認
  ↓
2. Cloud Function: onAppointmentStatusConfirmed
   → Push API 發送「預約已確認」通知  💰 計入配額
  ↓
服務完成
  ↓
3. 管理員手動發送完成通知
   → Push API 發送「服務完成」通知  💰 計入配額
```

**每個預約消耗：2-3 則配額**
**200 則配額可支援：66-100 個預約**

### 優化後的訊息流程（每個預約 1-2 則 Push）

```
客戶預約
  ↓
1. LIFF 客戶端: liff.sendMessages()
   → 發送到聊天室「預約送出成功」 🆓 免費
  ↓
管理員確認
  ↓
2. Cloud Function: onAppointmentStatusConfirmed
   → Push API 發送「預約已確認」通知  💰 計入配額
  ↓
服務完成
  ↓
3. 管理員手動發送完成通知
   → Push API 發送「服務完成」通知  💰 計入配額
```

**每個預約消耗：1-2 則配額**
**200 則配額可支援：100-200 個預約**

**配額節省：33-50%** 🎉

---

## 實作細節

### 1. 停用 Cloud Function 預約建立通知

**檔案**: `functions/src/index.ts`

```typescript
// Multi-Tenant: 監聽所有商家的預約創建事件
// 已停用：節省 LINE Push API 配額，改用客戶端 sendMessages（免費）
// export const onAppointmentCreated = onDocumentCreated(
//   "shops/{shopId}/appointments/{appointmentId}",
//   async (event) => {
//     // ... 已註解以節省配額
//   }
// );
```

**原因**：

- Push API 會計入配額
- 客戶在 LIFF 中已經看到預約成功訊息
- 用 `liff.sendMessages()` 取代，免費且不計入配額

### 2. 保留客戶端 sendMessages

**檔案**:

- `src/features/appointments/AppointmentForm.tsx`
- `src/features/appointments/AppointmentFormNew.tsx`
- `src/features/appointments/ServiceHistory.tsx`

```typescript
// 發送預約成功訊息到聊天室（免費，不計入配額）
await liff.sendMessages([
  {
    type: "text",
    text: `預約送出成功！\n日期：${formattedDate}\n時間：${time}\n服務：${selectedService.name}`,
  },
]);
```

**優點**：

- ✅ 完全免費
- ✅ 不計入配額
- ✅ 客戶立即在聊天室看到確認訊息
- ✅ 保持良好的用戶體驗

### 3. 保留重要的 Push 通知

**仍使用 Push API 的情境**：

✅ **預約確認通知** (onAppointmentStatusConfirmed)

- 管理員確認預約後發送
- 客戶需要明確知道預約已被商家確認
- 重要程度：⭐⭐⭐⭐⭐

✅ **服務完成通知** (sendServiceCompletionNotification)

- 管理員手動發送
- 通知客戶服務已完成可以接回寵物
- 重要程度：⭐⭐⭐⭐⭐

✅ **完成照分享** (sendLineCompletionMessage)

- 管理員手動發送（含照片）
- 提升客戶滿意度
- 重要程度：⭐⭐⭐⭐

✅ **臨時回報** (sendLineTempReportMessage)

- 管理員手動發送
- 服務進行中的即時更新
- 重要程度：⭐⭐⭐⭐

✅ **預約婉拒通知** (declineAppointment)

- 管理員婉拒預約時發送
- 客戶需要知道並改預約
- 重要程度：⭐⭐⭐⭐⭐

❌ **自動回覆** (lineWebhook + Reply API)

- 使用 Reply API，不計入配額
- 完全免費，無限制使用
- 重要程度：⭐⭐⭐⭐

---

## 配額使用估算

### 輕用量方案（200 則/月）

**假設情境**：

- 每天平均 5 個預約
- 30 天 = 150 個預約

**配額使用**：

| 訊息類型     | 每預約   | 總數          |
| ------------ | -------- | ------------- |
| 預約確認通知 | 1 則     | 150 則        |
| 服務完成通知 | 1 則     | 150 則        |
| **小計**     | **2 則** | **300 則** ⚠️ |

**問題**：300 則 > 200 則配額！

**解決方案**：

1. **選擇性發送完成通知**：只在客戶要求時發送
2. **升級到中用量方案**：800 元/月，3,000 則
3. **使用完成照分享**：結合完成通知和照片，減少訊息數

### 優化後的建議使用方式

**方案 A：僅發送確認通知**

- 預約確認：150 則
- 服務完成：依需求發送（50 則）
- **總計：200 則** ✅ 剛好符合配額

**方案 B：結合使用**

- 預約確認：150 則
- 完成照分享（含通知）：30 則（精選重點客戶）
- 臨時回報：20 則（VIP 客戶）
- **總計：200 則** ✅

---

## 訊息優先級建議

### 必發訊息（高優先級）⭐⭐⭐⭐⭐

1. 預約確認通知
2. 預約婉拒通知

### 選擇性發送（中優先級）⭐⭐⭐⭐

1. 服務完成通知
2. 完成照分享

### 額外服務（低優先級）⭐⭐⭐

1. 臨時回報
2. 即時更新

### 免費使用（無限制）🆓

1. 自動回覆（Reply API）
2. 預約成功訊息（sendMessages）
3. 取消訊息（sendMessages）

---

## 監控與警告

系統會在 **LINE 管理** 頁面顯示：

- 📊 當月配額使用狀況
- 📈 使用率百分比
- ⚠️ 智能警告提示

**警告閾值**：

- 80% (160/200)：⚠️ 警戒
- 90% (180/200)：🚨 危險
- 100% (200/200)：⛔ 達上限

---

## 部署更新

### 1. 部署 Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 2. 部署前端

```bash
npm run build
firebase deploy --only hosting
```

---

## 變更摘要

### 移除的功能

- ❌ Cloud Function: `onAppointmentCreated`（預約建立時的自動通知）

### 保留的功能

- ✅ LIFF: `liff.sendMessages()`（客戶端聊天室訊息，免費）
- ✅ Cloud Function: `onAppointmentStatusConfirmed`（確認/取消通知）
- ✅ Cloud Function: `sendServiceCompletionNotification`（完成通知）
- ✅ Cloud Function: `sendLineCompletionMessage`（完成照分享）
- ✅ Cloud Function: `sendLineTempReportMessage`（臨時回報）
- ✅ Cloud Function: `declineAppointment`（婉拒通知）
- ✅ Cloud Function: `lineWebhook`（自動回覆，Reply API，免費）

---

## 效益分析

### 配額節省

**優化前**：

- 預約建立：1 則（Push API）💰
- 預約確認：1 則（Push API）💰
- 服務完成：1 則（Push API）💰
- **= 每預約 3 則**

**優化後**：

- 預約建立：0 則（改用 sendMessages）🆓
- 預約確認：1 則（Push API）💰
- 服務完成：1 則（Push API，可選）💰
- **= 每預約 1-2 則**

**節省效果**：

- 節省 33-66% 配額使用
- 200 則可支援 100-200 個預約
- 從每月 ~66 個預約提升到 100-200 個預約

### 用戶體驗

✅ **不受影響**：

- 客戶在 LIFF 中立即看到「預約送出成功」訊息
- 管理員確認後收到正式通知
- 服務完成時收到通知
- 整體體驗保持一致

---

## 最佳實踐建議

### 1. 配額管理

- 監控每日配額使用量
- 預約高峰期優先發送重要通知
- 接近上限時暫停非必要訊息

### 2. 訊息策略

- **必發**：確認通知、婉拒通知
- **選發**：完成通知、完成照
- **額外**：臨時回報、即時更新
- **無限**：自動回覆、聊天室訊息

### 3. 升級時機

- 每月穩定 > 160 則：考慮升級
- 經常達到 80% 以上：建議升級
- 需要群發功能：必須升級

---

## 更新日誌

### 2024-12-18

#### 配額優化

- ❌ 停用 `onAppointmentCreated`（節省每預約 1 則）
- ❌ 移除 `sendTestMessages`（避免浪費 3 則配額）
- ✅ 保留 `liff.sendMessages()`（免費替代方案）
- ✅ 保留所有重要通知

#### UI 改進

- ✅ 新增「LINE 管理」獨立分頁
- ✅ 移除系統統計區塊（以官方配額為準）
- ✅ 訂閱徽章、LIFF 連結、訊息配額集中管理
- ✅ 從店鋪設定分離 LINE 相關功能

---

## 相關文件

- [LINE 訊息配額監控系統](./LINE_QUOTA_MONITORING.md)
- [LINE 台灣地區配額說明](./LINE_QUOTA_TAIWAN.md)
- [LINE 自動回覆部署指南](./LINE_AUTO_REPLY_DEPLOYMENT.md)
