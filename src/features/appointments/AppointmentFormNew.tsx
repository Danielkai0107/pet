import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import liff from "@line/liff";
import { useLineAuth } from "../../contexts/LineAuthProvider";
import { useAppointments } from "../../hooks/useAppointments";
import { useShopSettings } from "../../hooks/useShopSettings";
import { useDailySchedule } from "../../hooks/useDailySchedule";
import type { Service } from "../../types/shop";
import {
  doc,
  setDoc,
  Timestamp,
  collection,
  getDocs,
} from "firebase/firestore";
import { db, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";

export const AppointmentFormNew = () => {
  const { user, shopId } = useLineAuth();
  const { createAppointment, loading: appointmentLoading } = useAppointments();
  const navigate = useNavigate();

  // Multi-Tenant: shopId 由 LIFF ID 自動識別
  const { shop, loading: shopLoading } = useShopSettings(shopId);

  // 3-step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 3: 服務時間
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [notes, setNotes] = useState("");

  // 獲取每日已預約時段
  const { isTimeSlotBooked } = useDailySchedule(shopId, date);

  // Step 1: 飼主資料
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [gender, setGender] = useState("");

  // Step 2: 寵物資料
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petSize, setPetSize] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 寵物推薦列表
  interface UserPet {
    id: string;
    name: string;
    species: string;
    size: string;
    photoUrl?: string;
  }
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  // 追蹤是否已初始化（防止逐字刪除時重新觸發自動填入）
  const hasInitialized = useRef(false);

  // 自動填入用戶之前保存的飼主資料（只在首次載入時執行一次）
  useEffect(() => {
    if (user && !hasInitialized.current) {
      // 如果用戶有保存過飼主姓名和手機號碼，自動填入
      if (user.displayName) {
        setCustomerName(user.displayName);
      }
      if (user.phone) {
        setPhone(user.phone);
      }
      if (user.gender) {
        setGender(user.gender);
      }
      // 標記已初始化，後續不再自動填入
      hasInitialized.current = true;
    }
  }, [user]); // 只依賴 user

  // 當日期改變時，清空已選擇的時間
  useEffect(() => {
    setTime("");
  }, [date]);

  // 獲取明天的日期（YYYY-MM-DD 格式）
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // 檢查日期是否有效（必須是明天或之後）
  const isValidDate = (dateStr: string) => {
    if (!dateStr) return false;
    const selectedDate = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= tomorrow;
  };

  // 當進入步驟3時，如果沒有選擇日期，預設為明天
  useEffect(() => {
    if (step === 3 && !date) {
      setDate(getTomorrowDate());
    }
  }, [step]);

  // Set default service when shop loads
  useEffect(() => {
    if (shop?.services && shop.services.length > 0 && !selectedService) {
      setSelectedService(shop.services[0]);
    }
  }, [shop, selectedService]);

  // 每次步驟改變時，滾動到最上方
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // 也滾動 booking-content 容器
    const contentEl = document.querySelector(".booking-content");
    if (contentEl) {
      contentEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // 載入用戶的寵物列表
  const loadUserPets = async (userId: string) => {
    setLoadingPets(true);
    try {
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setLoadingPets(false);
        return;
      }

      const petsRef = collection(db, "users", userId, "pets");
      const petsSnapshot = await getDocs(petsRef);

      const petMap = new Map<string, UserPet>(); // 用於去重

      petsSnapshot.forEach((doc) => {
        const data = doc.data();
        const pet: UserPet = {
          id: doc.id,
          name: data.name || "",
          species: data.species || "",
          size: data.size || "",
          photoUrl: data.photoUrl || "",
        };

        // 使用「名稱 + 種類」作為唯一鍵
        const key = `${pet.name}-${pet.species}`;

        // 如果已存在相同的寵物，保留有照片的或較新的
        if (!petMap.has(key) || (pet.photoUrl && !petMap.get(key)?.photoUrl)) {
          petMap.set(key, pet);
        }
      });

      // 轉換 Map 為陣列
      const uniquePets = Array.from(petMap.values());
      setUserPets(uniquePets);
    } catch (error) {
      console.error("載入寵物資料失敗:", error);
      setUserPets([]);
    } finally {
      setLoadingPets(false);
    }
  };

  // 選擇寵物
  const handleSelectPet = (pet: UserPet) => {
    setPetName(pet.name);
    setPetSpecies(pet.species);
    setPetSize(pet.size);
    if (pet.photoUrl) {
      setPhotoPreview(pet.photoUrl);
    }
    toast.success(`已選擇寵物：${pet.name}（${pet.species}）`);
  };

  // 判斷是否為選中的寵物（使用名稱+種類組合）
  const isSelectedPet = (pet: UserPet) => {
    return petName === pet.name && petSpecies === pet.species;
  };

  // 監聽名稱和種類變化，如果不匹配任何寵物則清除照片
  useEffect(() => {
    if (userPets.length > 0 && petName && petSpecies) {
      const matchedPet = userPets.find(
        (pet) => pet.name === petName && pet.species === petSpecies
      );

      if (!matchedPet && photoPreview) {
        setPhotoPreview(null);
        setPhotoFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  }, [petName, petSpecies, userPets, photoPreview]);

  // 進入步驟2時載入寵物列表
  useEffect(() => {
    if (step === 2 && user?.uid && userPets.length === 0) {
      loadUserPets(user.uid);
    }
  }, [step, user]);

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

  // 照片上傳處理
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      setPhotoFile(compressedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      alert("圖片處理失敗，請重試");
    }
  };

  // 手機號碼驗證
  const validatePhone = (phoneNumber: string): boolean => {
    setPhoneError("");

    // 移除所有空格和特殊字符
    const cleanPhone = phoneNumber.replace(/\s|-/g, "");

    // 檢查是否為 10 位數字
    if (cleanPhone.length !== 10) {
      setPhoneError("手機號碼必須為 10 位數字");
      return false;
    }

    // 檢查是否為純數字
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      setPhoneError("手機號碼只能包含數字");
      return false;
    }

    // 檢查是否以 09 開頭（台灣手機號碼格式）
    if (!cleanPhone.startsWith("09")) {
      setPhoneError("手機號碼必須以 09 開頭");
      return false;
    }

    return true;
  };

  // 手機號碼輸入處理
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);

    // 即時驗證
    if (value.length >= 10) {
      validatePhone(value);
    } else {
      setPhoneError("");
    }
  };

  // Step 1 提交
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證手機號碼
    if (!validatePhone(phone)) {
      return;
    }

    // 驗證性別
    if (!gender) {
      toast.error("請選擇性別");
      return;
    }

    setStep(2);
  };

  // Step 2 提交（上傳照片並儲存資料）
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setUploading(true);
    try {
      let photoUrl = "";

      // Upload photo if exists
      if (photoFile) {
        const isDevelopment = import.meta.env.DEV;
        const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

        if (isDevelopment && !hasFirebaseConfig) {
          photoUrl = photoPreview || "";
        } else {
          const timestamp = Date.now();
          const fileName = `${timestamp}_${photoFile.name}`;
          const storageRef = ref(storage, `pets/${user?.uid}/${fileName}`);
          await uploadBytes(storageRef, photoFile);
          photoUrl = await getDownloadURL(storageRef);
        }
      }

      // 開發模式：跳過 Firebase 寫入
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else {
        // Save customer info
        if (user) {
          const userRef = doc(db, "users", user.uid);
          await setDoc(
            userRef,
            {
              uid: user.uid,
              displayName: customerName,
              phone: phone,
              gender: gender,
              pictureUrl: user.pictureUrl || "",
              createdAt: Timestamp.now(),
              role: "customer",
            },
            { merge: true }
          );

          // Save pet info
          const petId = `${user.uid}_${Date.now()}`;
          const petRef = doc(db, "users", user.uid, "pets", petId);
          await setDoc(petRef, {
            id: petId,
            name: petName,
            species: petSpecies,
            size: petSize,
            photoUrl: photoUrl,
            createdAt: Timestamp.now(),
          });
        }
      }

      setStep(3);
    } catch (error) {
      alert("資料儲存失敗，請重試");
    } finally {
      setUploading(false);
    }
  };

  // Step 3 提交
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !time || !selectedService) return;

    if (!shopId) {
      setSubmitError("無效的商店連結");
      return;
    }

    setSubmitError(null);

    try {
      console.log("📤 開始建立預約...");
      await createAppointment({
        userId: user.uid,
        shopId: shopId,
        customerName: customerName,
        phone: phone,
        petName: petName,
        petSpecies: petSpecies,
        petSize: petSize,
        petPhoto: photoPreview || "",
        serviceType: selectedService.name,
        servicePrice: selectedService.price,
        duration: selectedService.duration,
        date,
        time,
        notes: notes,
      });

      console.log("✅ 預約建立成功");

      // 預約成功後發送訊息並關閉視窗
      if (liff.isInClient()) {
        try {
          console.log("📱 準備發送 LINE 訊息...");
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
              text: `【送出通知】\n\n日期：${formattedDate}\n時間：${time}\n服務：${selectedService.name}\n\n已成功送出，將儘速為您確認。`,
            },
          ]);
          console.log("LINE 訊息發送成功");
        } catch (msgError) {
          console.error("發送訊息失敗:", msgError);
          // 忽略訊息發送失敗，繼續關閉視窗
        } finally {
          console.log("關閉 LIFF 視窗");
          // 在 finally 中關閉視窗，確保訊息發送完成
          liff.closeWindow();
        }
      } else {
        console.log("非 LIFF 環境，顯示成功訊息");
        alert("預約成功！");
        navigate("/" + window.location.search);
      }
    } catch (err: any) {
      console.error("預約失敗:", err);
      const errorMessage = err.message || "預約失敗，請稍後再試。";
      setSubmitError(errorMessage);
    }
  };

  if (shopLoading) {
    return (
      <div className="booking-flow-container">
        <div style={{ padding: "2rem", textAlign: "center" }}>載入中...</div>
      </div>
    );
  }

  if (!shopId || (!shopLoading && !shop)) {
    return (
      <div className="booking-flow-container">
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>無法找到商店</h2>
          <p>請確認您的預約連結是否正確。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-flow-container">
      {/* 頂部離開按鈕 */}
      <div className="booking-header">
        <button
          onClick={() => navigate("/" + window.location.search)}
          className="close-button"
        >
          離開
        </button>
      </div>

      {/* 主要內容區域 */}
      <div className="booking-content">
        {/* 標題 */}
        <div className="booking-title">
          <h1>
            {step === 1 && "首先，填寫飼主資料"}
            {step === 2 && "接著，填寫寵物資料"}
            {step === 3 && "最後，選擇服務時間"}
          </h1>
        </div>

        {/* 步驟 1：飼主資料 */}
        {step === 1 && (
          <form
            onSubmit={handleStep1Submit}
            className="booking-form"
            id="step1-form"
          >
            <div className="form-group">
              <label className="form-label">飼主姓名 *</label>
              <input
                type="text"
                required
                className="form-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="您的稱呼"
              />
            </div>

            <div className="form-group">
              <label className="form-label">手機號碼 *</label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                className={`form-input ${phoneError ? "error" : ""}`}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="0912345678"
                maxLength={10}
              />
              {phoneError && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {phoneError}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">性別 *</label>
              <div className="gender-selection">
                <button
                  type="button"
                  onClick={() => setGender("男")}
                  className={`gender-button ${
                    gender === "男" ? "selected" : ""
                  }`}
                >
                  男
                </button>
                <button
                  type="button"
                  onClick={() => setGender("女")}
                  className={`gender-button ${
                    gender === "女" ? "selected" : ""
                  }`}
                >
                  女
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 步驟 2：寵物資料 */}
        {step === 2 && (
          <form
            onSubmit={handleStep2Submit}
            className="booking-form"
            id="step2-form"
          >
            {/* 寵物推薦列表 */}
            {user && userPets.length > 0 && (
              <div className="form-group">
                <label className="form-label">
                  選擇已登記的寵物{" "}
                  <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    （或手動輸入新寵物）
                  </span>
                </label>
                <div className="pet-selection-list">
                  {userPets.map((pet) => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => handleSelectPet(pet)}
                      className={`pet-selection-chip ${
                        isSelectedPet(pet) ? "selected" : ""
                      }`}
                    >
                      {pet.photoUrl ? (
                        <img
                          src={pet.photoUrl}
                          alt={pet.name}
                          className="pet-chip-avatar"
                        />
                      ) : (
                        <div className="pet-chip-avatar-placeholder">🐾</div>
                      )}
                      <div className="pet-chip-info">
                        <span className="pet-chip-name">{pet.name}</span>
                        <span className="pet-chip-details">
                          {pet.species} · {pet.size}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingPets && (
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  padding: "1rem",
                }}
              >
                載入寵物資料中...
              </div>
            )}

            <div className="form-group">
              <label className="form-label">寵物名字</label>
              <input
                type="text"
                required
                className="form-input"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="您的寵物名字"
              />
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label className="form-label">種類</label>
                <select
                  required
                  className="form-select"
                  value={petSpecies}
                  onChange={(e) => setPetSpecies(e.target.value)}
                >
                  <option value="">類別</option>
                  {shop?.petSpecies && shop.petSpecies.length > 0 ? (
                    shop.petSpecies.map((species) => (
                      <option key={species} value={species}>
                        {species}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="狗">狗</option>
                      <option value="貓">貓</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">體型</label>
                <select
                  required
                  className="form-select"
                  value={petSize}
                  onChange={(e) => setPetSize(e.target.value)}
                >
                  <option value="">類別</option>
                  {shop?.petSizes && shop.petSizes.length > 0 ? (
                    shop.petSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="小型">小型</option>
                      <option value="中型">中型</option>
                      <option value="大型">大型</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">寵物照片</label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />

              {photoPreview ? (
                <div className="photo-preview">
                  <img src={photoPreview} alt="寵物照片" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="remove-photo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="photo-upload-area"
                >
                  <Camera className="photo-icon" />
                  <div className="photo-text">點擊上傳照片</div>
                </div>
              )}
            </div>
          </form>
        )}

        {/* 步驟 3：服務時間 */}
        {step === 3 && (
          <form
            onSubmit={handleStep3Submit}
            className="booking-form"
            id="step3-form"
          >
            <div className="form-group">
              <label className="form-label">日期</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getTomorrowDate()}
                placeholder="年/月/日"
              />
            </div>

            <div className="form-group">
              <label className="form-label">時間</label>
              {!isValidDate(date) ? (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  無預約時段
                  <div
                    style={{
                      fontSize: "0.875rem",
                      marginTop: "0.5rem",
                      color: "#9ca3af",
                    }}
                  >
                    請選擇明天或之後的日期
                  </div>
                </div>
              ) : (
                <div className="time-grid">
                  {timeSlots.map((slot) => {
                    const isBooked =
                      date && selectedService
                        ? isTimeSlotBooked(slot, selectedService.duration)
                        : false;

                    return (
                      <div key={slot}>
                        <button
                          type="button"
                          onClick={() => !isBooked && setTime(slot)}
                          disabled={isBooked}
                          className={`time-slot ${
                            time === slot ? "selected" : ""
                          } ${isBooked ? "disabled" : ""}`}
                        >
                          {slot}
                        </button>
                        {isBooked && (
                          <div className="time-conflict-message">
                            此時段已被預約
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">服務項目</label>
              <div className="service-cards">
                {shop?.services?.map((service, index) => (
                  <div
                    key={service.id || `service-${index}`}
                    onClick={() => setSelectedService(service)}
                    className={`service-card ${
                      selectedService?.name === service.name ? "selected" : ""
                    }`}
                  >
                    <div className="service-name">{service.name}</div>
                    <div className="service-info">
                      <div className="service-price">${service.price}</div>
                      <div className="service-duration">
                        {service.duration} 分鐘
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">備註</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="備註"
              />
            </div>

            {submitError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "0.875rem",
                  padding: "0.75rem",
                  backgroundColor: "#fee2e2",
                  borderRadius: "0.5rem",
                  marginTop: "1rem",
                }}
              >
                ⚠️ {submitError}
              </div>
            )}
          </form>
        )}
      </div>

      {/* 底部固定區域 */}
      <div className="booking-footer">
        {/* 進度條 */}
        <div className="progress-bar-container">
          <div className={`progress-step ${step >= 1 ? "active" : ""}`}></div>
          <div className={`progress-step ${step >= 2 ? "active" : ""}`}></div>
          <div className={`progress-step ${step >= 3 ? "active" : ""}`}></div>
        </div>

        {/* 按鈕區域 */}
        <div className="button-group">
          {/* 步驟 1：只有下一步 */}
          {step === 1 && (
            <button
              type="submit"
              form="step1-form"
              disabled={!customerName || !phone || !gender}
              className="btn btn-primary btn-full"
            >
              下一步
            </button>
          )}

          {/* 步驟 2：上一步 + 下一步 */}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                上一步
              </button>
              <button
                type="submit"
                form="step2-form"
                disabled={!petName || !petSpecies || !petSize || uploading}
                className="btn btn-primary"
              >
                {uploading ? "處理中..." : "下一步"}
              </button>
            </>
          )}

          {/* 步驟 3：上一步 + 確認送出 */}
          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-secondary"
              >
                上一步
              </button>
              <button
                type="submit"
                form="step3-form"
                disabled={
                  !date ||
                  !time ||
                  !selectedService ||
                  appointmentLoading ||
                  !isValidDate(date)
                }
                className="btn btn-primary"
              >
                {appointmentLoading ? "處理中..." : "確認送出"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
