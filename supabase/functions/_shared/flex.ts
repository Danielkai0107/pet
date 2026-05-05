// LINE Flex Message bubble builders for booking lifecycle events.
//
// Airbnb 風 — 全白 / 黑灰 / 主色青藍 #1AB6C1，無大彩色塊：
//   - hero 為「商家封面圖」；左上小色塊狀態 pill 用 brand-50 底 + brand-700 字
//     維持低彩度的軟調感
//   - 沒有封面圖時 fallback 改成黑色 (#111111) 大字標題，呼應「白為主、不用大彩色塊」
//   - 圖片底部仍保留半透明黑色 title bar（白字標題在圖片上是可讀性最佳作法）
//   - body 為純資訊欄位；費用一律 slate-900 加粗（價格永遠黑色），不再 brand teal
//   - footer 重排：主 CTA 為實心 brand-500 + 白字 pill；
//     次要按鈕（致電店家）為 neutral-100 底 + 黑字
//   - 無任何 emoji，全部以文字呈現

export type LineNotifyKind =
  | "booking_received"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_cancelled"
  | "booking_reminder"
  | "checked_in"
  | "checked_out";

export interface FlexBookingVars {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopCoverUrl?: string;
  bookingCode: string;
  guestName: string;
  petName: string;
  roomName: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nights: number;
  totalPrice: number;
  /** Optional URL to view booking inside LIFF — typically /liff?code=XXXX. */
  detailUrl?: string;
}

interface KindMeta {
  /** 狀態 pill 文字 */
  statusLabel: string;
  /** 主 CTA 標籤（footer 第一顆按鈕） */
  cta: string;
}

const META: Record<LineNotifyKind, KindMeta> = {
  booking_received: { statusLabel: "預約已送出", cta: "查看訂單詳情" },
  booking_confirmed: { statusLabel: "預約已確認", cta: "查看訂單詳情" },
  booking_declined: { statusLabel: "預約未受理", cta: "查看訂單詳情" },
  booking_cancelled: { statusLabel: "預約已取消", cta: "再次預約" },
  booking_reminder: { statusLabel: "明天入住提醒", cta: "查看訂單詳情" },
  checked_in: { statusLabel: "已入住", cta: "查看訂單詳情" },
  checked_out: { statusLabel: "退房完成", cta: "再次預約" },
};

// Brand cyan-teal — 與前端 #1ab6c1 主色一致
const BRAND_500 = "#1AB6C1";
const BRAND_700 = "#137A82";
const BRAND_50 = "#EAFBFC";
const SLATE_900 = "#0F172A";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_200 = "#E2E8F0";
const NEUTRAL_100 = "#F4F4F5";

function fmtDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(`${iso}T00:00:00Z`);
  const wd = ["日", "一", "二", "三", "四", "五", "六"][d.getUTCDay()];
  return `${m[1]}/${m[2]}/${m[3]} (週${wd})`;
}

function fmtMoney(n: number): string {
  return `NT$ ${n.toLocaleString("en-US")}`;
}

/** Build the JSON for a LINE Flex bubble. */
export function buildBookingBubble(
  kind: LineNotifyKind,
  vars: FlexBookingVars,
): Record<string, unknown> {
  const meta = META[kind];

  return {
    type: "bubble",
    size: "kilo",
    hero: buildHero(meta.statusLabel, vars),
    body: buildBody(vars),
    footer: buildFooter(meta.cta, vars),
  };
}

