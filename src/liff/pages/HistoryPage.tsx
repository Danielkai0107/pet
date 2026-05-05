import { History } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { LiffGate } from "@/liff/components/LiffGate";
import { useLineOrders } from "@/liff/hooks/useLineOrders";
import { BookingCard } from "@/liff/components/BookingCard";

function HistoryContent() {
  const { bookings, loading } = useLineOrders("history");

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-slate-900">歷史紀錄</h1>
      <p className="mt-1 text-sm text-slate-500">已退房 / 已取消的訂單</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : bookings.length === 0 ? (
        <div className="card mt-4">
          <EmptyState icon={History} title="尚無歷史紀錄" />
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

export function LiffHistoryPage() {
  return (
    <LiffGate>
      <HistoryContent />
    </LiffGate>
  );
}
