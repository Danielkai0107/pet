import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { LINE_ADD_FRIEND_URL, PLATFORM_NAME } from "@/lib/constants";
import { useRoutePrefix } from "@/lib/useRoutePrefix";

export function BookingSuccessPage() {
  const { code } = useParams();
  const { isLiff } = useRoutePrefix();
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">已收到您的預約</h1>
        <p className="mt-2 text-sm text-slate-600">
          訂單編號：
          <span className="font-mono font-semibold text-brand-700">{code}</span>
        </p>
        <p className="mt-4 text-sm text-slate-600">
          {isLiff
            ? "店家確認後會推播 LINE 通知您。可在「我的訂單」追蹤狀態。"
            : "店家收到通知後會盡快確認，確認結果會以 Email 通知您。"}
        </p>

        {isLiff ? (
          <>
            <Link
              to={`/liff/booking/${code}`}
              className="btn-primary mt-6 w-full"
            >
              查看訂單詳情
            </Link>
            <Link to="/liff" className="btn-ghost mt-2 w-full">
              我的所有訂單
            </Link>
          </>
        ) : (
          <>
            <Link to={`/booking/${code}`} className="btn-primary mt-6 w-full">
              查看訂單詳情
            </Link>
            {LINE_ADD_FRIEND_URL && (
              <a
                href={LINE_ADD_FRIEND_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost mt-2 w-full"
              >
                加入 {PLATFORM_NAME} LINE 追蹤訂單
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
