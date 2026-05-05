import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Mail, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { NotificationKind, NotificationTemplate } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";

// Subset of NotificationKind that maps to editable email templates.
// `checked_in` / `checked_out` are LINE-only push events so they don't
// appear here.
type EmailKind = Exclude<NotificationKind, "checked_in" | "checked_out">;

const KIND_LABEL: Record<EmailKind, string> = {
  booking_received: "預約收到（自動寄給消費者）",
  booking_confirmed: "預約已確認（您按下確認時寄出）",
  booking_declined: "預約已拒絕（您按下拒絕時寄出）",
  booking_reminder: "入住提醒（入住前一天寄出）",
  booking_cancelled: "預約已取消",
};

interface DefaultTemplate {
  subject: string;
  body: string;
}

const DEFAULTS: Record<EmailKind, DefaultTemplate> = {
  booking_received: {
    subject: "【{{shop_name}}】已收到您的預約 {{booking_code}}",
    body: `您好 {{guest_name}}：

我們已收到您的預約申請，正在處理中：

訂單編號：{{booking_code}}
寵物：{{pet_name}}
入住：{{check_in_date}}
退房：{{check_out_date}}
房型：{{room_name}}

我們會盡快與您聯繫確認，謝謝！

— {{shop_name}}`,
  },
  booking_confirmed: {
    subject: "【{{shop_name}}】預約已確認 {{booking_code}}",
    body: `您好 {{guest_name}}：

您的預約已確認！

訂單編號：{{booking_code}}
寵物：{{pet_name}}
入住：{{check_in_date}}
退房：{{check_out_date}}
房型：{{room_name}}
費用：NT$ {{total_price}}

加入我們的官方 LINE 即可隨時追蹤訂單狀態：
{{line_add_friend_url}}

期待迎接 {{pet_name}}！

— {{shop_name}}`,
  },
  booking_declined: {
    subject: "【{{shop_name}}】關於您的預約 {{booking_code}}",
    body: `您好 {{guest_name}}：

很抱歉，您預約的時段目前已客滿，無法接受預約。

訂單編號：{{booking_code}}
入住：{{check_in_date}}
退房：{{check_out_date}}

歡迎您改選其他日期再次預約，造成不便敬請見諒。

— {{shop_name}}`,
  },
  booking_reminder: {
    subject: "【{{shop_name}}】明天入住提醒 {{booking_code}}",
    body: `您好 {{guest_name}}：

提醒您，{{pet_name}} 將於明天入住：

入住：{{check_in_date}}
房型：{{room_name}}

請別忘了攜帶疫苗證明與飼料，我們明天見！

— {{shop_name}}`,
  },
  booking_cancelled: {
    subject: "【{{shop_name}}】預約已取消 {{booking_code}}",
    body: `您好 {{guest_name}}：

您的預約已取消：

訂單編號：{{booking_code}}
原預訂入住：{{check_in_date}}

如有需要，歡迎隨時再次預約。

— {{shop_name}}`,
  },
};

const KINDS: EmailKind[] = [
  "booking_received",
  "booking_confirmed",
  "booking_declined",
  "booking_reminder",
  "booking_cancelled",
];

const VARIABLES = [
  "{{shop_name}}",
  "{{booking_code}}",
  "{{guest_name}}",
  "{{pet_name}}",
  "{{room_name}}",
  "{{check_in_date}}",
  "{{check_out_date}}",
  "{{total_price}}",
  "{{nights}}",
  "{{booking_detail_url}}",
  "{{line_add_friend_url}}",
];

export function ShopTemplatesPage() {
  const { shop } = useShopAuth();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKind, setActiveKind] = useState<EmailKind>("booking_received");
  const [draft, setDraft] = useState<{ subject: string; body: string }>({
    subject: "",
    body: "",
  });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    if (!shop) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("shop_id", shop.id);
    setLoading(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    setTemplates((data ?? []) as NotificationTemplate[]);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  const current = useMemo(
    () => templates.find((t) => t.kind === activeKind) ?? null,
    [templates, activeKind],
  );

  useEffect(() => {
    if (current) {
      setDraft({ subject: current.subject, body: current.body });
    } else {
      const def = DEFAULTS[activeKind];
      setDraft({ subject: def.subject, body: def.body });
    }
  }, [current, activeKind]);

  const save = async () => {
    if (!shop) return;
    setSaving(true);
    const { error } = await supabase.from("notification_templates").upsert(
      {
        shop_id: shop.id,
        kind: activeKind,
        subject: draft.subject,
        body: draft.body,
        is_default: false,
      },
      { onConflict: "shop_id,kind" },
    );
    setSaving(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("已儲存");
    await reload();
  };

  const reset = () => {
    const def = DEFAULTS[activeKind];
    setDraft({ subject: def.subject, body: def.body });
    toast.success("已恢復為預設模板（尚未儲存）");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Email 模板"
        description="自訂寄給消費者的通知信。可使用變數，發信時自動代入。"
      />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="card p-2">
          {KINDS.map((k) => {
            const t = templates.find((x) => x.kind === k);
            return (
              <button
                key={k}
                onClick={() => setActiveKind(k)}
                className={
                  "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors " +
                  (activeKind === k
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-slate-50")
                }
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{KIND_LABEL[k].split("（")[0]}</p>
                  <p className="text-xs text-slate-500">
                    {t ? "已自訂" : "使用預設"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="card p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                {KIND_LABEL[activeKind]}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label">主旨</label>
                  <input
                    className="input"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">內文</label>
                  <textarea
                    rows={14}
                    className="input font-mono text-sm leading-relaxed"
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    可用變數（點擊複製）
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          void navigator.clipboard?.writeText(v);
                          toast.success(`已複製 ${v}`);
                        }}
                        className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <button className="btn-ghost" onClick={reset}>
                  <RefreshCw className="h-4 w-4" />
                  恢復預設
                </button>
                <button className="btn-primary" onClick={save} disabled={saving}>
                  {saving && <Spinner size="sm" />}
                  儲存模板
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
