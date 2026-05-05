import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { LINE_ADD_FRIEND_URL, PLATFORM_NAME } from "@/lib/constants";
import { useRoutePrefix } from "@/lib/useRoutePrefix";

export function BookingSuccessPage() {
  const { code } = useParams();
  const { isLiff } = useRoutePrefix();
  return (
    <div
      className={
        "mx-auto max-w-md px-4 py-16" +
        (isLiff ? " pt-[max(env(safe-area-inset-top),64px)]" : "")
      }
    >
      <div className="text-center">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-brand-500"
          strokeWidth={1.5}
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
          已收到您的預約
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          訂單編號
          <span className="ml-1.5 font-mono font-semibold text-neutral-900">
            {code}
          </span>
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-600">
          {isLiff
            ? "店家確認後會推播 LINE 通知您。可在「我的訂單」追蹤狀態。"
            : "店家收到通知後會盡快確認，確認結果會以 Email 通知您。"}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {isLiff ? (
            <>
              <Link
                to={`/liff/booking/${code}`}
                className="btn-primary w-full justify-center"
              >
                查看訂單詳情
              </Link>
              <Link
                to="/liff"
                className="btn-secondary w-full justify-center"
              >
                我的所有訂單
              </Link>
            </>
          ) : (
            <>
              <Link
                to={`/booking/${code}`}
                className="btn-primary w-full justify-center"
              >
                查看訂單詳情
              </Link>
              {LINE_ADD_FRIEND_URL && (
                <a
                  href={LINE_ADD_FRIEND_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full justify-center"
                >
                  加入 {PLATFORM_NAME} LINE 追蹤訂單
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
