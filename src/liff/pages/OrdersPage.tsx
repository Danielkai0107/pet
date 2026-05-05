import { Link } from "react-router-dom";
import { Calendar, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { LiffGate } from "@/liff/components/LiffGate";
import { LiffHeader } from "@/liff/components/LiffHeader";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";
import { useLineOrders } from "@/liff/hooks/useLineOrders";
import { BookingCard } from "@/liff/components/BookingCard";

function OrdersContent() {
  const { customer } = useLiffAuth();
  const { bookings, loading } = useLineOrders("active");

  // No customer yet OR has no email (not bound) -> push them to bind page
  const needsBinding = !customer?.email && bookings.length === 0;

  return (
    <div className="bg-white pb-12">
      <LiffHeader
        title="我的訂單"
        description="進行中與待確認的預約"
      />

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Spinner />
          </div>
        ) : needsBinding ? (
          <div className="rounded-card border border-neutral-200 p-6 text-center">
            <ShieldCheck
              className="mx-auto mb-3 h-8 w-8 text-neutral-400"
              strokeWidth={1.5}
            />
            <h2 className="text-base font-semibold text-neutral-900">
              尚未綁定您的訂單
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
              輸入預約時填寫的 Email，過去與未來的訂單都會自動歸戶到此 LINE
              帳號。
            </p>
            <Link to="/liff/bind" className="btn-primary mt-4 inline-flex">
              開始綁定
            </Link>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-card border border-neutral-200">
            <EmptyState
              icon={Calendar}
              title="目前沒有進行中的訂單"
              description="有新訂單時會出現在這裡，並推播 LINE 通知。"
              action={
                <Link to="/liff/discover" className="btn-primary">
                  找寵物旅館
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LiffOrdersPage() {
  return (
    <LiffGate>
      <OrdersContent />
    </LiffGate>
  );
}
