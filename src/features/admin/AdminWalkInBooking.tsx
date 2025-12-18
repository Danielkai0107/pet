import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import { useAdminAuth } from "../../contexts/AdminAuthProvider";
import { useAppointments } from "../../hooks/useAppointments";
import { useShopSettings } from "../../hooks/useShopSettings";
import { useDailySchedule } from "../../hooks/useDailySchedule";
import type { Service } from "../../types/shop";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";

export const AdminWalkInBooking = () => {
  const { adminUser } = useAdminAuth();
  const { createAppointment, loading: appointmentLoading } = useAppointments();
  const navigate = useNavigate();
  const [shopId, setShopId] = useState<string | null>(null);

  // Get shopId from admin user
  useEffect(() => {
    const fetchShopId = async () => {
      if (!adminUser) return;

      try {
        const isDevelopment = import.meta.env.DEV;
        const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

        if (isDevelopment && !hasFirebaseConfig) {
          setShopId("test-shop-123");
          return;
        }

        const adminDocRef = doc(db, "admins", adminUser.uid);
        const adminDoc = await getDoc(adminDocRef);

        if (adminDoc.exists()) {
          const data = adminDoc.data();
          setShopId(data.shopId || null);
        } else {
          if (isDevelopment) {
            setShopId("test-shop-123");
          }
        }
      } catch (err) {
        const isDevelopment = import.meta.env.DEV;
        if (isDevelopment) {
          setShopId("test-shop-123");
        }
      }
    };

    fetchShopId();
  }, [adminUser]);

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
  const [lineId, setLineId] = useState(""); // LINE ID 可選
  const [foundUserId, setFoundUserId] = useState<string | null>(null); // 找到的用戶 ID
  const [isSearchingUser, setIsSearchingUser] = useState(false); // 查詢中狀態

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

  // 判斷是否為選中的寵物（使用名稱+種類組合）
  const isSelectedPet = (pet: UserPet) => {
    return petName === pet.name && petSpecies === pet.species;
  };

  // 監聽名稱和種類變化，如果不匹配任何寵物則清除照片
  useEffect(() => {
    if (userPets.length > 0 && petName && petSpecies) {
      // 檢查當前名稱+種類是否匹配任何寵物
      const matchedPet = userPets.find(
        (pet) => pet.name === petName && pet.species === petSpecies
      );

      // 如果不匹配任何寵物，清除照片（說明是手動修改的）
      if (!matchedPet && photoPreview) {
        setPhotoPreview(null);
        setPhotoFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  }, [petName, petSpecies, userPets, photoPreview]);

  // 當日期改變時，清空已選擇的時間
  useEffect(() => {
    setTime("");
  }, [date]);

  // 獲取今天的日期（YYYY-MM-DD 格式）
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // 檢查日期是否有效（必須是今天或之後）
  const isValidDate = (dateStr: string) => {
    if (!dateStr) return false;
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  // 當進入步驟3時，如果沒有選擇日期，預設為今天
  useEffect(() => {
    if (step === 3 && !date) {
      setDate(getTodayDate());
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
    const contentEl = document.querySelector(".booking-content");
    if (contentEl) {
      contentEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

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
        maxSizeMB: 2, // 壓縮到 2MB
        maxWidthOrHeight: 1920, // 提高解析度上限
        useWebWorker: true,
        fileType: "image/jpeg", // 統一轉為 JPEG 格式以獲得更好的壓縮率
      };

      toast.loading("正在處理圖片...", { id: "compress" });
      const compressedFile = await imageCompression(file, options);
      toast.success("圖片處理完成", { id: "compress" });

      setPhotoFile(compressedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      toast.error("圖片處理失敗，請重試", { id: "compress" });
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

  // 載入用戶的寵物列表
  const loadUserPets = async (userId: string) => {
    setLoadingPets(true);
    try {
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        // 開發模式：模擬寵物資料
        await new Promise((resolve) => setTimeout(resolve, 300));
        setUserPets([
          {
            id: "pet1",
            name: "小白",
            species: "狗",
            size: "小型",
            photoUrl: "",
          },
          {
            id: "pet2",
            name: "喵喵",
            species: "貓",
            size: "中型",
            photoUrl: "",
          },
        ]);
        setLoadingPets(false);
        return;
      }

      // 查詢用戶的寵物
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

  // 查詢是否有相同手機號碼的用戶
  const searchUserByPhone = async (phoneNumber: string) => {
    if (phoneNumber.length !== 10 || !validatePhone(phoneNumber)) {
      return;
    }

    setIsSearchingUser(true);
    try {
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        // 開發模式：模擬查詢
        await new Promise((resolve) => setTimeout(resolve, 300));
        setIsSearchingUser(false);
        return;
      }

      // 查詢 users collection 中是否有相同手機號碼
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phone", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // 找到用戶，使用第一個匹配的用戶
        const userData = querySnapshot.docs[0].data();
        const userId = querySnapshot.docs[0].id;

        // 自動帶入姓名和 LINE ID
        setCustomerName(userData.displayName || "");
        setLineId(userId); // 使用找到的 userId 作為 LINE ID
        setFoundUserId(userId);

        // 查詢該用戶的寵物
        await loadUserPets(userId);

        toast.success(`找到現有會員：${userData.displayName || "未命名"}`);
      } else {
        // 沒有找到用戶，清除之前的資料
        setCustomerName("");
        setLineId("");
        setFoundUserId(null);
        setUserPets([]);
      }
    } catch (error) {
      console.error("查詢用戶失敗:", error);
    } finally {
      setIsSearchingUser(false);
    }
  };

  // 手機號碼輸入處理
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);

    // 即時驗證
    if (value.length >= 10) {
      const isValid = validatePhone(value);
      if (isValid) {
        // 驗證通過後自動查詢用戶
        searchUserByPhone(value);
      }
    } else {
      setPhoneError("");
      // 清除之前找到的用戶資料
      if (foundUserId) {
        setCustomerName("");
        setLineId("");
        setFoundUserId(null);
        setUserPets([]);
      }
    }
  };

  // Step 1 提交
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      return;
    }

    setStep(2);
  };

  // Step 2 提交（上傳照片）
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
          // 使用臨時 ID 作為路徑，因為還沒有 userId
          const tempId = `walk-in-${timestamp}`;
          const storageRef = ref(storage, `pets/${tempId}/${fileName}`);
          await uploadBytes(storageRef, photoFile);
          photoUrl = await getDownloadURL(storageRef);
        }
      }

      // 儲存 photoUrl 到 state
      setPhotoPreview(photoUrl || photoPreview);

      setStep(3);
    } catch (error) {
      toast.error("資料儲存失敗，請重試");
    } finally {
      setUploading(false);
    }
  };

  // Step 3 提交
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !selectedService || !shopId) return;

    setSubmitError(null);

    try {
      // 使用找到的 userId，或生成臨時 userId
      const userId = foundUserId || lineId.trim() || `walk-in-${Date.now()}`;

      await createAppointment({
        userId: userId,
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

      toast.success("現場預約成功！");
      navigate(-1); // 返回上一頁
    } catch (err) {
      setSubmitError("預約失敗，請稍後再試。");
    }
  };

  // 返回上一頁
  const handleGoBack = () => {
    navigate(-1);
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
          <p>請確認您的權限是否正確。</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 電腦版：彈窗遮罩層 */}
      <div className="modal-overlay" onClick={handleGoBack}>
        <div
          className="booking-flow-container modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 頂部返回按鈕 */}
          <div className="booking-header">
            <button onClick={handleGoBack} className="close-button">
              返回
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
              <form onSubmit={handleStep1Submit} className="booking-form">
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
                    disabled={isSearchingUser}
                  />
                  {isSearchingUser && (
                    <div
                      style={{
                        color: "#f86f03",
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      查詢中...
                    </div>
                  )}
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
                  {foundUserId && (
                    <div
                      style={{
                        color: "#10b981",
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      ✓ 找到現有會員
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">飼主姓名 *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="客戶姓名"
                    readOnly={!!foundUserId}
                    style={
                      foundUserId
                        ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" }
                        : {}
                    }
                  />
                  {foundUserId && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        marginTop: "0.25rem",
                      }}
                    >
                      已自動帶入現有會員姓名
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    LINE ID{" "}
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {foundUserId ? "（已自動帶入）" : "（選填）"}
                    </span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="留空則無法傳送 LINE 訊息"
                    readOnly={!!foundUserId}
                    style={
                      foundUserId
                        ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" }
                        : {}
                    }
                  />
                </div>
              </form>
            )}

            {/* 步驟 2：寵物資料 */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="booking-form">
                {/* 寵物推薦列表 */}
                {foundUserId && userPets.length > 0 && (
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
                            <div className="pet-chip-avatar-placeholder">
                              🐾
                            </div>
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
                    placeholder="寵物名字"
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
                  <label className="form-label">寵物照片（選填）</label>

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
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
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
              <form onSubmit={handleStep3Submit} className="booking-form">
                <div className="form-group">
                  <label className="form-label">日期</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={getTodayDate()}
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
                        請選擇今天或之後的日期
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
                          selectedService?.name === service.name
                            ? "selected"
                            : ""
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
                  <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                    {submitError}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* 底部固定區域 */}
          <div className="booking-footer">
            {/* 進度條 */}
            <div className="progress-bar-container">
              <div
                className={`progress-step ${step >= 1 ? "active" : ""}`}
              ></div>
              <div
                className={`progress-step ${step >= 2 ? "active" : ""}`}
              ></div>
              <div
                className={`progress-step ${step >= 3 ? "active" : ""}`}
              ></div>
            </div>

            {/* 按鈕區域 */}
            <div className="button-group">
              {/* 步驟 1：只有下一步 */}
              {step === 1 && (
                <button
                  onClick={handleStep1Submit}
                  disabled={!customerName || !phone}
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
                    onClick={handleStep2Submit}
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
                    onClick={handleStep3Submit}
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
      </div>
    </>
  );
};
