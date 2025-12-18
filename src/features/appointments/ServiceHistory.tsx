import { useLineAuth } from "../../contexts/LineAuthProvider";
import { useAppointments } from "../../hooks/useAppointments";
import liff from "@line/liff";

export const ServiceHistory = () => {
  const { user, shopId } = useLineAuth();
  const { useUserAppointments, updateAppointmentStatus } = useAppointments();

  // Multi-Tenant: shopId 由 LIFF ID 自動識別
  const { appointments } = useUserAppointments(user?.uid, shopId || undefined);

  if (!user) return null;

  const handleCancel = async (appointment: any) => {
    if (!confirm("確定要取消此預約嗎？")) return;

    try {
      await updateAppointmentStatus(
        appointment.id,
        "cancelled",
        appointment.shopId
      );

      // 取消成功後發送訊息並關閉視窗
      if (liff.isInClient()) {
        try {
          // 發送取消訊息到聊天室（免費，不計入配額）
          await liff.sendMessages([
            {
              type: "text",
              text: `【預約已取消】\n\n日期：${appointment.date}\n時間：${appointment.time}\n服務：${appointment.serviceType}\n\n您的預約已成功取消。`,
            },
          ]);
        } catch (msgError) {
          // Ignore message failure, proceed to close
        } finally {
          liff.closeWindow();
        }
      } else {
        alert("預約已取消");
      }
    } catch (error) {
      alert("取消失敗，請稍後再試");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="status-badge status-confirmed">已確認</span>;
      case "cancelled":
        return <span className="status-badge status-cancelled">已取消</span>;
      case "completed":
        return <span className="status-badge status-completed">已完成</span>;
      default:
        return <span className="status-badge status-pending">待確認</span>;
    }
  };

  const activeAppointments = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed"
  );

  const renderAppointmentCard = (apt: any) => (
    <div key={apt.id} className="appointment-card">
      <div className="card-content">
        <div className="card-header">
          <div className="date-time">
            {apt.date} {apt.time}
          </div>
          <div className="service-type">{apt.serviceType}</div>
          {apt.petName && <div className="pet-name">{apt.petName}</div>}
        </div>

        <div className="card-actions">
          {getStatusBadge(apt.status)}
          {(apt.status === "pending" || apt.status === "confirmed") && (
            <button onClick={() => handleCancel(apt)} className="cancel-button">
              取消預約
            </button>
          )}
        </div>
      </div>

      {apt.notes && <div className="notes-section">備註：{apt.notes}</div>}
      {/* {apt.shopId && !shopId && (
        <div className="shop-id">服務店家：{apt.shopId}</div>
      )} */}
    </div>
  );

  return (
    <div className="service-history-container">
      {/* Active Appointments Section */}
      <div>
        <h2 className="section-title">進行中的預約</h2>
        <div className="appointments-list">
          {activeAppointments.map(renderAppointmentCard)}
          {activeAppointments.length === 0 && (
            <div className="empty-state">
              <p>目前沒有進行中的預約</p>
            </div>
          )}
        </div>
      </div>

      {/* History Section - 暫時隱藏 */}
      {/* <div>
        <h2 className="section-title section-title-history">歷史紀錄</h2>
        <div className="appointments-list history-list">
          {historyAppointments.map(renderAppointmentCard)}
          {historyAppointments.length === 0 && (
            <div className="empty-state history-empty">
              <p>尚無歷史紀錄</p>
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
};
