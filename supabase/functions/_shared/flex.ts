// LINE Flex Message bubble builders for booking lifecycle events.
//
// All bubbles share the same body skeleton (店家 / 寵物 / 入住 / 退房 / 房型 /
// 費用) and differ only in the header colour + status label + headline copy
// + footer CTA. This keeps the visual language consistent across all six
// states the customer might receive.

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
  /** Solid hex used for the header bar. */
  headerColor: string;
  /** Status badge text shown in the header. */
  statusLabel: string;
  /** Big H1 sentence in the body. */
  headline: string;
  /** Small grey paragraph under the headline. */
  subline: string;
  /** Footer button label. */
  cta: string;
}

const META: Record<LineNotifyKind, KindMeta> = {
  booking_received: {
    headerColor: "#0EA5E9",
    statusLabel: "預約已送出",
    headline: "我們已收到您的預約申請",
    subline: "店家確認後會再通知您，請耐心稍候。",
    cta: "查看我的訂單",
  },
  booking_confirmed: {
    headerColor: "#16A34A",
    statusLabel: "預約已確認",
    headline: "店家已確認您的預約",
    subline: "請於入住當天攜帶寵物的疫苗證明與飼料，期待相見！",
    cta: "查看訂單詳情",
  },
  booking_declined: {
    headerColor: "#DC2626",
    statusLabel: "預約未受理",
    headline: "很抱歉，店家無法接受此預約",
    subline: "可能是該時段已客滿。歡迎改選其他日期或其他旅館。",
    cta: "找其他旅館",
  },
  booking_cancelled: {
    headerColor: "#64748B",
    statusLabel: "預約已取消",
    headline: "您的預約已取消",
    subline: "如有需要，歡迎隨時再次預約。",
    cta: "再次預約",
  },
  booking_reminder: {
    headerColor: "#F59E0B",
    statusLabel: "明天入住提醒",
    headline: "別忘了，明天就要入住囉！",
    subline: "請攜帶寵物的疫苗證明、飼料與隨身用品。",
    cta: "查看訂單",
  },
  checked_in: {
    headerColor: "#A855F7",
    statusLabel: "已入住",
    headline: "已成功入住",
    subline: "我們會悉心照顧您的寶貝，有任何訊息會主動通知您。",
    cta: "查看訂單",
  },
  checked_out: {
    headerColor: "#D97706",
    statusLabel: "退房完成",
    headline: "感謝您本次的光顧！",
    subline: "希望這次的住宿體驗讓您與毛孩都滿意，期待再次相見。",
    cta: "再次預約",
  },
};

function fmtDate(iso: string): string {
  // Render as YYYY/MM/DD (週X) — pure string ops, no date-fns in Deno.
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

  const detailButton: Record<string, unknown> | null = vars.detailUrl
    ? {
        type: "button",
        style: "primary",
        height: "sm",
        color: meta.headerColor,
        action: {
          type: "uri",
          label: meta.cta,
          uri: vars.detailUrl,
        },
      }
    : null;

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: meta.headerColor,
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: meta.statusLabel,
          color: "#FFFFFF",
          weight: "bold",
          size: "sm",
        },
        {
          type: "text",
          text: vars.shopName,
          color: "#FFFFFF",
          weight: "bold",
          size: "xl",
          margin: "sm",
          wrap: true,
        },
        {
          type: "text",
          text: `訂單 ${vars.bookingCode}`,
          color: "#FFFFFFCC",
          size: "xs",
          margin: "sm",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: meta.headline,
          weight: "bold",
          size: "md",
          color: "#0F172A",
          wrap: true,
        },
        {
          type: "text",
          text: meta.subline,
          size: "xs",
          color: "#64748B",
          wrap: true,
          margin: "sm",
        },
        { type: "separator", margin: "lg" },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          margin: "md",
          contents: [
            row("入住", fmtDate(vars.checkInDate)),
            row("退房", fmtDate(vars.checkOutDate)),
            row("夜數", `${vars.nights} 晚`),
            row("房型", vars.roomName),
            row("寵物", vars.petName),
            row("費用", fmtMoney(vars.totalPrice), "#0EA5E9", true),
          ],
        },
      ],
    },
    footer: detailButton
      ? {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "lg",
          contents: [detailButton],
        }
      : undefined,
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
  valueColor = "#0F172A",
  bold = false,
): Record<string, unknown> {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: label,
        color: "#94A3B8",
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
      },
    ],
  };
}
