import { useState, useRef, useEffect } from "react";
import { X, Camera, Send, Phone, Check, Bell } from "lucide-react";
import type { Appointment } from "../../types/appointment";
import { useAppointments } from "../../hooks/useAppointments";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";
import { CustomerRemindersPopup } from "./CustomerRemindersPopup";
import { ImagePreviewModal } from "../../components/ImagePreviewModal";

interface AppointmentDetailPopupProps {
  appointment: Appointment;
  onClose: () => void;
}

type TabType = "temp-report" | "completion" | "settings" | "status";

// 發送紀錄類型
interface SendRecord {
  id: string;
  type: "temp-report" | "completion";
  imageUrl: string | null;
  message: string | null;
  timestamp: any;
}

export const AppointmentDetailPopup = ({
  appointment,
  onClose,
}: AppointmentDetailPopupProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("status");

  // 臨時回報狀態
  const [tempImagePreview, setTempImagePreview] = useState<string>("");
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);
  const [tempMessage, setTempMessage] = useState("");
  const tempImageInputRef = useRef<HTMLInputElement>(null);

  // 完成分享狀態
  const [completionImagePreview, setCompletionImagePreview] =
    useState<string>("");
  const [completionImageFile, setCompletionImageFile] = useState<File | null>(
    null
  );
  const [completionMessage, setCompletionMessage] = useState("");
  const completionImageInputRef = useRef<HTMLInputElement>(null);

  // 發送紀錄
  const [tempReportRecords, setTempReportRecords] = useState<SendRecord[]>([]);
  const [completionRecords, setCompletionRecords] = useState<SendRecord[]>([]);

  // 設定狀態
  const [serviceNotes, setServiceNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // 婉拒原因狀態
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 顧客注記狀態
  const [showReminders, setShowReminders] = useState(false);

  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { updateAppointmentStatus } = useAppointments();

  const tabs: { id: TabType; label: string }[] = [
    { id: "status", label: "狀態" },
    { id: "temp-report", label: "臨時回報" },
    { id: "completion", label: "完成分享" },
    { id: "settings", label: "設定" },
  ];

  // 滑動相關
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  // 狀態徽章
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

  // 處理狀態更新
  const handleStatusUpdate = async (status: Appointment["status"]) => {
    const statusText =
      status === "confirmed"
        ? "已確認"
        : status === "completed"
        ? "已完成"
        : status === "cancelled"
        ? "已取消"
        : "待確認";

    if (!confirm(`確定要將狀態更改為 ${statusText} 嗎？`)) return;

    setUploading(true);
    try {
      await updateAppointmentStatus(appointment.id, status, appointment.shopId);
      toast.success(`狀態已更新為${statusText}`);
      // 狀態變化會自動觸發對應的通知（通過 Cloud Functions 監聽器）
    } catch (error) {
      toast.error("狀態更新失敗，請稍後再試");
    } finally {
      setUploading(false);
    }
  };

  // 處理服務完成通知（不可逆操作）
  const handleServiceCompletionNotification = async () => {
    if (
      !confirm(
        "確定要發送服務完成通知嗎？\n\n此操作會同時將預約標記為已完成，且不可逆！"
      )
    )
      return;

    setUploading(true);
    try {
      const functionUrl =
        "https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/sendServiceCompletionNotification";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: appointment.shopId,
          appointmentId: appointment.id,
        }),
      });

      if (response.ok) {
        toast.success("服務完成通知已發送，預約已標記為已完成！");
      } else {
        const errorData = await response.json();
        console.error("服務完成通知發送失敗:", errorData);
        toast.error("通知發送失敗，請稍後再試");
      }
    } catch (error) {
      console.error("發送服務完成通知時發生錯誤:", error);
      toast.error("通知發送失敗，請稍後再試");
    } finally {
      setUploading(false);
    }
  };

  // 處理婉拒預約（取消預約並發送婉拒通知）
  const handleDeclineAppointment = async () => {
    // 如果還沒顯示輸入框，則顯示輸入框
    if (!showDeclineInput) {
      setShowDeclineInput(true);
      return;
    }

    // 驗證必須輸入原因
    if (!declineReason.trim()) {
      toast.error("請輸入婉拒原因");
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
          shopId: appointment.shopId,
          appointmentId: appointment.id,
          reason: declineReason.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          toast.success(data.message);
        } else {
          toast.success("已婉拒預約並通知客戶");
        }
        // 重置狀態
        setShowDeclineInput(false);
        setDeclineReason("");
      } else {
        const errorData = await response.json();
        console.error("婉拒預約失敗:", errorData);
        toast.error("婉拒預約失敗，請稍後再試");
      }
    } catch (error) {
      console.error("婉拒預約時發生錯誤:", error);
      toast.error("婉拒預約失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 取消婉拒
  const handleCancelDecline = () => {
    setShowDeclineInput(false);
    setDeclineReason("");
  };

  // 點擊 tab 切換
  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  // 處理觸控開始
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  // 處理觸控移動
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  // 處理觸控結束
  const handleTouchEnd = () => {
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;

    // 只有當水平滑動距離大於垂直滑動距離時才處理（表示是橫向滑動）
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 滑動距離至少 50px 才切換
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > minSwipeDistance) {
        const currentIndex = tabs.findIndex((t) => t.id === activeTab);

        if (deltaX > 0) {
          // 向左滑 -> 下一個 tab
          if (currentIndex < tabs.length - 1) {
            setActiveTab(tabs[currentIndex + 1].id);
          }
        } else {
          // 向右滑 -> 上一個 tab
          if (currentIndex > 0) {
            setActiveTab(tabs[currentIndex - 1].id);
          }
        }
      }
    }

    // 重置
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  };

  // 處理臨時回報圖片選擇 - 壓縮並預覽
  const handleTempImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 2, // 壓縮到 2MB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg",
      };

      toast.loading("正在處理圖片...", { id: "compress-temp" });
      const compressedFile = await imageCompression(file, options);
      toast.success("圖片處理完成", { id: "compress-temp" });

      // 保存壓縮後的文件
      setTempImageFile(compressedFile);

      // 顯示預覽
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      toast.error("圖片處理失敗，請重試", { id: "compress-temp" });
    }
  };

  // 刪除臨時回報圖片
  const handleDeleteTempImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempImagePreview("");
    setTempImageFile(null);
    if (tempImageInputRef.current) {
      tempImageInputRef.current.value = "";
    }
  };

  // 處理完成分享圖片選擇 - 壓縮並預覽
  const handleCompletionImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 2, // 壓縮到 2MB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg",
      };

      toast.loading("正在處理圖片...", { id: "compress-completion" });
      const compressedFile = await imageCompression(file, options);
      toast.success("圖片處理完成", { id: "compress-completion" });

      // 保存壓縮後的文件
      setCompletionImageFile(compressedFile);

      // 顯示預覽
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      toast.error("圖片處理失敗，請重試", { id: "compress-completion" });
    }
  };

  // 刪除完成分享圖片
  const handleDeleteCompletionImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletionImagePreview("");
    setCompletionImageFile(null);
    if (completionImageInputRef.current) {
      completionImageInputRef.current.value = "";
    }
  };

  // 上傳圖片到 Firebase Storage
  const uploadImageToStorage = async (
    file: File,
    path: string
  ): Promise<string> => {
    try {
      console.log("開始上傳圖片:", {
        path,
        fileName: file.name,
        size: file.size,
      });

      const { ref, uploadBytes, getDownloadURL } = await import(
        "firebase/storage"
      );
      const { storage } = await import("../../lib/firebase");

      const storageRef = ref(storage, path);
      console.log("Storage ref 創建成功");

      const snapshot = await uploadBytes(storageRef, file);
      console.log("上傳成功:", snapshot);

      const downloadURL = await getDownloadURL(storageRef);
      console.log("獲取 URL 成功:", downloadURL);

      return downloadURL;
    } catch (error: any) {
      console.error("圖片上傳失敗:", {
        error,
        message: error.message,
        code: error.code,
        path,
      });
      throw error;
    }
  };

  // 儲存到 Firestore
  const saveToFirestore = async (data: any) => {
    try {
      const { doc, setDoc, serverTimestamp } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      // Multi-Tenant: 使用 subcollection
      const reportRef = doc(
        db,
        "shops",
        appointment.shopId,
        "serviceReports",
        appointment.id
      );
      await setDoc(
        reportRef,
        {
          ...data,
          appointmentId: appointment.id,
          shopId: appointment.shopId,
          customerId: appointment.userId,
          customerName: appointment.customerName,
          petName: appointment.petName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("資料儲存失敗:", error);
      throw error;
    }
  };

  // 檢查是否有 LINE ID（用於判斷是否可以傳送訊息）
  const hasLineId =
    appointment.userId && !appointment.userId.startsWith("walk-in-");

  // 發送 LINE 訊息的通用函數
  const sendLineNotification = async (
    messageType: "temp-report" | "completion",
    imageUrl: string | null,
    message: string | null
  ) => {
    try {
      const functionName =
        messageType === "completion"
          ? "sendLineCompletionMessage"
          : "sendLineTempReportMessage";

      const functionUrl = `https://asia-east1-pet-crm-bb6e9.cloudfunctions.net/${functionName}`;

      const payload = {
        shopId: appointment.shopId,
        userId: appointment.userId,
        imageUrl: imageUrl,
        message: message,
        petName: appointment.petName,
        serviceType: appointment.serviceType,
        date: appointment.date,
        time: appointment.time,
      };

      console.log("發送 LINE 訊息:", {
        functionUrl,
        messageType,
        hasImage: !!imageUrl,
        hasMessage: !!message,
        payload: payload,
        appointmentData: {
          serviceType: appointment.serviceType,
          date: appointment.date,
          time: appointment.time,
        },
      });

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("LINE API 回應錯誤:", {
          status: response.status,
          errorData,
        });
        throw new Error(errorData.error || "發送失敗");
      }

      console.log("LINE 訊息發送成功");
      return true;
    } catch (error: any) {
      console.error("發送 LINE 通知錯誤:", error);
      throw error;
    }
  };

  // 傳送臨時回報
  const handleSendTempReport = async () => {
    if (!tempImageFile && !tempMessage.trim()) {
      toast.error("請上傳圖片或輸入訊息");
      return;
    }

    if (!hasLineId) {
      toast.error("此客戶無 LINE ID，無法傳送訊息");
      return;
    }

    setUploading(true);
    let lineSuccess = false;

    try {
      const { serverTimestamp, addDoc, collection } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      // 1. 上傳圖片（如果有）
      let imageUrl: string | null = null;
      if (tempImageFile) {
        const imagePath = `service-reports/${appointment.shopId}/${
          appointment.id
        }/temp-report-${Date.now()}.jpg`;
        imageUrl = await uploadImageToStorage(tempImageFile, imagePath);
      }

      // 2. 發送 LINE 訊息（不中斷流程）
      try {
        await sendLineNotification(
          "temp-report",
          imageUrl,
          tempMessage.trim() || null
        );
        lineSuccess = true;
      } catch (lineError: any) {
        console.error("LINE 發送失敗:", lineError);
      }

      // 3. 儲存發送紀錄到 Firestore
      const recordsRef = collection(
        db,
        "shops",
        appointment.shopId,
        "serviceReports",
        appointment.id,
        "tempReports"
      );

      console.log(
        "儲存臨時回報紀錄到路徑:",
        `shops/${appointment.shopId}/serviceReports/${appointment.id}/tempReports`
      );

      const docRef = await addDoc(recordsRef, {
        imageUrl: imageUrl,
        message: tempMessage.trim() || null,
        timestamp: serverTimestamp(),
        appointmentId: appointment.id,
        customerId: appointment.userId,
        petName: appointment.petName,
      });

      console.log("臨時回報紀錄已儲存，ID:", docRef.id);

      // 根據 LINE 發送結果顯示不同訊息
      if (lineSuccess) {
        toast.success("臨時回報已送出並通知主人！");
      } else {
        toast.success("臨時回報已記錄（LINE 通知發送失敗）");
      }

      // 清除輸入
      setTempImagePreview("");
      setTempImageFile(null);
      setTempMessage("");
      if (tempImageInputRef.current) {
        tempImageInputRef.current.value = "";
      }

      // 等待一下再重新載入紀錄（確保 Firestore 已更新）
      setTimeout(() => {
        loadTempReportRecords();
      }, 500);
    } catch (error: any) {
      console.error("送出失敗:", error);
      toast.error(`送出失敗：${error.message || "請稍後再試"}`);
    } finally {
      setUploading(false);
    }
  };

  // 傳送完成分享
  const handleSendCompletion = async () => {
    if (!completionImageFile && !completionMessage.trim()) {
      toast.error("請上傳圖片或輸入訊息");
      return;
    }

    if (!hasLineId) {
      toast.error("此客戶無 LINE ID，無法傳送訊息");
      return;
    }

    setUploading(true);
    let lineSuccess = false;

    try {
      const { serverTimestamp, addDoc, collection } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      // 1. 上傳圖片（如果有）
      let imageUrl: string | null = null;
      if (completionImageFile) {
        const imagePath = `service-reports/${appointment.shopId}/${
          appointment.id
        }/completion-${Date.now()}.jpg`;
        imageUrl = await uploadImageToStorage(completionImageFile, imagePath);
      }

      // 2. 發送 LINE 訊息（不中斷流程）
      try {
        await sendLineNotification(
          "completion",
          imageUrl,
          completionMessage.trim() || null
        );
        lineSuccess = true;
      } catch (lineError: any) {
        console.error("LINE 發送失敗:", lineError);
      }

      // 3. 儲存發送紀錄到 Firestore
      const recordsRef = collection(
        db,
        "shops",
        appointment.shopId,
        "serviceReports",
        appointment.id,
        "completions"
      );

      console.log(
        "儲存完成分享紀錄到路徑:",
        `shops/${appointment.shopId}/serviceReports/${appointment.id}/completions`
      );

      const docRef = await addDoc(recordsRef, {
        imageUrl: imageUrl,
        message: completionMessage.trim() || null,
        timestamp: serverTimestamp(),
        appointmentId: appointment.id,
        customerId: appointment.userId,
        petName: appointment.petName,
      });

      console.log("完成分享紀錄已儲存，ID:", docRef.id);

      // 根據 LINE 發送結果顯示不同訊息
      if (lineSuccess) {
        toast.success("完成分享已送出並通知主人！");
      } else {
        toast.success("完成分享已記錄（LINE 通知發送失敗）");
      }

      // 清除輸入
      setCompletionImagePreview("");
      setCompletionImageFile(null);
      setCompletionMessage("");
      if (completionImageInputRef.current) {
        completionImageInputRef.current.value = "";
      }

      // 等待一下再重新載入紀錄（確保 Firestore 已更新）
      setTimeout(() => {
        loadCompletionRecords();
      }, 500);
    } catch (error: any) {
      console.error("送出失敗:", error);
      toast.error(`送出失敗：${error.message || "請稍後再試"}`);
    } finally {
      setUploading(false);
    }
  };

  // 打給主人
  const handleCallOwner = () => {
    if (appointment.phone) {
      window.location.href = `tel:${appointment.phone}`;
    } else {
      toast.error("無法取得電話號碼");
    }
  };

  // 儲存顧客注記
  const handleSaveNotes = async () => {
    setUploading(true);
    try {
      await saveToFirestore({
        serviceNotes: serviceNotes.trim() || null,
      });

      toast.success("備註已儲存");
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
    } finally {
      setUploading(false);
    }
  };

  // 載入發送紀錄
  const loadTempReportRecords = async () => {
    try {
      const { collection, query, orderBy, getDocs } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      const recordsRef = collection(
        db,
        "shops",
        appointment.shopId,
        "serviceReports",
        appointment.id,
        "tempReports"
      );
      const q = query(recordsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);

      console.log(`載入臨時回報紀錄: ${snapshot.size} 筆`);

      const records: SendRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("臨時回報紀錄:", { id: doc.id, ...data });
        records.push({
          id: doc.id,
          type: "temp-report",
          ...data,
        } as SendRecord);
      });

      setTempReportRecords(records);
      console.log("臨時回報紀錄已設定:", records.length);
    } catch (error) {
      console.error("載入臨時回報紀錄失敗:", error);
    }
  };

  const loadCompletionRecords = async () => {
    try {
      const { collection, query, orderBy, getDocs } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../lib/firebase");

      const recordsRef = collection(
        db,
        "shops",
        appointment.shopId,
        "serviceReports",
        appointment.id,
        "completions"
      );
      const q = query(recordsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);

      console.log(`載入完成分享紀錄: ${snapshot.size} 筆`);

      const records: SendRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("完成分享紀錄:", { id: doc.id, ...data });
        records.push({
          id: doc.id,
          type: "completion",
          ...data,
        } as SendRecord);
      });

      setCompletionRecords(records);
      console.log("完成分享紀錄已設定:", records.length);
    } catch (error) {
      console.error("載入完成分享紀錄失敗:", error);
    }
  };

  // 載入顧客注記
  const loadServiceNotes = async () => {
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      const reportRef = doc(
        db,
        "shops",
        appointment.shopId,
        "serviceReports",
        appointment.id
      );
      const reportSnap = await getDoc(reportRef);

      if (reportSnap.exists()) {
        const data = reportSnap.data();
        if (data.serviceNotes) setServiceNotes(data.serviceNotes);
      }
    } catch (error) {
      console.error("載入顧客注記失敗:", error);
    }
  };

  // 初始載入
  useEffect(() => {
    loadTempReportRecords();
    loadCompletionRecords();
    loadServiceNotes();
  }, [appointment.id, appointment.shopId]);

  // 鎖定背景滾動
  useEffect(() => {
    // 保存原始的 overflow 值
    const originalStyle = window.getComputedStyle(document.body).overflow;

    // 鎖定滾動
    document.body.style.overflow = "hidden";

    // 清理函數：恢復滾動
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <>
      <div className="popup-overlay" onClick={onClose}>
        <div className="popup-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="popup-header">
            <div className="popup-header-info">
              <div
                className="popup-avatar"
                onClick={() => {
                  if ((appointment as any).petPhoto) {
                    setPreviewImage((appointment as any).petPhoto);
                  }
                }}
                style={{
                  cursor: (appointment as any).petPhoto ? "pointer" : "default",
                }}
              >
                {(appointment as any).petPhoto ? (
                  <img
                    src={(appointment as any).petPhoto}
                    alt={appointment.petName || "寵物"}
                  />
                ) : (
                  <div className="avatar-placeholder">🐾</div>
                )}
              </div>
              <div className="popup-header-text">
                <h3>
                  {appointment.customerName} ｜{" "}
                  {appointment.petName || "未命名"}
                </h3>
                <p>手機號碼：{appointment.phone || "未提供"}</p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <button
                onClick={() => setShowReminders(true)}
                className="customer-reminder-btn-circle"
                title="查看客戶過去顧客注記"
                disabled={uploading}
              >
                <Bell size={20} />
              </button>
              {/* <button
              onClick={onClose}
              className="popup-close-btn"
              disabled={uploading}
            >
              <X size={24} />
            </button> */}
            </div>
          </div>

          {/* Tabs */}
          <div className="popup-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`popup-tab ${activeTab === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div
            className="popup-content-scroll"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* 狀態 */}
            <div
              className={`popup-content-page ${
                activeTab === "status" ? "active" : ""
              }`}
            >
              <div className="popup-section">
                <h4 className="section-title">預約狀態</h4>

                <div className="status-display">
                  <div className="current-status">
                    <span className="status-label">目前狀態</span>
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>

                <h4 className="section-title" style={{ marginTop: "1.5rem" }}>
                  變更狀態
                </h4>

                {/* 待確認 → 已確認 / 婉拒預約 */}
                {appointment.status === "pending" && (
                  <>
                    <div className="status-actions">
                      <button
                        onClick={() => handleStatusUpdate("confirmed")}
                        disabled={uploading}
                        className="status-button confirm"
                      >
                        <Check size={20} />
                        確認預約
                      </button>
                      <button
                        onClick={handleDeclineAppointment}
                        disabled={
                          uploading ||
                          isSubmitting ||
                          (showDeclineInput && !declineReason.trim())
                        }
                        className="status-button cancel"
                      >
                        {isSubmitting && showDeclineInput ? (
                          <>
                            <span className="spinner"></span>
                            發送中...
                          </>
                        ) : (
                          <>
                            <X size={20} />
                            {showDeclineInput ? "確認婉拒" : "婉拒預約"}
                          </>
                        )}
                      </button>
                    </div>

                    {/* 婉拒原因輸入框 */}
                    {showDeclineInput && (
                      <div className="decline-reason-section">
                        <label className="section-label">婉拒原因</label>
                        <textarea
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          placeholder="請輸入婉拒原因（必填），例如：當日已額滿、時段無法配合等..."
                          rows={3}
                          className="decline-reason-input"
                          disabled={uploading}
                        />
                        <div className="decline-actions">
                          <button
                            onClick={handleCancelDecline}
                            disabled={uploading}
                            className="cancel-decline-button"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 已確認 → 取消預約 / LINE 通知完成（不可逆） */}
                {appointment.status === "confirmed" && (
                  <div className="status-actions">
                    <button
                      onClick={() => handleStatusUpdate("cancelled")}
                      disabled={uploading}
                      className="status-button secondary"
                    >
                      <X size={20} />
                      取消預約
                    </button>
                    <button
                      onClick={handleServiceCompletionNotification}
                      disabled={uploading || !hasLineId}
                      className="status-button complete"
                      title={
                        !hasLineId
                          ? "此客戶無 LINE ID"
                          : "發送通知並標記為已完成（不可逆）"
                      }
                    >
                      <Send size={20} />
                      {hasLineId ? "LINE 通知主人完成" : "無 LINE ID"}
                    </button>
                  </div>
                )}

                {/* 已完成 */}
                {appointment.status === "completed" && (
                  <div className="status-info">
                    <p style={{ color: "#10B981", fontWeight: "bold" }}>
                      此預約已完成
                    </p>
                  </div>
                )}

                {/* 已取消 */}
                {appointment.status === "cancelled" && (
                  <div className="status-info">
                    <p style={{ color: "#EF4444", fontWeight: "bold" }}>
                      此預約已取消
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 臨時回報 */}
            <div
              className={`popup-content-page ${
                activeTab === "temp-report" ? "active" : ""
              }`}
            >
              <div className="popup-section">
                <h4 className="section-title">臨時回報</h4>

                {/* 圖片上傳區域 */}
                <div className="image-upload-area-container">
                  <div
                    className="image-upload-area"
                    onClick={() =>
                      !tempImagePreview && tempImageInputRef.current?.click()
                    }
                  >
                    {tempImagePreview ? (
                      <div className="image-preview-container">
                        <img
                          src={tempImagePreview}
                          alt="臨時回報"
                          className="uploaded-image"
                        />
                        <button
                          onClick={handleDeleteTempImage}
                          disabled={uploading}
                          className="delete-image-button"
                          title="刪除圖片"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <Camera size={48} />
                        <p>點擊上傳照片</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={tempImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTempImageChange}
                    className="hidden-input"
                  />

                  {/* 文字訊息 */}
                  <textarea
                    value={tempMessage}
                    onChange={(e) => setTempMessage(e.target.value)}
                    placeholder="文字訊息"
                    className="message-textarea"
                    rows={4}
                    disabled={uploading}
                  />
                </div>

                {/* 傳送按鈕 */}
                <button
                  onClick={handleSendTempReport}
                  disabled={
                    uploading ||
                    (!tempImageFile && !tempMessage.trim()) ||
                    !hasLineId
                  }
                  className={`send-button primary ${
                    uploading ? "loading" : ""
                  }`}
                  title={!hasLineId ? "此客戶無 LINE ID" : ""}
                >
                  {uploading ? (
                    <>
                      <div className="spinner"></div>
                      傳送中...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      {hasLineId ? "傳送給主人" : "無 LINE ID"}
                    </>
                  )}
                </button>

                {/* 過去已發送提示 */}
                {tempReportRecords.length > 0 && (
                  <div className="past-records-hint">
                    過去已發送 {tempReportRecords.length} 次
                  </div>
                )}
              </div>
            </div>

            {/* 完成分享 */}
            <div
              className={`popup-content-page ${
                activeTab === "completion" ? "active" : ""
              }`}
            >
              <div className="popup-section">
                <h4 className="section-title">完成照</h4>

                {/* 圖片上傳區域 */}
                <div className="image-upload-area-container">
                  <div
                    className="image-upload-area"
                    onClick={() =>
                      !completionImagePreview &&
                      completionImageInputRef.current?.click()
                    }
                  >
                    {completionImagePreview ? (
                      <div className="image-preview-container">
                        <img
                          src={completionImagePreview}
                          alt="完成照"
                          className="uploaded-image"
                        />
                        <button
                          onClick={handleDeleteCompletionImage}
                          disabled={uploading}
                          className="delete-image-button"
                          title="刪除圖片"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <Camera size={48} />
                        <p>點擊上傳照片</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={completionImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCompletionImageChange}
                    className="hidden-input"
                  />
                  {/* 文字訊息 */}
                  <textarea
                    value={completionMessage}
                    onChange={(e) => setCompletionMessage(e.target.value)}
                    placeholder="文字訊息"
                    className="message-textarea"
                    rows={4}
                    disabled={uploading}
                  />
                </div>

                {/* 傳送按鈕 */}
                <button
                  onClick={handleSendCompletion}
                  disabled={
                    uploading ||
                    (!completionImageFile && !completionMessage.trim()) ||
                    !hasLineId
                  }
                  className={`send-button primary ${
                    uploading ? "loading" : ""
                  }`}
                  title={!hasLineId ? "此客戶無 LINE ID" : ""}
                >
                  {uploading ? (
                    <>
                      <div className="spinner"></div>
                      傳送中...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      {hasLineId ? "傳送給主人" : "無 LINE ID"}
                    </>
                  )}
                </button>

                {/* 過去已發送提示 */}
                {completionRecords.length > 0 && (
                  <div className="past-records-hint">
                    過去已發送 {completionRecords.length} 次
                  </div>
                )}
              </div>
            </div>

            {/* 設定 */}
            <div
              className={`popup-content-page ${
                activeTab === "settings" ? "active" : ""
              }`}
            >
              <div className="popup-section">
                <h4 className="section-title">顧客注記</h4>
                <textarea
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  placeholder="備註"
                  className="message-textarea"
                  rows={4}
                  disabled={uploading}
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={uploading}
                  className="action-button save-notes"
                >
                  <Check size={20} />
                  儲存
                </button>

                <h4 className="section-title">聯絡</h4>
                <button
                  onClick={handleCallOwner}
                  disabled={!appointment.phone || uploading}
                  className="action-button call"
                >
                  <Phone size={20} />
                  打給主人
                </button>
              </div>
            </div>
          </div>

          {/* 關閉按鈕 */}
          <div className="popup-footer">
            <button
              onClick={onClose}
              className="footer-close-btn"
              disabled={uploading}
            >
              關閉
            </button>
          </div>
        </div>
      </div>

      {/* 顧客注記彈窗 - 渲染在最外層 */}
      {showReminders && (
        <CustomerRemindersPopup
          userId={appointment.userId}
          shopId={appointment.shopId}
          customerName={appointment.customerName}
          onClose={() => setShowReminders(false)}
        />
      )}

      {/* 圖片預覽模態框 */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          altText={appointment.petName || "寵物照片"}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
};
