import { Modal } from "@/components/Modal";
import { BookingDetailContent } from "@/shop/components/BookingDetailContent";

interface Props {
  /** 預約 ID；為 null 時不渲染 */
  bookingId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

/**
 * 把 BookingDetailContent 包進 Modal，做為 popup 詳情。
 * 用於今日頁與預約管理頁；點擊列表項即開。
 */
export function BookingDetailModal({ bookingId, onClose, onChanged }: Props) {
  return (
    <Modal
      open={bookingId !== null}
      onClose={onClose}
      title="預約詳情"
      size="xl"
    >
      {bookingId && (
        <BookingDetailContent
          bookingId={bookingId}
          onChanged={onChanged}
        />
      )}
    </Modal>
  );
}
