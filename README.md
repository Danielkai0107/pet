# PetStay — 寵物旅館訂房平台

> 對標 inline 模式：店家 Web 後台管理房型 / 庫存 / 預約，
> 消費者透過店家 LINE 圖文選單連結進入純 Web 站完成預約，
> 加入「平台官方 LINE OA」追蹤訂單與探索更多旅館。

## 技術棧

- **前端**：Vite + React 19 + TypeScript（strict）+ Tailwind CSS + react-router-dom
- **後端**：[Supabase](https://supabase.com)（Postgres + Auth + Storage + Realtime + Edge Functions）
- **LINE**：LIFF v2 + Messaging API（**僅一個平台 OA**）
- **Email**：[Resend](https://resend.com)
- **部署**：Vercel + Supabase Cloud

## 專案結構

```
src/
  web/      公開 Web (探索 / 商家詳情 / 預約 / 預約完成)
  shop/     店家後台 (Supabase Auth)
  liff/     LIFF (LINE 內 - 我的訂單 / 歷史 / 探索 / 收藏)
  admin/    Super Admin (商家審核 / 監控)
  components/  共用 UI 元件
  lib/      supabase, line, email, format, types ...
supabase/
  config.toml             本地開發設定
  migrations/0001_init.sql  schema + RLS
  migrations/0002_rpc.sql   RPC: get_room_availability / create_booking / search_shops
  functions/                Edge Functions (Deno)
    send-email/
    line-webhook/
    line-bind/
    push-line/
  seed.sql                  本地示範資料
_legacy/    舊 Firebase 程式碼備份（不會打包，已加入 .gitignore）
```

## 開始開發

```bash
# 1. 安裝依賴
npm install

# 2. 複製 .env 範本，填入 Supabase / LIFF 金鑰
cp .env.example .env

# 3. (選用) 啟動本地 Supabase
supabase start
supabase db reset   # 套用 migrations + seed.sql

# 4. 啟動前端
npm run dev
```

訪問：

- `http://localhost:5173/` — 公開 Web（探索、預約）
- `http://localhost:5173/shop/login` — 店家後台
- `http://localhost:5173/liff` — LIFF（建議在 LINE 內開啟）
- `http://localhost:5173/admin/shops` — Super Admin

## Phase 進度

- [x] **Phase A** 基礎建設：清空 Firebase、Supabase schema + RLS + RPC、四棵 route 樹、UI 骨架
- [x] **Phase B** 店家後台（Auth、Onboarding 精靈、房型 CRUD、庫存日曆、Email 模板編輯）
- [x] **Phase C** 消費者預約流程（多步驟、advisory-lock 防併發、Email 自動發送、店家 Realtime inbox、確認 / 拒絕 / 入退房工作流）
- [x] **Phase D** 平台 LINE OA + LIFF（Email OTP 綁定、跨店歸戶、我的訂單 / 歷史 / 個人頁、follow webhook）
- [x] **Phase E** Marketplace 探索（共用 ShopSearchPanel + ShopCard、收藏、首頁強化）
- [x] **Phase F** Super Admin（審核 / 暫停 / 啟用、消費者 / 訂單監控、訂閱方案、PWA manifest、首版部署備妥）

## 部署

### Supabase

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                 # 套用 migrations
supabase functions deploy send-email line-webhook line-bind line-me line-orders line-favorites push-line

# 設定 Edge Function 機密
supabase secrets set \
  RESEND_API_KEY=re_xxx \
  EMAIL_FROM="PetStay <noreply@yourdomain.com>" \
  LINE_CHANNEL_ID=xxx \
  LINE_CHANNEL_SECRET=xxx \
  LINE_CHANNEL_ACCESS_TOKEN=xxx \
  LIFF_BIND_URL=https://liff.line.me/<your-liff-id>/bind \
  PLATFORM_NAME=PetStay
```

完成後，到 SQL editor 執行一次 `select promote_super_admin('you@example.com')` 把第一個帳號升為 Super Admin。

### LINE Developer

1. 建立一個 Messaging API channel（平台官方 OA），抄出 channel secret / access token / channel ID。
2. Webhook URL 設成 `https://<your-project>.supabase.co/functions/v1/line-webhook`。
3. 同 channel 內建 LIFF app，Endpoint URL 設成 `https://<your-frontend>/liff`，size 選 Full。

### Vercel（前端）

直接 import GitHub repo，環境變數設定 `.env.example` 中所有 `VITE_*`。Build command 用預設 (`npm run build`)，Output `dist`。

## 重要架構決策

1. **平台只有一個 LINE OA**（不像舊版每店一個），消費者一次綁定可看跨店所有訂單。
2. **預約走 Web 不需 LINE**，加 LINE 只是「升級體驗」（推播、跨店歷史）。
3. **手機綁定走 Email OTP**（V1 不發簡訊）：消費者預約時已填 email，直接寄 6 碼驗證。
4. **庫存模型**：每房型 `total_count`，由 `booking_occupancies` 自動扣，可 `room_inventory_overrides` 覆寫某日。
5. **併發安全**：`create_booking` RPC 用 `pg_advisory_xact_lock(room_id)` 重算可用後再寫入。
6. **RLS 兩種主體**：
   - 店家：`auth.uid()` ↔ `shop_members`（多租戶 by `shop_id`）
   - 消費者：JWT 自訂 claim `line_user_id` ↔ `customers.line_user_id`
# PetLink
