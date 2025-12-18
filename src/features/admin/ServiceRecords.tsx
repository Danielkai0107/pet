import { useState, useMemo, useEffect } from "react";
import { useAppointments } from "../../hooks/useAppointments";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  FileText,
  DollarSign,
  CheckCircle,
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
import { ImagePreviewModal } from "../../components/ImagePreviewModal";

interface ServiceRecordsProps {
  shopId: string;
  searchQuery: string;
  filterMonth: string;
  filterService: string;
  onMonthsAvailable?: (months: string[]) => void;
  onServicesAvailable?: (services: string[]) => void;
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

export const ServiceRecords = ({
  shopId,
  searchQuery,
  filterMonth,
  filterService,
  onMonthsAvailable,
  onServicesAvailable,
}: ServiceRecordsProps) => {
  const { useAppointmentList } = useAppointments();
  const { appointments: rawAppointments } = useAppointmentList(shopId);
  const [selectedRecord, setSelectedRecord] = useState<Appointment | null>(
    null
  );
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(
    null
  );
  const [tempReportRecords, setTempReportRecords] = useState<SendRecord[]>([]);
  const [completionRecords, setCompletionRecords] = useState<SendRecord[]>([]);

  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 只顯示已完成的預約，按日期排序（新到舊）
  const completedAppointments = useMemo(() => {
    return [...rawAppointments]
      .filter((apt) => apt.status === "completed")
      .sort((a, b) => {
        // 按日期排序（新到舊），同日期再按時間排序
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date); // 新日期在前
        }
        return b.time.localeCompare(a.time); // 同日期新時間在前
      });
  }, [rawAppointments]);

  // 計算可用的月份選項
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    completedAppointments.forEach((apt) => {
      const month = apt.date.substring(0, 7); // YYYY-MM
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  }, [completedAppointments]);

  // 計算可用的服務項目選項
  const availableServices = useMemo(() => {
    const services = new Set<string>();
    completedAppointments.forEach((apt) => {
      services.add(apt.serviceType);
    });
    return Array.from(services).sort();
  }, [completedAppointments]);

  // 通知父組件可用的月份和服務項目（使用 useEffect 處理副作用）
  useEffect(() => {
    if (onMonthsAvailable) {
      onMonthsAvailable(availableMonths);
    }
  }, [availableMonths, onMonthsAvailable]);

  useEffect(() => {
    if (onServicesAvailable) {
      onServicesAvailable(availableServices);
    }
  }, [availableServices, onServicesAvailable]);

  // 過濾預約（搜尋 + 服務項目 + 月份）
  const filteredRecords = useMemo(() => {
    let records = completedAppointments;

    // 搜尋過濾（統一邏輯：客戶名稱、寵物名稱、手機末三碼）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      records = records.filter(
        (apt) =>
          apt.customerName.toLowerCase().includes(query) ||
          apt.petName?.toLowerCase().includes(query) ||
          (apt.phone && apt.phone.slice(-3).includes(query))
      );
    }

    // 服務項目過濾
    if (filterService) {
      records = records.filter((apt) => apt.serviceType === filterService);
    }

    // 月份過濾
    if (filterMonth) {
      records = records.filter((apt) => apt.date.startsWith(filterMonth));
    }

    return records;
  }, [completedAppointments, searchQuery, filterService, filterMonth]);

  // 載入服務紀錄和發送紀錄
  useEffect(() => {
    const loadServiceData = async () => {
      if (!selectedRecord) {
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
          selectedRecord.shopId,
          "serviceReports",
          selectedRecord.id
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
          selectedRecord.shopId,
          "serviceReports",
          selectedRecord.id,
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
          selectedRecord.shopId,
          "serviceReports",
          selectedRecord.id,
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
  }, [selectedRecord]);

  // 計算統計數據
  const stats = useMemo(() => {
    const records = filterMonth ? filteredRecords : completedAppointments;
    const totalCount = records.length;
    const totalRevenue = records.reduce(
      (sum, apt) => sum + (apt.servicePrice || 0),
      0
    );

    // 服務類型統計
    const serviceCount = new Map<string, number>();
    records.forEach((apt) => {
      serviceCount.set(
        apt.serviceType,
        (serviceCount.get(apt.serviceType) || 0) + 1
      );
    });

    return {
      totalCount,
      totalRevenue,
      serviceCount,
    };
  }, [completedAppointments, filteredRecords, filterMonth]);

  // 格式化月份顯示
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${year} 年 ${parseInt(month)} 月`;
  };

  // 取得 header 標題
  const getHeaderTitle = () => {
    if (searchQuery.trim()) {
      return "搜尋結果";
    }
    if (filterService && filterMonth) {
      return `${filterService} - ${formatMonth(filterMonth)}`;
    }
    if (filterService) {
      return filterService;
    }
    if (filterMonth) {
      return formatMonth(filterMonth);
    }
    return "服務紀錄";
  };

  return (
    <div className="service-records-grid">
      {/* Left: Records List */}
      <div className="records-list-panel">
        {/* Stats Summary - 獨立區塊 */}
        <div className="stats-summary">
          <div className="summary-card">
            <div className="summary-label">服務次數</div>
            <div className="summary-value">{stats.totalCount}</div>
          </div>
          <div className="summary-card highlight">
            <div className="summary-label">總營收</div>
            <div className="summary-value">
              ${stats.totalRevenue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Records Container - 列表框 */}
        <div className="records-container">
          <div className="panel-header">
            <div className="header-left">
              <span className="title-text">{getHeaderTitle()}</span>
            </div>
            <div className="header-right">
              <span className="count-text">共 {filteredRecords.length} 筆</span>
            </div>
          </div>

          <div className="records-scroll">
            {filteredRecords.map((record) => (
              <button
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className={`record-card ${
                  selectedRecord?.id === record.id ? "selected" : ""
                }`}
              >
                {/* Left: Icon */}
                <div className="card-icon">
                  <CheckCircle size={24} />
                </div>

                {/* Right: Record Info */}
                <div className="card-info">
                  <div className="card-header">
                    <span className="card-date">
                      {record.date} {record.time}
                    </span>
                    {record.servicePrice && (
                      <span className="card-price">${record.servicePrice}</span>
                    )}
                  </div>
                  <div className="card-title">{record.serviceType}</div>
                  <div className="card-details">
                    <span className="customer-name">{record.customerName}</span>
                    {record.petName && (
                      <>
                        <span className="separator">｜</span>
                        <span className="pet-name">{record.petName}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {filteredRecords.length === 0 && (
              <div className="empty-state">
                <CheckCircle
                  size={48}
                  style={{ opacity: 0.3, marginBottom: "1rem" }}
                />
                <p>目前沒有服務紀錄</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Record Detail */}
      <div className="record-detail-panel">
        {selectedRecord ? (
          <>
            {/* Header */}
            <div className="detail-header">
              {/* Status Icon */}
              <div className="header-status-icon">
                <CheckCircle size={48} />
              </div>

              <div className="header-top">
                <div>
                  <h2>{selectedRecord.serviceType}</h2>
                  <p className="record-id">
                    紀錄編號：{selectedRecord.id.slice(0, 8)}
                  </p>
                </div>
                <div className="status-badge badge-completed">已完成</div>
              </div>
            </div>

            {/* Content */}
            <div className="detail-content">
              {/* 服務資訊 */}
              <div className="section">
                <h3>服務資訊</h3>
                <div className="info-grid info-grid-3">
                  <div className="info-card">
                    <Calendar size={20} />
                    <div className="info-content">
                      <div className="label">日期</div>
                      <div className="value">{selectedRecord.date}</div>
                    </div>
                  </div>
                  <div className="info-card">
                    <Clock size={20} />
                    <div className="info-content">
                      <div className="label">時間</div>
                      <div className="value">{selectedRecord.time}</div>
                    </div>
                  </div>
                  <div className="info-card primary">
                    <Scissors size={20} />
                    <div className="info-content">
                      <div className="label">服務項目</div>
                      <div className="value">{selectedRecord.serviceType}</div>
                      <div className="service-meta">
                        {selectedRecord.duration} 分鐘
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 費用 */}
              {selectedRecord.servicePrice && (
                <div className="section">
                  <h3>費用資訊</h3>
                  <div className="info-card revenue">
                    <DollarSign size={20} />
                    <div className="info-content">
                      <div className="label">服務費用</div>
                      <div className="value price">
                        ${selectedRecord.servicePrice}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 預約備註 */}
              {selectedRecord.notes && (
                <div className="section">
                  <h3>預約備註</h3>
                  <div className="info-card">
                    <FileText size={20} />
                    <div className="info-content">
                      <div className="notes-text">{selectedRecord.notes}</div>
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
                      <div className="value">{selectedRecord.customerName}</div>
                      {selectedRecord.phone && (
                        <div className="phone-info">{selectedRecord.phone}</div>
                      )}
                    </div>
                  </div>
                  {selectedRecord.petName && (
                    <div className="info-card pet-card">
                      <div className="info-content">
                        <div className="label">寵物名稱</div>
                        <div className="value">{selectedRecord.petName}</div>
                        {selectedRecord.petSpecies && (
                          <div className="species-info">
                            {selectedRecord.petSpecies}
                            {selectedRecord.petSize &&
                              ` · ${selectedRecord.petSize}`}
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
                                onClick={() => setPreviewImage(record.imageUrl)}
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
                                onClick={() => setPreviewImage(record.imageUrl)}
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
          </>
        ) : (
          <div className="no-selection">
            <CheckCircle
              size={64}
              style={{ marginBottom: "1rem", opacity: 0.5 }}
            />
            <p>請從左側選擇一筆服務紀錄查看詳情</p>
          </div>
        )}
      </div>

      {/* 圖片預覽模態框 */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          altText={selectedRecord?.petName || "服務紀錄照片"}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};
