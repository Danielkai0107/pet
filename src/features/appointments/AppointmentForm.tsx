import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import liff from "@line/liff";
import { useLineAuth } from "../../contexts/LineAuthProvider";
import { useAppointments } from "../../hooks/useAppointments";
import { useShopSettings } from "../../hooks/useShopSettings";
import { CustomerPetForm, type CustomerPetData } from "./CustomerPetForm";
import type { Service } from "../../types/shop";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

export const AppointmentForm = () => {
  const { user, shopId: contextShopId } = useLineAuth();
  const { createAppointment, loading: appointmentLoading } = useAppointments();
  const navigate = useNavigate();

  // Multi-step state
  const [step, setStep] = useState<1 | 2>(1);
  const [customerPetData, setCustomerPetData] =
    useState<CustomerPetData | null>(null);

  // Multi-Tenant: 從 context 獲取 shopId（由 LIFF ID 自動識別）
  const shopId = contextShopId;

  const { shop, loading: shopLoading } = useShopSettings(shopId);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Set default service when shop loads
  useEffect(() => {
    if (shop?.services && shop.services.length > 0 && !selectedService) {
      setSelectedService(shop.services[0]);
    }
  }, [shop, selectedService]);

  const timeSlots = useMemo(() => {
    if (!shop?.businessHours) return [];
    const { start, end } = shop.businessHours;
    const slots = [];
    let current = parseInt(start.split(":")[0]);
    const endHour = parseInt(end.split(":")[0]);

    while (current < endHour) {
      slots.push(`${current.toString().padStart(2, "0")}:00`);
      current++;
    }
    return slots;
  }, [shop]);

  const handleCustomerPetComplete = async (data: CustomerPetData) => {
    if (!user) return;

    try {
      // 🔧 開發模式：不真的寫入 Firebase，直接進入下一步
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        // 模擬網路延遲
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 直接進入下一步
        setCustomerPetData({
          ...data,
          petPhoto: data.petPhoto,
        });
        setStep(2);
        return;
      }

      // Save customer info to user document
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: data.customerName,
          phone: data.phone,
          pictureUrl: user.pictureUrl || "",
          createdAt: Timestamp.now(),
          role: "customer",
        },
        { merge: true }
      );

      // Save pet info to pets subcollection
      const petId = `${user.uid}_${Date.now()}`;
      const petRef = doc(db, "users", user.uid, "pets", petId);
      await setDoc(petRef, {
        id: petId,
        name: data.petName,
        species: data.petSpecies,
        size: data.petSize,
        photoUrl: data.petPhoto || "",
        notes: data.notes || "",
        createdAt: Timestamp.now(),
      });

      // Store pet data with photo for appointment
      setCustomerPetData({
        ...data,
        petPhoto: data.petPhoto, // Ensure photo is included
      });
      setStep(2);
    } catch (error) {
      alert("資料儲存失敗，請重試");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !time || !selectedService || !customerPetData) return;

    // Simple validation for shopId
    if (!shopId) {
      setSubmitError("無效的商店連結，請重新掃描 QR Code 或聯繫店家。");
      return;
    }

    setSubmitError(null);

    try {
      // 1. Create Appointment in Firestore
      await createAppointment({
        userId: user.uid,
        shopId: shopId,
        customerName: customerPetData.customerName,
        phone: customerPetData.phone,
        petName: customerPetData.petName,
        petSpecies: customerPetData.petSpecies,
        petSize: customerPetData.petSize,
        petPhoto: customerPetData.petPhoto, // Include pet photo
        serviceType: selectedService.name,
        servicePrice: selectedService.price,
        duration: selectedService.duration,
        date,
        time,
        notes: notes || customerPetData.notes,
      });

      // 預約成功後發送訊息並關閉視窗
      if (liff.isInClient()) {
        try {
          // 格式化日期顯示
          const formattedDate = new Date(date).toLocaleDateString("zh-TW", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          });

          // 發送預約成功訊息到聊天室（免費，不計入配額）
          await liff.sendMessages([
            {
              type: "text",
              text: `預約送出成功！\n日期：${formattedDate}\n時間：${time}\n服務：${selectedService.name}`,
            },
          ]);
        } catch (msgError) {
          console.error("發送訊息失敗:", msgError);
          // 忽略訊息發送失敗，繼續關閉視窗
        } finally {
          // 在 finally 中關閉視窗，確保訊息發送完成
          liff.closeWindow();
        }
      } else {
        alert("預約成功！");
        navigate("/");
      }
    } catch (err) {
      setSubmitError("預約失敗，請稍後再試。");
    }
  };

  const loading = shopLoading || appointmentLoading;

  if (shopLoading)
    return (
      <div className="appointment-form-container">
        <div className="form-loading">載入中...</div>
      </div>
    );

  if (!shopId || (!shopLoading && !shop)) {
    return (
      <div className="appointment-form-container">
        <div className="form-error">
          <div className="error-card">
            <h2>無法找到商店</h2>
            <p>請確認您的預約連結是否正確。</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Customer & Pet Info
  if (step === 1) {
    return (
      <CustomerPetForm
        shopId={shopId}
        onComplete={handleCustomerPetComplete}
        onBack={() => navigate("/")}
      />
    );
  }

  // Step 2: Appointment Details
  return (
    <div className="appointment-form-container">
      <div className="appointment-form-card">
        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className="progress-header">
            <span className="step-text">步驟 2 / 2</span>
            <span className="step-label">選擇服務時間</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "100%" }}></div>
          </div>
        </div>

        <div className="form-header">
          <div className="header-left">
            <h2>選擇服務時間</h2>
            <p className="shop-name">{shop?.name}</p>
            {customerPetData && (
              <p className="customer-info">
                {customerPetData.customerName} · {customerPetData.petName} (
                {customerPetData.petSpecies})
              </p>
            )}
          </div>

          <button onClick={() => setStep(1)} className="back-button">
            上一步
          </button>
        </div>

        {submitError && <div className="submit-error">{submitError}</div>}

        <form onSubmit={handleSubmit} className="appointment-form">
          <div className="form-field">
            <label>日期</label>
            <input
              type="date"
              required
              className="date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>時間</label>
            <div className="time-slots">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`time-slot ${time === slot ? "selected" : ""}`}
                >
                  {slot}
                </button>
              ))}
              {timeSlots.length === 0 && (
                <p className="no-slots">尚未設定營業時間</p>
              )}
            </div>
          </div>

          <div className="form-field">
            <label>服務項目</label>
            <div className="service-options">
              {shop?.services?.map((s) => (
                <div
                  key={s.name}
                  onClick={() => setSelectedService(s)}
                  className={`service-option ${
                    selectedService?.name === s.name ? "selected" : ""
                  }`}
                >
                  <span className="service-name">{s.name}</span>
                  <div className="service-details">
                    <div className="service-price">${s.price}</div>
                    <div className="service-duration">{s.duration} 分鐘</div>
                  </div>
                </div>
              ))}
              {(!shop?.services || shop.services.length === 0) && (
                <p className="no-services">尚未設定服務項目</p>
              )}
            </div>
          </div>

          <div className="form-field notes-field">
            <label>備註 (選填)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="有什麼特殊需求嗎？"
            />
          </div>

          <div className="submit-section">
            <button
              type="submit"
              disabled={loading || !date || !time || !selectedService}
              className={`submit-button ${
                loading || !date || !time || !selectedService
                  ? "disabled"
                  : "enabled"
              }`}
            >
              {appointmentLoading ? "處理中..." : "確認送出"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
