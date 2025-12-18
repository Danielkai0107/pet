import { useState, useEffect, useRef } from "react";
import { useShopSettings } from "../../hooks/useShopSettings";
import type { Shop, Service, BusinessHours } from "../../types/shop";
import {
  Plus,
  Trash2,
  Store,
  Clock,
  Scissors,
  PawPrint,
  X,
  Camera,
} from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import toast from "react-hot-toast";

interface ShopSettingsProps {
  shopId: string;
  isEditing: boolean;
}

const DEFAULT_HOURS: BusinessHours = {
  start: "10:00",
  end: "19:00",
  daysOpen: [1, 2, 3, 4, 5, 6], // Mon-Sat
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export const ShopSettings = ({ shopId, isEditing }: ShopSettingsProps) => {
  const { shop, loading, updateSettings } = useShopSettings(shopId);
  const [formData, setFormData] = useState<Partial<Shop>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shop) {
      setFormData(shop);
    } else if (!loading) {
      // Initialize for new shop
      setFormData({
        businessHours: DEFAULT_HOURS,
        services: [],
      });
    }
  }, [shop, loading]);

  // Expose save function to parent
  useEffect(() => {
    (window as any).__shopSettingsSave = async () => {
      await updateSettings(formData);
    };
    return () => {
      delete (window as any).__shopSettingsSave;
    };
  }, [formData, updateSettings]);

  const handleServiceChange = (
    index: number,
    field: keyof Service,
    value: string | number
  ) => {
    const newServices = [...(formData.services || [])];
    newServices[index] = { ...newServices[index], [field]: value };
    setFormData({ ...formData, services: newServices });
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [
        ...(formData.services || []),
        { name: "", duration: 30, price: 0 },
      ],
    });
  };

  const removeService = (index: number) => {
    const newServices = [...(formData.services || [])];
    newServices.splice(index, 1);
    setFormData({ ...formData, services: newServices });
  };

  // Pet species management
  const addPetSpecies = (species: string) => {
    if (!species.trim()) return;
    const currentSpecies = formData.petSpecies || [];
    if (currentSpecies.includes(species.trim())) return;
    setFormData({
      ...formData,
      petSpecies: [...currentSpecies, species.trim()],
    });
  };

  const removePetSpecies = (index: number) => {
    const newSpecies = [...(formData.petSpecies || [])];
    newSpecies.splice(index, 1);
    setFormData({ ...formData, petSpecies: newSpecies });
  };

  // Pet sizes management
  const addPetSize = (size: string) => {
    if (!size.trim()) return;
    const currentSizes = formData.petSizes || [];
    if (currentSizes.includes(size.trim())) return;
    setFormData({
      ...formData,
      petSizes: [...currentSizes, size.trim()],
    });
  };

  const removePetSize = (index: number) => {
    const newSizes = [...(formData.petSizes || [])];
    newSizes.splice(index, 1);
    setFormData({ ...formData, petSizes: newSizes });
  };

  // Handle logo upload
  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("請上傳圖片檔案");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("圖片大小不能超過 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      let downloadURL = "";

      // 🔧 開發模式：不真的上傳，使用 base64
      const isDevelopment = import.meta.env.DEV;
      const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      if (isDevelopment && !hasFirebaseConfig) {
        // 使用 FileReader 轉換為 base64
        const reader = new FileReader();
        downloadURL = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // 真實上傳到 Firebase Storage
        const timestamp = Date.now();
        const storageRef = ref(
          storage,
          `shops/${shopId}/logo_${timestamp}.${file.name.split(".").pop()}`
        );
        await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(storageRef);
      }

      // Update form data
      setFormData({ ...formData, logoUrl: downloadURL });
      toast.success("頭像上傳成功！");
    } catch (error) {
      toast.error("上傳失敗，請稍後再試");
    } finally {
      setUploadingLogo(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleDay = (dayIndex: number) => {
    const currentDays = formData.businessHours?.daysOpen || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter((d) => d !== dayIndex)
      : [...currentDays, dayIndex].sort();

    setFormData({
      ...formData,
      businessHours: {
        ...(formData.businessHours || DEFAULT_HOURS),
        daysOpen: newDays,
      },
    });
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="shop-settings-container">
      <div className="row-container">
        {/* Basic Info Widget */}
        <div className="settings-widget flex-1">
          <div className="widget-header">
            <div className="header-icon">
              <Store size={24} />
            </div>
            <div className="header-content">
              <h3>基本資訊</h3>
              <p>店鋪的基本資料設定</p>
            </div>
          </div>
          <div className="widget-body">
            {isEditing ? (
              <>
                <div className="form-group">
                  <label htmlFor="shopName">店鋪名稱</label>
                  <input
                    id="shopName"
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="例如：快樂寵物美容店"
                  />
                </div>

                {/* Logo Upload */}
                <div className="form-group">
                  <label>店鋪頭像</label>
                  <div className="logo-upload-container">
                    <div className="logo-preview">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="店鋪頭像" />
                      ) : (
                        <div className="logo-placeholder">
                          <Store size={32} />
                        </div>
                      )}
                    </div>
                    <div className="logo-upload-actions">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={{ display: "none" }}
                      />
                      <button
                        onClick={triggerFileInput}
                        disabled={uploadingLogo}
                        className="upload-button"
                      >
                        {uploadingLogo ? (
                          <>
                            <div className="spinner"></div>
                            <span>上傳中...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={18} />
                            <span>
                              {formData.logoUrl ? "更換頭像" : "上傳頭像"}
                            </span>
                          </>
                        )}
                      </button>
                      <p className="upload-hint">
                        建議尺寸：200x200px，檔案小於 2MB
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="preview-group">
                  <div className="preview-label">店鋪名稱</div>
                  <div className="preview-value">
                    {formData.name || "未設定"}
                  </div>
                </div>

                <div className="preview-group">
                  <div className="preview-label">店鋪頭像</div>
                  <div className="logo-preview-only">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="店鋪頭像" />
                    ) : (
                      <div className="logo-placeholder">
                        <Store size={32} />
                        <span>未設定</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Business Hours Widget */}
        <div className="settings-widget flex-1">
          <div className="widget-header">
            <div className="header-icon">
              <Clock size={24} />
            </div>
            <div className="header-content">
              <h3>營業時間</h3>
              <p>設定店鋪的營業時段與營業日</p>
            </div>
          </div>
          <div className="widget-body">
            {isEditing ? (
              <>
                <div className="time-grid">
                  <div className="form-group">
                    <label htmlFor="startTime">開始時間</label>
                    <input
                      id="startTime"
                      type="time"
                      value={formData.businessHours?.start || "10:00"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessHours: {
                            ...(formData.businessHours || DEFAULT_HOURS),
                            start: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="endTime">結束時間</label>
                    <input
                      id="endTime"
                      type="time"
                      value={formData.businessHours?.end || "19:00"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessHours: {
                            ...(formData.businessHours || DEFAULT_HOURS),
                            end: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>營業日</label>
                  <div className="weekday-selector">
                    {WEEKDAYS.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDay(index)}
                        className={`weekday-button ${
                          formData.businessHours?.daysOpen.includes(index)
                            ? "active"
                            : ""
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="preview-group">
                  <div className="preview-label">營業時段</div>
                  <div className="preview-value">
                    {formData.businessHours?.start || "10:00"} -{" "}
                    {formData.businessHours?.end || "19:00"}
                  </div>
                </div>
                <div className="preview-group">
                  <div className="preview-label">營業日</div>
                  <div className="preview-value">
                    {formData.businessHours?.daysOpen
                      ?.map((d) => WEEKDAYS[d])
                      .join("、") || "未設定"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pet Options Widget */}
      <div className="settings-widget">
        <div className="widget-header">
          <div className="header-icon">
            <PawPrint size={24} />
          </div>
          <div className="header-content">
            <h3>寵物選項</h3>
            <p>設定可選的寵物種類與體型</p>
          </div>
        </div>
        <div className="widget-body">
          <div className="pet-options-grid">
            {/* Pet Species */}
            <div className="pet-option-section">
              <label className="section-label">寵物種類</label>
              {isEditing ? (
                <>
                  <div className="tags-container">
                    {(formData.petSpecies || []).map((species, index) => (
                      <div key={index} className="tag">
                        <span>{species}</span>
                        <button
                          onClick={() => removePetSpecies(index)}
                          className="tag-remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-tag-input">
                    <input
                      type="text"
                      placeholder="例如：狗、貓、兔子..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPetSpecies(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget
                          .previousElementSibling as HTMLInputElement;
                        addPetSpecies(input.value);
                        input.value = "";
                      }}
                      className="add-tag-button"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="tags-container preview">
                  {(formData.petSpecies || []).length > 0 ? (
                    (formData.petSpecies || []).map((species, index) => (
                      <div key={index} className="tag preview">
                        {species}
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">未設定</span>
                  )}
                </div>
              )}
            </div>

            {/* Pet Sizes */}
            <div className="pet-option-section">
              <label className="section-label">寵物體型</label>
              {isEditing ? (
                <>
                  <div className="tags-container">
                    {(formData.petSizes || []).map((size, index) => (
                      <div key={index} className="tag">
                        <span>{size}</span>
                        <button
                          onClick={() => removePetSize(index)}
                          className="tag-remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-tag-input">
                    <input
                      type="text"
                      placeholder="例如：小型、中型、大型..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPetSize(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget
                          .previousElementSibling as HTMLInputElement;
                        addPetSize(input.value);
                        input.value = "";
                      }}
                      className="add-tag-button"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="tags-container preview">
                  {(formData.petSizes || []).length > 0 ? (
                    (formData.petSizes || []).map((size, index) => (
                      <div key={index} className="tag preview">
                        {size}
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">未設定</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-widget services-widget">
        <div className="widget-header">
          <div className="header-icon">
            <Scissors size={24} />
          </div>
          <div className="header-content">
            <h3>服務項目</h3>
            <p>管理店鋪提供的服務項目</p>
          </div>
          {isEditing && (
            <button onClick={addService} className="add-service-button">
              <Plus size={18} />
              <span>新增</span>
            </button>
          )}
        </div>
        <div className="widget-body">
          {formData.services && formData.services.length > 0 ? (
            <div className="services-list">
              {isEditing
                ? // Edit Mode
                  formData.services.map((service, index) => (
                    <div key={index} className="service-item edit-mode">
                      <div className="service-name">
                        <input
                          type="text"
                          placeholder="服務名稱"
                          value={service.name}
                          onChange={(e) =>
                            handleServiceChange(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="service-duration">
                        <input
                          type="number"
                          placeholder="60"
                          value={service.duration}
                          onChange={(e) =>
                            handleServiceChange(
                              index,
                              "duration",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                        <span className="unit">分鐘</span>
                      </div>
                      <div className="service-price">
                        <span className="currency">$</span>
                        <input
                          type="number"
                          placeholder="500"
                          value={service.price}
                          onChange={(e) =>
                            handleServiceChange(
                              index,
                              "price",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <button
                        onClick={() => removeService(index)}
                        className="remove-button"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                : // Preview Mode
                  formData.services.map((service, index) => (
                    <div key={index} className="service-item preview-mode">
                      <div className="service-info">
                        <div className="service-name-preview">
                          {service.name}
                        </div>
                        <div className="service-meta">
                          <span className="duration">
                            {service.duration} 分鐘
                          </span>
                          <span className="separator">•</span>
                          <span className="price">${service.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          ) : (
            <div className="empty-services">
              <Scissors size={48} style={{ opacity: 0.3 }} />
              <p>尚未新增服務項目</p>
              {isEditing && (
                <button onClick={addService} className="empty-add-button">
                  <Plus size={18} />
                  新增第一個服務
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