/** Hero：商家封面圖 + 左上狀態 pill + 底部半透明黑底 + 店名 / 地址。 */
function buildHero(
  statusLabel: string,
  vars: FlexBookingVars,
): Record<string, unknown> {
  // 狀態 pill — Airbnb 軟調 brand-50 + brand-700 字
  const pill: Record<string, unknown> = {
    type: "box",
    layout: "vertical",
    position: "absolute",
    offsetTop: "12px",
    offsetStart: "12px",
    backgroundColor: BRAND_50,
    cornerRadius: "md",
    paddingTop: "5px",
    paddingBottom: "5px",
    paddingStart: "10px",
    paddingEnd: "10px",
    contents: [
      {
        type: "text",
        text: statusLabel,
        color: BRAND_700,
        weight: "bold",
        size: "xs",
      },
    ],
  };

  // 店名 + 地址 — 底部半透明黑底；圖片上的標題用白字可讀性最佳
  const titleBar: Record<string, unknown> = {
    type: "box",
    layout: "vertical",
    position: "absolute",
    offsetBottom: "0px",
    offsetStart: "0px",
    offsetEnd: "0px",
    backgroundColor: "#000000B3",
    paddingTop: "12px",
    paddingBottom: "12px",
    paddingStart: "16px",
    paddingEnd: "16px",
    contents: [
      {
        type: "text",
        text: vars.shopName,
        color: "#FFFFFF",
        weight: "bold",
        size: "lg",
        wrap: true,
        maxLines: 1,
      },
      ...(vars.shopAddress
        ? [
            {
              type: "text",
              text: vars.shopAddress,
              color: "#FFFFFFCC",
              size: "xs",
              margin: "xs",
              wrap: true,
              maxLines: 1,
            },
          ]
        : []),
    ],
  };

  if (vars.shopCoverUrl) {
    return {
      type: "box",
      layout: "vertical",
      paddingAll: "0px",
      contents: [
        {
          type: "image",
          url: vars.shopCoverUrl,
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover",
        },
        pill,
        titleBar,
      ],
    };
  }

  // Fallback：沒有封面圖 → 黑底白字（呼應「白為主、不用大彩色塊」）
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: "#111111",
    paddingAll: "0px",
    height: "150px",
    contents: [pill, titleBar],
  };
}

/** Body：訂單編號 + 6 個 row 資料表；費用一律 slate-900 加粗（價格永遠黑色） */
function buildBody(vars: FlexBookingVars): Record<string, unknown> {
  return {
    type: "box",
    layout: "vertical",
    paddingAll: "20px",
    spacing: "md",
    contents: [
      row("訂單編號", vars.bookingCode, SLATE_900, true),
      { type: "separator", color: SLATE_200 },
      row("入住", fmtDate(vars.checkInDate)),
      row("退房", fmtDate(vars.checkOutDate)),
      row("夜數", `${vars.nights} 晚`),
      row("房型", vars.roomName),
      row("寵物", vars.petName),
      row("費用", fmtMoney(vars.totalPrice), SLATE_900, true),
    ],
  };
}

/** Footer：主 CTA 實心 brand-500 + 白字；次要鈕灰底黑字 */
function buildFooter(
  ctaLabel: string,
  vars: FlexBookingVars,
): Record<string, unknown> | undefined {
  const buttons: Record<string, unknown>[] = [];

  if (vars.detailUrl) {
    buttons.push(primaryButton(ctaLabel, vars.detailUrl));
  }
  if (vars.shopPhone) {
    buttons.push(
      secondaryButton(`致電店家 ${vars.shopPhone}`, `tel:${vars.shopPhone}`),
    );
  }

  if (buttons.length === 0) return undefined;

  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    paddingAll: "16px",
    paddingTop: "0px",
    contents: buttons,
  };
}

/** Airbnb 風主 CTA — 實心 brand-500 + 白字 pill */
function primaryButton(label: string, uri: string): Record<string, unknown> {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: BRAND_500,
    cornerRadius: "lg",
    paddingAll: "14px",
    action: {
      type: "uri",
      label,
      uri,
    },
    contents: [
      {
        type: "text",
        text: label,
        color: "#FFFFFF",
        weight: "bold",
        size: "sm",
        align: "center",
        wrap: false,
        maxLines: 1,
      },
    ],
  };
}

/** 次要按鈕 — neutral-100 底 + 黑字（致電店家） */
function secondaryButton(label: string, uri: string): Record<string, unknown> {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: NEUTRAL_100,
    cornerRadius: "lg",
    paddingAll: "14px",
    action: {
      type: "uri",
      label,
      uri,
    },
    contents: [
      {
        type: "text",
        text: label,
        color: SLATE_900,
        weight: "bold",
        size: "sm",
        align: "center",
        wrap: false,
        maxLines: 1,
      },
    ],
  };
}

/** Plain text fallback shown in chat list / push preview. */
export function buildBookingAltText(
  kind: LineNotifyKind,
  vars: FlexBookingVars,
): string {
  const meta = META[kind];
  return `[${meta.statusLabel}] ${vars.shopName} ${vars.bookingCode}：${vars.checkInDate} → ${vars.checkOutDate}`;
}

