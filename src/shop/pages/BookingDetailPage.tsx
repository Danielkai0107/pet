import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BookingDetailContent } from "@/shop/components/BookingDetailContent";

/**
 * 預約詳情整頁（保留路由 /shop/bookings/:id 給 email / LINE 連結深連結）。
 * 一般操作流程改在「今日」與「預約管理」頁的 popup（BookingDetailModal）內完成。
 */
export function ShopBookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-sm text-neutral-500">
        找不到這筆預約
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button
        onClick={() => navigate("/shop/bookings")}
        className="btn-ghost mb-3 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        回預約列表
      </button>

      <BookingDetailContent bookingId={id} />
    </div>
  );
}
