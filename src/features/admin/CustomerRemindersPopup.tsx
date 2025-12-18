import { useState, useEffect } from "react";
import { X, FileText, AlertCircle } from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

interface CustomerRemindersPopupProps {
  userId: string;
  shopId: string;
  customerName: string;
  onClose: () => void;
}

interface ServiceNoteRecord {
  appointmentId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  serviceType: string;
  serviceNotes: string;
  petName?: string;
}

export const CustomerRemindersPopup = ({
  userId,
  shopId,
  customerName,
  onClose,
}: CustomerRemindersPopupProps) => {
  const [records, setRecords] = useState<ServiceNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServiceNotes = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. 查詢該客戶的所有預約（Multi-Tenant: 使用 subcollection）
        const appointmentsRef = collection(db, "shops", shopId, "appointments");
        const appointmentsQuery = query(
          appointmentsRef,
          where("userId", "==", userId)
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);

        console.log(
          `找到 ${appointmentsSnapshot.size} 筆預約 (userId: ${userId}, shopId: ${shopId})`
        );

        // 2. 對每個預約查詢顧客注記
        const noteRecords: ServiceNoteRecord[] = [];

        for (const aptDoc of appointmentsSnapshot.docs) {
          const aptData = aptDoc.data();

          // 查詢顧客注記
          const serviceReportRef = doc(
            db,
            "shops",
            shopId,
            "serviceReports",
            aptDoc.id
          );

          const serviceReportSnap = await getDoc(serviceReportRef);

          if (serviceReportSnap.exists()) {
            const reportData = serviceReportSnap.data();

            // 如果有顧客注記，加入記錄
            if (reportData.serviceNotes && reportData.serviceNotes.trim()) {
              noteRecords.push({
                appointmentId: aptDoc.id,
                date: aptData.date,
                time: aptData.time,
                serviceType: aptData.serviceType,
                serviceNotes: reportData.serviceNotes,
                petName: aptData.petName,
              });
            }
          }
        }

        // 3. 按日期排序（最新在上）
        noteRecords.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.time.localeCompare(a.time);
        });

        console.log(`找到 ${noteRecords.length} 筆顧客注記`);
        setRecords(noteRecords);
      } catch (err) {
        console.error("載入顧客注記失敗:", err);
        setError("載入失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    };

    loadServiceNotes();
  }, [userId, shopId]);

  // 鎖定背景滾動
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div className="customer-reminders-overlay" onClick={onClose}>
      <div
        className="customer-reminders-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="customer-reminders-header">
          <div className="header-content">
            <h2>顧客注記</h2>
            <p className="customer-name">{customerName}</p>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="customer-reminders-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>載入中...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={48} />
              <p>{error}</p>
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>此客戶尚無顧客注記</p>
            </div>
          ) : (
            <div className="records-list">
              {records.map((record) => (
                <div key={record.appointmentId} className="record-item">
                  <div className="record-header">
                    <div className="record-date">
                      {record.date} {record.time}
                    </div>
                    <div className="record-service">{record.serviceType}</div>
                  </div>
                  {record.petName && (
                    <div className="record-pet">寵物：{record.petName}</div>
                  )}
                  <div className="record-notes">{record.serviceNotes}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="customer-reminders-footer">
          <button onClick={onClose} className="footer-close-btn">
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