function row(
  label: string,
  value: string,
  valueColor = SLATE_900,
  bold = false,
): Record<string, unknown> {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    contents: [
      {
        type: "text",
        text: label,
        color: SLATE_400,
        size: "sm",
        flex: 2,
      },
      {
        type: "text",
        text: value,
        color: valueColor,
        weight: bold ? "bold" : "regular",
        size: "sm",
        flex: 5,
        wrap: true,
        align: "end",
      },
    ],
  };
}

// Suppress lint for SLATE_500 — kept for callers that may want subtle copy
void SLATE_500;

// =====================================================================
// Stay log push — 「店家報平安」訊息
//
// Hero 用第一張照片（cover）；body 顯示寵物名 + 店家名 + 文字 note；
// 若超過 1 張照片，組成 Flex carousel：第 1 個 bubble 為主訊息（hero +
// body + footer CTA），第 2..N 個 bubble 為純照片 bubble，讓家長可以
// 滑動瀏覽。
// =====================================================================

export interface FlexStayLogVars {
  shopName: string;
  petName: string;
  guestName: string;
  bookingCode: string;
  /** 至少 1 張；超過 1 張會自動組 carousel */
  photoUrls: string[];
  /** 店家寫的文字 note（可空） */
  note?: string | null;
  /** 點擊 CTA 跳到的訂單頁網址 */
  detailUrl?: string;
  /** 拍攝時間（ISO string）— 用於 footer 顯示 */
  takenAt?: string;
}

function fmtTakenAt(iso: string): string {
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

/** 主 bubble：hero 照片 + body 文字 + CTA。 */
function buildStayLogPrimaryBubble(
  vars: FlexStayLogVars,
): Record<string, unknown> {
  const cover = vars.photoUrls[0];
  const bodyContents: Record<string, unknown>[] = [
    {
      type: "text",
      text: `${vars.petName} 報平安`,
      weight: "bold",
      size: "lg",
      color: SLATE_900,
      wrap: true,
    },
    {
      type: "text",
      text: `來自 ${vars.shopName}`,
      size: "xs",
      color: SLATE_500,
      margin: "xs",
    },
  ];

  if (vars.note && vars.note.trim()) {
    bodyContents.push({
      type: "separator",
      color: SLATE_200,
      margin: "md",
    });
    bodyContents.push({
      type: "text",
      text: vars.note.trim(),
      size: "sm",
      color: SLATE_900,
      wrap: true,
      margin: "md",
    });
  }

  if (vars.takenAt) {
    bodyContents.push({
      type: "text",
      text: fmtTakenAt(vars.takenAt),
      size: "xs",
      color: SLATE_400,
      margin: "md",
      align: "end",
    });
  }

  const footerButtons: Record<string, unknown>[] = [];
  if (vars.detailUrl) {
    footerButtons.push(primaryButton("查看訂單詳情", vars.detailUrl));
  }

  const bubble: Record<string, unknown> = {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "sm",
      contents: bodyContents,
    },
  };

  if (cover) {
    bubble.hero = {
      type: "image",
      url: cover,
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
    };
  }

  if (footerButtons.length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "16px",
      paddingTop: "0px",
      contents: footerButtons,
    };
  }

  return bubble;
}

/** 額外照片 bubble — 只有一張全幅照片。 */
function buildStayLogPhotoBubble(url: string): Record<string, unknown> {
  return {
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url,
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
    },
  };
}

/**
 * 回傳適合直接放進 Flex message contents 的物件。
 * 1 張照片 → 單一 bubble；多張 → carousel。
 */
export function buildStayLogContents(
  vars: FlexStayLogVars,
): Record<string, unknown> {
  const primary = buildStayLogPrimaryBubble(vars);
  const extras = vars.photoUrls.slice(1, 10).map(buildStayLogPhotoBubble);
  if (extras.length === 0) return primary;
  return {
    type: "carousel",
    contents: [primary, ...extras],
  };
}

/** Plain text fallback shown in chat list / push preview. */
export function buildStayLogAltText(vars: FlexStayLogVars): string {
  const noteSnippet =
    vars.note && vars.note.trim()
      ? `：${vars.note.trim().slice(0, 40)}`
      : "";
  return `[${vars.shopName}] ${vars.petName} 報平安${noteSnippet}`;
}
