// LINE Flex Message bubble builders for booking lifecycle events.
//
// 設計：對標 inline 訂位通知卡片
//   - hero 區為「商家封面圖」，狀態 pill 浮在左上角；店名 + 地址疊在
//     圖底部漸層上（白字）
//   - body 為純資訊欄位（訂單編號 / 入住 / 退房 / 夜數 / 房型 / 寵物 /
//     費用），標籤淺灰、值深色，費用以 brand teal 強調
//   - footer 為兩個堆疊的軟調按鈕（teal-100 底 + teal-700 字），
//     主 CTA 在上、致電店家在下
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

// Brand teal — 跟前端後台 .btn-primary / 主色一致 (#0d9488 / #0f766e)
const TEAL_700 = "#0F766E";
const TEAL_100 = "#CCFBF1";
const SLATE_900 = "#0F172A";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_200 = "#E2E8F0";

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
  // 狀態 pill — 不設 offsetEnd，box 寬度會自動 fit 內容
  const pill: Record<string, unknown> = {
    type: "box",
    layout: "vertical",
    position: "absolute",
    offsetTop: "12px",
    offsetStart: "12px",
    backgroundColor: TEAL_100,
    cornerRadius: "md",
    paddingTop: "5px",
    paddingBottom: "5px",
    paddingStart: "10px",
    paddingEnd: "10px",
    contents: [
      {
        type: "text",
        text: statusLabel,
        color: TEAL_700,
        weight: "bold",
        size: "xs",
      },
    ],
  };

  // 店名 + 地址 — 底部半透明黑底（仿 inline 漸層效果，但用單一 box 更穩定）
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

  // Fallback：沒有封面圖 → 用 teal 底色 + 大字店名（避免空 image url 被拒）
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: TEAL_700,
    paddingAll: "0px",
    height: "150px",
    contents: [pill, titleBar],
  };
}

/** Body：訂單編號 + 6 個 row 資料表，跟 inline 排版一樣 label 淺、值深 */
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
      row("費用", fmtMoney(vars.totalPrice), TEAL_700, true),
    ],
  };
}

/** Footer：兩顆堆疊的「軟調 teal」按鈕 — 主 CTA + 致電店家 */
function buildFooter(
  ctaLabel: string,
  vars: FlexBookingVars,
): Record<string, unknown> | undefined {
  const buttons: Record<string, unknown>[] = [];

  if (vars.detailUrl) {
    buttons.push(softButton(ctaLabel, vars.detailUrl));
  }
  if (vars.shopPhone) {
    buttons.push(
      softButton(`致電店家 ${vars.shopPhone}`, `tel:${vars.shopPhone}`),
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

/** Inline-style soft pill button: teal-100 底 + teal-700 字 */
function softButton(label: string, uri: string): Record<string, unknown> {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: TEAL_100,
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
        color: TEAL_700,
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
