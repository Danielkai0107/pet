import { History } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { LiffGate } from "@/liff/components/LiffGate";
import { LiffHeader } from "@/liff/components/LiffHeader";
import { useLineOrders } from "@/liff/hooks/useLineOrders";
import { BookingCard } from "@/liff/components/BookingCard";

function HistoryContent() {
  const { bookings, loading } = useLineOrders("history");

  return (
    <div className="bg-white pb-12">
      <LiffHeader
        title="歷史紀錄"
        description="已退房 / 已取消的訂單"
      />

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Spinner />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-card border border-neutral-200">
            <EmptyState
              icon={History}
              title="尚無歷史紀錄"
              description="退房或取消後的訂單會顯示在這裡。"
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

export function LiffHistoryPage() {
  return (
    <LiffGate>
      <HistoryContent />
    </LiffGate>
  );
}
