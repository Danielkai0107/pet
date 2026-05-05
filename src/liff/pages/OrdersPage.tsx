import { Link } from "react-router-dom";
import { Calendar, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { LiffGate } from "@/liff/components/LiffGate";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";
import { useLineOrders } from "@/liff/hooks/useLineOrders";
import { BookingCard } from "@/liff/components/BookingCard";

function OrdersContent() {
  const { customer } = useLiffAuth();
  const { bookings, loading } = useLineOrders("active");

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // No customer yet OR has no email (not bound) -> push them to bind page
  const needsBinding = !customer?.email && bookings.length === 0;

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-slate-900">我的訂單</h1>
      <p className="mt-1 text-sm text-slate-500">
        進行中與待確認的預約
      </p>

      {needsBinding ? (
        <div className="card mt-4 p-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            尚未綁定您的訂單
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            輸入預約時填寫的 Email，過去與未來的訂單都會自動歸戶到此 LINE 帳號。
          </p>
          <Link to="/liff/bind" className="btn-primary mt-4 inline-flex">
            開始綁定
          </Link>
        </div>
      ) : bookings.length === 0 ? (
        <div className="card mt-4">
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
        <div className="mt-4 space-y-3">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
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
