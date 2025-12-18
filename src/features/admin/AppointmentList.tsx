import { useState, useEffect, useRef } from "react";
import { useAppointments } from "../../hooks/useAppointments";
import {
  Check,
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  FileText,
  Search,
  XCircle,
  Bell,
} from "lucide-react";
import type { Appointment } from "../../types/appointment";
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

interface AppointmentListProps {
  shopId: string;
  businessHours: { start: string; end: string } | null;
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

export const AppointmentList = ({
  shopId,
  businessHours,
}: AppointmentListProps) => {
  const { useAppointmentList, updateAppointmentStatus } = useAppointments();
  const { appointments: rawAppointments } = useAppointmentList(shopId);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(
    null
  );
  const [tempReportRecords, setTempReportRecords] = useState<SendRecord[]>([]);
  const [completionRecords, setCompletionRecords] = useState<SendRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // 婉拒原因狀態
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 顧客注記狀態
  const [showReminders, setShowReminders] = useState(false);

  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  // 取得今天的日期字串 (YYYY-MM-DD)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayString = getTodayString();

  // 只顯示今天的預約，並按時間排序，支援搜尋
  const appointments = [...rawAppointments]
    .filter((apt) => {
      // 只顯示今天
      if (apt.date !== todayString) return false;

      // 搜尋過濾（客戶名稱、寵物名稱、手機末三碼）
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          apt.customerName.toLowerCase().includes(query) ||
          apt.petName?.toLowerCase().includes(query) ||
          (apt.phone && apt.phone.slice(-3).includes(query))
        );
      }

      return true;
    })
    .sort((a, b) => {
      // 狀態優先級：pending(0) 和 confirmed(1) 在前，completed(2) 和 cancelled(3) 在後
      const statusPriority = {
        pending: 0,
        confirmed: 1,
        completed: 2,
        cancelled: 3,
      };

      const priorityA =
        statusPriority[a.status as keyof typeof statusPriority] ?? 4;
      const priorityB =
        statusPriority[b.status as keyof typeof statusPriority] ?? 4;

      // 先按狀態排序
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 狀態相同時，按時間排序
      const timeA = a.time.split(":").map(Number);
      const timeB = b.time.split(":").map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

  // 判斷是否為搜尋模式
  const isSearchMode = searchQuery.trim().length > 0;

  // 獲取當前時間
  const getCurrentTime = () => {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  // 每分鐘更新當前時間
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  // 自動滾動到當前時間（首次載入和退出搜尋模式時）
  useEffect(() => {
    if (!isSearchMode && currentTimeRef.current && scrollContainerRef.current) {
      // 延遲一點確保 DOM 已更新
      setTimeout(() => {
        if (currentTimeRef.current && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const currentElement = currentTimeRef.current;
          const containerHeight = container.clientHeight;
          const elementTop = currentElement.offsetTop;

          // 將當前時間滾動到視窗中間
          container.scrollTop = elementTop - containerHeight / 2;
        }
      }, 100);
    }
  }, [isSearchMode]); // 監聽搜尋模式變化

  // 根據店家營業時間生成時間軸
  const generateTimeSlots = () => {
    const slots = [];

    // 預設營業時間 9:00 - 21:00
    let startHour = 9;
    let endHour = 21;

    // 如果有設定營業時間，使用店家設定
    if (businessHours) {
      startHour = parseInt(businessHours.start.split(":")[0]);
      endHour = parseInt(businessHours.end.split(":")[0]);
    }

    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // 根據預約時間分組
  const getAppointmentsForHour = (hour: number) => {
    return appointments.filter((apt) => {
      const aptHour = parseInt(apt.time.split(":")[0]);
      return aptHour === hour;
    });
  };

  const isCurrentHour = (hour: number) => {
    return currentTime.hour === hour;
  };

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

  const getStatusColor = (status: string) => {
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

  return (
    <>
      <div className="appointment-grid">
        {/* Left: Timeline Appointment List */}
        <div className="appointment-list-panel">
          <div className="panel-header">
            <div className="header-left">
              <span className="date-text">
                {isSearchMode
                  ? "搜尋結果"
                  : `${new Date().getFullYear()} / ${
                      new Date().getMonth() + 1
                    } / ${new Date().getDate()}`}
              </span>
            </div>
            <div className="header-right">
              <span className="count-text">共 {appointments.length} 筆</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="姓名或末三碼"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="clear-button"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="timeline-scroll" ref={scrollContainerRef}>
            {isSearchMode ? (
              // 搜尋模式：顯示列表
              appointments.length > 0 ? (
                appointments.map((apt) => {
                  const isInactive =
                    apt.status === "cancelled" || apt.status === "completed";
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={`appointment-search-card search-mode ${
                        isInactive ? "inactive" : ""
                      } ${
                        !isInactive && selectedAppointment?.id === apt.id
                          ? "selected"
                          : ""
                      }`}
                    >
                      {/* Left: Pet Photo */}
                      <div className="card-image">
                        {(apt as any).petPhoto ? (
                          <img
                            src={(apt as any).petPhoto}
                            alt={apt.petName || "寵物"}
                          />
                        ) : (
                          <div className="image-placeholder">🐾</div>
                        )}
                      </div>

                      {/* Right: Appointment Info */}
                      <div className="card-info">
                        <div className="card-title">
                          <span className="time-text">{apt.time}</span>
                          <span className="service-text">
                            {apt.serviceType}
                          </span>
                          {getStatusBadge(apt.status)}
                        </div>
                        <div className="card-details">
                          <span>{apt.customerName}</span>
                          {apt.petName && (
                            <>
                              <span className="separator">｜</span>
                              <span>{apt.petName}</span>
                            </>
                          )}
                          {apt.phone && (
                            <>
                              <span className="separator">｜</span>
                              <span>{apt.phone.slice(-3)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="empty-search">
                  <Search
                    size={48}
                    style={{ opacity: 0.3, marginBottom: "1rem" }}
                  />
                  <p>找不到符合的預約</p>
                </div>
              )
            ) : (
              // 時間軸模式：顯示時間軸
              timeSlots.map((hour) => {
                const hourAppointments = getAppointmentsForHour(hour);
                const isCurrent = isCurrentHour(hour);

                return (
                  <div
                    key={hour}
                    className="timeline-slot"
                    ref={isCurrent ? currentTimeRef : null}
                  >
                    {/* Left: Time Display */}
                    <div className="timeline-time">
                      <div
                        className={`time-label ${isCurrent ? "current" : ""}`}
                      >
                        {String(hour).padStart(2, "0")}:00
                      </div>
                      <div className="timeline-line">
                        {isCurrent && <div className="current-indicator" />}
                      </div>
                    </div>

                    {/* Right: Appointments */}
                    <div className="timeline-content">
                      {hourAppointments.length > 0 ? (
                        hourAppointments.map((apt) => {
                          const isInactive =
                            apt.status === "cancelled" ||
                            apt.status === "completed";
                          return (
                            <button
                              key={apt.id}
                              onClick={() => setSelectedAppointment(apt)}
                              className={`appointment-card ${
                                isInactive ? "inactive" : ""
                              } ${
                                !isInactive &&
                                selectedAppointment?.id === apt.id
                                  ? "selected"
                                  : ""
                              }`}
                            >
                              {/* Left: Pet Photo */}
                              <div className="card-image">
                                {(apt as any).petPhoto ? (
                                  <img
                                    src={(apt as any).petPhoto}
                                    alt={apt.petName || "寵物"}
                                  />
                                ) : (
                                  <div className="image-placeholder">🐾</div>
                                )}
                              </div>

                              {/* Right: Appointment Info */}
                              <div className="card-info">
                                <div className="card-title">
                                  <span>{apt.serviceType}</span>
                                  {getStatusBadge(apt.status)}
                                </div>
                                <div className="card-details">
                                  <span>{apt.customerName}</span>
                                  {apt.petName && (
                                    <>
                                      <span className="separator">｜</span>
                                      <span>{apt.petName}</span>
                                    </>
                                  )}
                                  {apt.phone && (
                                    <>
                                      <span className="separator">｜</span>
                                      <span>{apt.phone.slice(-3)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="empty-slot" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
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
                      {selectedAppointment.phone &&
                        ` ｜ ${selectedAppointment.phone.slice(-3)}`}
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
                      <Calendar size={20} />
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
                      <div className="send-records-section-item">
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
                      <div className="send-records-section-item">
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
              <Calendar
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
