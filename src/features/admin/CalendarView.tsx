import { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  FileText,
  Check,
  X,
  Bell,
} from "lucide-react";
import type { Appointment } from "../../types/appointment";
import { useAppointments } from "../../hooks/useAppointments";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { LazyImage } from "../../components/LazyImage";
import { CustomerRemindersPopup } from "./CustomerRemindersPopup";
import { ImagePreviewModal } from "../../components/ImagePreviewModal";

interface CalendarViewProps {
  appointments: Appointment[];
  selectedMonth: string; // Format: "2024-12"
  selectedDate: string; // Format: "2024-12-15" or empty string for whole month
  statusFilter: string;
}

interface ServiceReport {
  tempReportImage?: string;
  tempReportMessage?: string;
  completionImage?: string;
  completionMessage?: string;
  serviceNotes?: string;
}

interface SendRecord {
  id: string;
  type: "temp-report" | "completion";
  imageUrl: string | null;
  message: string | null;
  timestamp: any;
}

export const CalendarView = ({
  appointments,
  selectedMonth,
  selectedDate,
  statusFilter,
}: CalendarViewProps) => {
  const { updateAppointmentStatus } = useAppointments();
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(
    null
  );
  const [tempReportRecords, setTempReportRecords] = useState<SendRecord[]>([]);
  const [completionRecords, setCompletionRecords] = useState<SendRecord[]>([]);

  // 收合狀態
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isCancelledExpanded, setIsCancelledExpanded] = useState(false);

  // 婉拒原因狀態
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 顧客注記狀態
  const [showReminders, setShowReminders] = useState(false);

  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 當 appointments 更新時，同步更新 selectedAppointment
  useEffect(() => {
    if (selectedAppointment) {
      const updated = appointments.find(
        (apt) => apt.id === selectedAppointment.id
      );
      if (updated) {
        setSelectedAppointment(updated);
      }
    }
  }, [appointments]);

  // 載入服務紀錄和發送紀錄
  useEffect(() => {
    const loadServiceData = async () => {
      if (!selectedAppointment) {
        setServiceReport(null);
        setTempReportRecords([]);
        setCompletionRecords([]);
        return;
      }

      try {
        // 載入服務紀錄
        const reportRef = doc(
          db,
          "shops",
          selectedAppointment.shopId,
          "serviceReports",
          selectedAppointment.id
        );
        const reportSnap = await getDoc(reportRef);

        if (reportSnap.exists()) {
          setServiceReport(reportSnap.data() as ServiceReport);
        } else {
          setServiceReport(null);
        }

        // 載入臨時回報紀錄
        const tempReportsRef = collection(
          db,
          "shops",
          selectedAppointment.shopId,
          "serviceReports",
          selectedAppointment.id,
          "tempReports"
        );
        const tempReportsQuery = query(
          tempReportsRef,
          orderBy("timestamp", "desc")
        );
        const tempReportsSnapshot = await getDocs(tempReportsQuery);

        const tempRecords: SendRecord[] = [];
        tempReportsSnapshot.forEach((doc) => {
          tempRecords.push({
            id: doc.id,
            type: "temp-report",
            ...doc.data(),
          } as SendRecord);
        });
        setTempReportRecords(tempRecords);

        // 載入完成分享紀錄
        const completionsRef = collection(
          db,
          "shops",
          selectedAppointment.shopId,
          "serviceReports",
          selectedAppointment.id,
          "completions"
        );
        const completionsQuery = query(
          completionsRef,
          orderBy("timestamp", "desc")
        );
        const completionsSnapshot = await getDocs(completionsQuery);

        const compRecords: SendRecord[] = [];
        completionsSnapshot.forEach((doc) => {
          compRecords.push({
            id: doc.id,
            type: "completion",
            ...doc.data(),
          } as SendRecord);
        });
        setCompletionRecords(compRecords);
      } catch (error) {
        console.error("載入服務紀錄失敗:", error);
        setServiceReport(null);
        setTempReportRecords([]);
        setCompletionRecords([]);
      }
    };

    loadServiceData();
  }, [selectedAppointment]);

  const handleStatusUpdate = async (
    id: string,
    status: Appointment["status"],
    shopId: string
  ) => {
    const statusText =
      status === "confirmed"
        ? "已確認"
        : status === "completed"
        ? "已完成"
        : status === "cancelled"
        ? "已取消"
        : "待確認";

    if (confirm(`確定要將狀態更改為 ${statusText} 嗎？`)) {
      try {
        await updateAppointmentStatus(id, status, shopId);
        // 狀態變化會自動觸發對應的通知（通過 Cloud Functions 監聽器）
      } catch (error) {
        alert("狀態更新失敗，請稍後再試");
      }
    }
  };

  // 處理婉拒預約
  const handleDeclineAppointment = async (id: string, shopId: string) => {
    // 驗證必須輸入原因
    if (!declineReason.trim()) {
      alert("請輸入婉拒原因");
      return;
    }

    setIsSubmitting(true);
    try {
      const functionUrl =
        "https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/declineAppointment";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          appointmentId: id,
          reason: declineReason.trim(),
        }),
      });

      if (response.ok) {
        alert("已婉拒預約並通知客戶");
        // 重置狀態
        setShowDeclineInput(false);
        setDeclineReason("");
      } else {
        const errorData = await response.json();
        console.error("婉拒預約失敗:", errorData);
        alert("婉拒預約失敗，請稍後再試");
      }
    } catch (error) {
      console.error("婉拒預約時發生錯誤:", error);
      alert("婉拒預約失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 取消婉拒
  const handleCancelDecline = () => {
    setShowDeclineInput(false);
    setDeclineReason("");
  };

  // 處理服務完成通知
  const handleServiceCompletion = async (id: string, shopId: string) => {
    if (
      !confirm(
        "確定要發送服務完成通知嗎？\n\n此操作會同時將預約標記為已完成，且不可逆！"
      )
    )
      return;

    try {
      const functionUrl =
        "https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/sendServiceCompletionNotification";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, appointmentId: id }),
      });

      if (response.ok) {
        alert("服務完成通知已發送，預約已標記為已完成！");
      } else {
        const errorData = await response.json();
        console.error("服務完成通知發送失敗:", errorData);
        alert("通知發送失敗，請稍後再試");
      }
    } catch (error) {
      console.error("發送服務完成通知時發生錯誤:", error);
      alert("通知發送失敗，請稍後再試");
    }
  };

  // Format month for display
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${year} 年 ${parseInt(month)} 月`;
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${year} / ${month} / ${day}`;
  };

  // Get display text for date header
  const getDateText = () => {
    if (selectedDate) {
      return formatDateDisplay(selectedDate);
    } else if (selectedMonth) {
      return formatMonthDisplay(selectedMonth);
    }
    return "請選擇月份";
  };

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "border-green";
      case "cancelled":
        return "border-red";
      case "completed":
        return "border-blue";
      default:
        return "border-yellow";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="status-badge badge-green">已確認</span>;
      case "cancelled":
        return <span className="status-badge badge-red">已取消</span>;
      case "completed":
        return <span className="status-badge badge-blue">已完成</span>;
      default:
        return <span className="status-badge badge-yellow">待確認</span>;
    }
  };

  // 獲取顯示的預約（根據選中的月份或日期）- 分組顯示
  const { activeAppointments, completedAppointments, cancelledAppointments } =
    useMemo(() => {
      let filtered = appointments;

      // 如果選擇了特定日期，只顯示該日期的預約
      if (selectedDate) {
        filtered = filtered.filter((apt) => apt.date === selectedDate);
      }
      // 否則顯示整個月的預約
      else if (selectedMonth) {
        filtered = filtered.filter((apt) => apt.date.startsWith(selectedMonth));
      }

      // 狀態過濾
      if (statusFilter) {
        filtered = filtered.filter((apt) => apt.status === statusFilter);
      }

      // 按日期和時間排序的函數
      const sortByDateAndTime = (a: Appointment, b: Appointment) => {
        // 先按日期排序（舊到新，時間順序）
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        // 同日期按時間排序（早到晚）
        return a.time.localeCompare(b.time);
      };

      // 分成三組
      const active = filtered
        .filter((apt) => apt.status === "pending" || apt.status === "confirmed")
        .sort(sortByDateAndTime);

      const completed = filtered
        .filter((apt) => apt.status === "completed")
        .sort(sortByDateAndTime);

      const cancelled = filtered
        .filter((apt) => apt.status === "cancelled")
        .sort(sortByDateAndTime);

      return {
        activeAppointments: active,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
      };
    }, [appointments, selectedMonth, selectedDate, statusFilter]);

  // 總預約數
  const totalAppointments =
    activeAppointments.length +
    completedAppointments.length +
    cancelledAppointments.length;

  return (
    <>
      <div className="calendar-view-grid">
        {/* Left: Appointments List */}
        <div className="calendar-panel">
          <div className="daily-appointments">
            <div className="daily-header">
              <div className="header-left">
                <span className="date-text">{getDateText()}</span>
              </div>
              <div className="header-right">
                <span className="count-text">共 {totalAppointments} 筆</span>
              </div>
            </div>
            <div className="daily-list">
              {totalAppointments > 0 ? (
                <>
                  {/* 待確認 & 已確認預約 */}
                  {activeAppointments.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={`calendar-appointment-item ${
                        selectedAppointment?.id === apt.id ? "selected" : ""
                      }`}
                    >
                      <div className="item-left">
                        <div className="item-avatar">
                          {(apt as any).petPhoto ? (
                            <img
                              src={(apt as any).petPhoto}
                              alt={apt.petName || "寵物"}
                            />
                          ) : (
                            <div className="avatar-placeholder">🐾</div>
                          )}
                          {/* 待確認紅點 */}
                          {apt.status === "pending" && (
                            <div className="pending-dot"></div>
                          )}
                        </div>
                      </div>
                      <div className="item-middle">
                        <div className="item-title">
                          <div className="title-content">
                            <span className="date-text">
                              {selectedDate
                                ? apt.time
                                : `${apt.date.split("-")[1]}/${
                                    apt.date.split("-")[2]
                                  } ${apt.time}`}
                            </span>{" "}
                            <span className="service-text">
                              {apt.serviceType}
                            </span>
                          </div>
                          {getStatusBadge(apt.status)}
                        </div>
                        <div className="item-info">
                          <span className="info-text">
                            {apt.customerName}
                            {apt.petName && ` ｜ ${apt.petName}`}
                            {apt.phone && ` ｜ ${apt.phone.slice(-3)}`}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* 已完成預約 - 分隔線 */}
                  {completedAppointments.length > 0 && (
                    <>
                      <button
                        className="appointments-divider"
                        onClick={() =>
                          setIsCompletedExpanded(!isCompletedExpanded)
                        }
                      >
                        <span>已完成 ({completedAppointments.length})</span>
                        <span className="material-symbols-rounded toggle-icon">
                          {isCompletedExpanded ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                      {isCompletedExpanded &&
                        completedAppointments.map((apt) => (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className={`calendar-appointment-item ${
                              selectedAppointment?.id === apt.id
                                ? "selected"
                                : ""
                            }`}
                          >
                            <div className="item-left">
                              <div className="item-avatar">
                                {(apt as any).petPhoto ? (
                                  <img
                                    src={(apt as any).petPhoto}
                                    alt={apt.petName || "寵物"}
                                  />
                                ) : (
                                  <div className="avatar-placeholder">🐾</div>
                                )}
                              </div>
                            </div>
                            <div className="item-middle">
                              <div className="item-title">
                                <div className="title-content">
                                  <span className="date-text">
                                    {selectedDate
                                      ? apt.time
                                      : `${apt.date.split("-")[1]}/${
                                          apt.date.split("-")[2]
                                        } ${apt.time}`}
                                  </span>{" "}
                                  <span className="service-text">
                                    {apt.serviceType}
                                  </span>
                                </div>
                                {getStatusBadge(apt.status)}
                              </div>
                              <div className="item-info">
                                <span className="info-text">
                                  {apt.customerName}
                                  {apt.petName && ` ｜ ${apt.petName}`}
                                  {apt.phone && ` ｜ ${apt.phone.slice(-3)}`}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                    </>
                  )}

                  {/* 已取消預約 - 分隔線 */}
                  {cancelledAppointments.length > 0 && (
                    <>
                      <button
                        className="appointments-divider"
                        onClick={() =>
                          setIsCancelledExpanded(!isCancelledExpanded)
                        }
                      >
                        <span>已取消 ({cancelledAppointments.length})</span>
                        <span className="material-symbols-rounded toggle-icon">
                          {isCancelledExpanded ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                      {isCancelledExpanded &&
                        cancelledAppointments.map((apt) => (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className={`calendar-appointment-item ${
                              selectedAppointment?.id === apt.id
                                ? "selected"
                                : ""
                            }`}
                          >
                            <div className="item-left">
                              <div className="item-avatar">
                                {(apt as any).petPhoto ? (
                                  <img
                                    src={(apt as any).petPhoto}
                                    alt={apt.petName || "寵物"}
                                  />
                                ) : (
                                  <div className="avatar-placeholder">🐾</div>
                                )}
                              </div>
                            </div>
                            <div className="item-middle">
                              <div className="item-title">
                                <div className="title-content">
                                  <span className="date-text">
                                    {selectedDate
                                      ? apt.time
                                      : `${apt.date.split("-")[1]}/${
                                          apt.date.split("-")[2]
                                        } ${apt.time}`}
                                  </span>{" "}
                                  <span className="service-text">
                                    {apt.serviceType}
                                  </span>
                                </div>
                                {getStatusBadge(apt.status)}
                              </div>
                              <div className="item-info">
                                <span className="info-text">
                                  {apt.customerName}
                                  {apt.petName && ` ｜ ${apt.petName}`}
                                  {apt.phone && ` ｜ ${apt.phone.slice(-3)}`}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                    </>
                  )}
                </>
              ) : (
                <div className="no-appointments">
                  {selectedDate ? "當日沒有預約" : "當月沒有預約"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Appointment Detail */}
        <div className="appointment-detail-panel">
          {selectedAppointment ? (
            <>
              {/* Header */}
              <div
                className={`detail-header ${getStatusColor(
                  selectedAppointment.status
                )}`}
              >
                {/* Pet Avatar */}
                <div
                  className="header-pet-avatar"
                  onClick={() => {
                    if ((selectedAppointment as any).petPhoto) {
                      setPreviewImage((selectedAppointment as any).petPhoto);
                    }
                  }}
                  style={{
                    cursor: (selectedAppointment as any).petPhoto
                      ? "pointer"
                      : "default",
                  }}
                >
                  {(selectedAppointment as any).petPhoto ? (
                    <LazyImage
                      src={(selectedAppointment as any).petPhoto}
                      alt={selectedAppointment.petName || "寵物"}
                      wrapperClassName="avatar-wrapper"
                    />
                  ) : (
                    <div className="avatar-placeholder">🐾</div>
                  )}
                </div>

                <div className="header-top">
                  <div>
                    <h2>
                      {selectedAppointment.customerName}
                      {selectedAppointment.petName &&
                        ` ｜ ${selectedAppointment.petName}`}
                    </h2>
                    <p className="appointment-id">
                      {selectedAppointment.phone
                        ? `手機號碼：${selectedAppointment.phone}`
                        : `預約編號：${selectedAppointment.id.slice(0, 8)}`}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {getStatusBadge(selectedAppointment.status)}
                    <button
                      onClick={() => setShowReminders(true)}
                      className="customer-reminder-btn"
                      title="查看客戶過去顧客注記"
                    >
                      <Bell size={16} />
                      <span>顧客注記</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="detail-content">
                {/* 預約資訊 */}
                <div className="section">
                  <h3>預約資訊</h3>
                  <div className="info-grid info-grid-3">
                    <div className="info-card">
                      <CalendarIcon size={20} />
                      <div className="info-content">
                        <div className="label">日期</div>
                        <div className="value">{selectedAppointment.date}</div>
                      </div>
                    </div>
                    <div className="info-card">
                      <Clock size={20} />
                      <div className="info-content">
                        <div className="label">時間</div>
                        <div className="value">{selectedAppointment.time}</div>
                      </div>
                    </div>
                    <div className="info-card primary">
                      <Scissors size={20} />
                      <div className="info-content">
                        <div className="label">服務項目</div>
                        <div className="value">
                          {selectedAppointment.serviceType}
                        </div>
                        {(selectedAppointment as any).servicePrice && (
                          <div className="price">
                            ${(selectedAppointment as any).servicePrice}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 預約備註 */}
                {selectedAppointment.notes && (
                  <div className="section">
                    <h3>預約備註</h3>
                    <div className="info-card">
                      <FileText size={20} />
                      <div className="info-content">
                        <div className="notes-text">
                          {selectedAppointment.notes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 顧客注記 */}
                {serviceReport && serviceReport.serviceNotes && (
                  <div className="section">
                    <h3>顧客注記</h3>
                    <div className="info-card">
                      <FileText size={20} />
                      <div className="info-content">
                        <div className="notes-text">
                          {serviceReport.serviceNotes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 客戶與寵物資訊 */}
                <div className="section">
                  <h3>客戶與寵物資訊</h3>
                  <div className="info-grid">
                    <div className="info-card">
                      <User size={20} />
                      <div className="info-content">
                        <div className="label">客戶姓名</div>
                        <div className="value">
                          {selectedAppointment.customerName}
                        </div>
                        {selectedAppointment.phone && (
                          <div className="phone-info">
                            {selectedAppointment.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedAppointment.petName && (
                      <div className="info-card pet-card">
                        <div className="info-content">
                          <div className="label">寵物名稱</div>
                          <div className="value">
                            {selectedAppointment.petName}
                          </div>
                          {selectedAppointment.petSpecies && (
                            <div className="species-info">
                              {selectedAppointment.petSpecies}
                              {selectedAppointment.petSize &&
                                ` · ${selectedAppointment.petSize}`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <hr className="section-divider" />

                {/* 發送紀錄 */}
                {(tempReportRecords.length > 0 ||
                  completionRecords.length > 0) && (
                  <div className="section send-records-section">
                    {/* 臨時回報紀錄 */}
                    {tempReportRecords.length > 0 && (
                      <div  className="send-records-section-item">
                        <div className="record-type-badge">
                          臨時回報 ({tempReportRecords.length})
                        </div>
                        <div className="send-records-list">
                          {tempReportRecords.map((record) => (
                            <div key={record.id} className="send-record-item">
                              {record.imageUrl && (
                                <div
                                  className="record-image"
                                  onClick={() =>
                                    setPreviewImage(record.imageUrl)
                                  }
                                  style={{ cursor: "pointer" }}
                                >
                                  <img src={record.imageUrl} alt="臨時回報" />
                                </div>
                              )}
                              <div className="record-content">
                                <div className="record-time">
                                  {record.timestamp?.toDate?.()
                                    ? new Date(
                                        record.timestamp.toDate()
                                      ).toLocaleString("zh-TW", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : ""}
                                </div>
                                {record.message && (
                                  <div className="record-message">
                                    {record.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 完成分享紀錄 */}
                    {completionRecords.length > 0 && (
                      <div  className="send-records-section-item">
                        <div className="record-type-badge">
                          完成分享 ({completionRecords.length})
                        </div>
                        <div className="send-records-list">
                          {completionRecords.map((record) => (
                            <div key={record.id} className="send-record-item">
                              {record.imageUrl && (
                                <div
                                  className="record-image"
                                  onClick={() =>
                                    setPreviewImage(record.imageUrl)
                                  }
                                  style={{ cursor: "pointer" }}
                                >
                                  <img src={record.imageUrl} alt="完成分享" />
                                </div>
                              )}
                              <div className="record-content">
                                <div className="record-time">
                                  {record.timestamp?.toDate?.()
                                    ? new Date(
                                        record.timestamp.toDate()
                                      ).toLocaleString("zh-TW", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : ""}
                                </div>
                                {record.message && (
                                  <div className="record-message">
                                    {record.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 操作按鈕 - 固定在底部 */}
              <div className="action-buttons">
                {selectedAppointment.status === "pending" && (
                  <>
                    <button
                      onClick={() => setShowDeclineInput(true)}
                      className="btn-cancel"
                    >
                      <X size={20} />
                      婉拒預約
                    </button>
                    <button
                      onClick={() =>
                        handleStatusUpdate(
                          selectedAppointment.id,
                          "confirmed",
                          selectedAppointment.shopId
                        )
                      }
                      className="btn-confirm"
                    >
                      <Check size={20} />
                      確認預約
                    </button>
                  </>
                )}
                {selectedAppointment.status === "confirmed" && (
                  <>
                    <button
                      onClick={() =>
                        handleStatusUpdate(
                          selectedAppointment.id,
                          "cancelled",
                          selectedAppointment.shopId
                        )
                      }
                      className="btn-cancel"
                    >
                      <X size={20} />
                      取消預約
                    </button>
                    <button
                      onClick={() =>
                        handleServiceCompletion(
                          selectedAppointment.id,
                          selectedAppointment.shopId
                        )
                      }
                      className="btn-complete"
                    >
                      <Check size={20} />
                      LINE 通知主人完成
                    </button>
                  </>
                )}
                {selectedAppointment.status === "cancelled" && (
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "0.75rem",
                      color: "#EF4444",
                      fontWeight: "bold",
                    }}
                  >
                    此預約已取消
                  </div>
                )}
                {selectedAppointment.status === "completed" && (
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "0.75rem",
                      color: "#10B981",
                      fontWeight: "bold",
                    }}
                  >
                    此預約已完成
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <CalendarIcon
                size={64}
                style={{ marginBottom: "1rem", opacity: 0.5 }}
              />
              <p>請從左側選擇一個預約查看詳情</p>
            </div>
          )}
        </div>
      </div>

      {/* 婉拒原因彈窗 */}
      {showDeclineInput && (
        <div className="decline-modal-overlay" onClick={handleCancelDecline}>
          <div
            className="decline-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="decline-modal-header">
              <h3>婉拒預約</h3>
              <button
                onClick={handleCancelDecline}
                className="decline-modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="decline-modal-body">
              <label className="decline-modal-label">
                請輸入婉拒原因（必填）
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="例如：當日已額滿、時段無法配合、寵物體型不符等..."
                rows={4}
                className="decline-modal-textarea"
                autoFocus
              />
            </div>
            <div className="decline-modal-footer">
              <button
                onClick={handleCancelDecline}
                className="decline-modal-btn-cancel"
              >
                取消
              </button>
              <button
                onClick={() =>
                  selectedAppointment &&
                  handleDeclineAppointment(
                    selectedAppointment.id,
                    selectedAppointment.shopId
                  )
                }
                disabled={!declineReason.trim() || isSubmitting}
                className="decline-modal-btn-confirm"
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    發送中...
                  </>
                ) : (
                  "確認婉拒"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顧客注記彈窗 */}
      {showReminders && selectedAppointment && (
        <CustomerRemindersPopup
          userId={selectedAppointment.userId}
          shopId={selectedAppointment.shopId}
          customerName={selectedAppointment.customerName}
          onClose={() => setShowReminders(false)}
        />
      )}

      {/* 圖片預覽模態框 */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          altText={selectedAppointment?.petName || "寵物照片"}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
};
