// Default email templates used when a shop hasn't customised one.
export type NotificationKind =
  | "booking_received"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_reminder"
  | "booking_cancelled";

interface Tpl {
  subject: string;
  body: string;
}

export const DEFAULT_TEMPLATES: Record<NotificationKind, Tpl> = {
  booking_received: {
    subject: "【{{shop_name}}】已收到您的預約 {{booking_code}}",
    body:
      "您好 {{guest_name}}：\n\n我們已收到您的預約申請，正在處理中：\n\n" +
      "訂單編號：{{booking_code}}\n寵物：{{pet_name}}\n入住：{{check_in_date}}\n退房：{{check_out_date}}\n房型：{{room_name}}\n\n" +
      "我們會盡快與您聯繫確認，謝謝！\n\n— {{shop_name}}",
  },
  booking_confirmed: {
    subject: "【{{shop_name}}】預約已確認 {{booking_code}}",
    body:
      "您好 {{guest_name}}：\n\n您的預約已確認！\n\n" +
      "訂單編號：{{booking_code}}\n寵物：{{pet_name}}\n入住：{{check_in_date}}\n退房：{{check_out_date}}\n房型：{{room_name}}\n費用：NT$ {{total_price}}\n\n" +
      "加入我們的官方 LINE 即可隨時追蹤訂單狀態：\n{{line_add_friend_url}}\n\n期待迎接 {{pet_name}}！\n\n— {{shop_name}}",
  },
  booking_declined: {
    subject: "【{{shop_name}}】關於您的預約 {{booking_code}}",
    body:
      "您好 {{guest_name}}：\n\n很抱歉，您預約的時段目前已客滿，無法接受預約。\n\n" +
      "訂單編號：{{booking_code}}\n入住：{{check_in_date}}\n退房：{{check_out_date}}\n\n" +
      "歡迎您改選其他日期再次預約。\n\n— {{shop_name}}",
  },
  booking_reminder: {
    subject: "【{{shop_name}}】明天入住提醒 {{booking_code}}",
    body:
      "您好 {{guest_name}}：\n\n提醒您，{{pet_name}} 將於明天入住：\n\n" +
      "入住：{{check_in_date}}\n房型：{{room_name}}\n\n" +
      "請別忘了攜帶疫苗證明與飼料，明天見！\n\n— {{shop_name}}",
  },
  booking_cancelled: {
    subject: "【{{shop_name}}】預約已取消 {{booking_code}}",
    body:
      "您好 {{guest_name}}：\n\n您的預約已取消：\n\n" +
      "訂單編號：{{booking_code}}\n原預訂入住：{{check_in_date}}\n\n" +
      "如有需要，歡迎隨時再次預約。\n\n— {{shop_name}}",
  },
};

export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
