import { useState, useRef } from "react";
import { User, Camera, Upload, X } from "lucide-react";
import { useShopSettings } from "../../hooks/useShopSettings";
import { useLineAuth } from "../../contexts/LineAuthProvider";
import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";

interface CustomerPetFormProps {
  shopId: string;
  onComplete: (data: CustomerPetData) => void;
  onBack?: () => void;
}

export interface CustomerPetData {
  customerName: string;
  phone: string;
  petName: string;
  petSpecies: string;
  petSize: string;
  petPhoto?: string;
  notes?: string;
}

export const CustomerPetForm = ({
  shopId,
  onComplete,
  onBack,
}: CustomerPetFormProps) => {
  const { shop } = useShopSettings(shopId);
  const { user } = useLineAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CustomerPetData>({
    customerName: "",
    phone: "",
    petName: "",
    petSpecies: "",
    petSize: "",
    notes: "",
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

      // Create preview
      const previewUrl = URL.createObjectURL(compressedFile);
      setPhotoPreview(previewUrl);
      setPhotoFile(compressedFile);
    } catch (error) {
      alert("照片處理失敗，請重試");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.customerName ||
      !formData.phone ||
      !formData.petName ||
      !formData.petSpecies ||
      !formData.petSize
    ) {
      alert("請填寫所有必填欄位");
      return;
    }

    if (!user) {
      alert("無法取得用戶資訊，請重新登入");
      return;
    }

    setUploading(true);
    try {
      let photoUrl = "";

      // Upload photo to Storage if exists
      if (photoFile) {
        // 🔧 開發模式：不真的上傳，使用 base64 或假 URL
        const isDevelopment = import.meta.env.DEV;
        const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;

        if (isDevelopment && !hasFirebaseConfig) {
          // 使用 FileReader 轉換為 base64，這樣可以在本地預覽
          const reader = new FileReader();
          photoUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(photoFile);
          });
        } else {
          // 真實上傳到 Firebase Storage
          const timestamp = Date.now();
          const fileName = `${timestamp}_${photoFile.name}`;
          const storageRef = ref(storage, `pets/${user.uid}/${fileName}`);

          await uploadBytes(storageRef, photoFile);
          photoUrl = await getDownloadURL(storageRef);
        }
      }

      onComplete({
        ...formData,
        petPhoto: photoUrl,
      });
    } catch (error) {
      alert("照片上傳失敗，請重試");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">📝 客戶資料</h2>
            <p className="text-sm text-gray-500">{shop?.name}</p>
          </div>
          {onBack && (
            <button onClick={onBack} className="text-gray-500 text-sm">
              返回
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Info */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User size={16} />
              飼主資訊
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="請輸入您的姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手機號碼 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="0912345678"
                />
              </div>
            </div>
          </div>

          {/* Pet Info */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              🐾 寵物資訊
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  寵物名字 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2 border"
                  value={formData.petName}
                  onChange={(e) =>
                    setFormData({ ...formData, petName: e.target.value })
                  }
                  placeholder="請輸入寵物名字"
                />
              </div>

              {/* Pet Species & Size - Horizontal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    種類 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2 border"
                    value={formData.petSpecies}
                    onChange={(e) =>
                      setFormData({ ...formData, petSpecies: e.target.value })
                    }
                  >
                    <option value="">選擇種類</option>
                    {shop?.petSpecies?.map((species) => (
                      <option key={species} value={species}>
                        {species}
                      </option>
                    ))}
                    {(!shop?.petSpecies || shop.petSpecies.length === 0) && (
                      <>
                        <option value="狗">狗</option>
                        <option value="貓">貓</option>
                        <option value="兔子">兔子</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    體型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2 border"
                    value={formData.petSize}
                    onChange={(e) =>
                      setFormData({ ...formData, petSize: e.target.value })
                    }
                  >
                    <option value="">選擇體型</option>
                    {shop?.petSizes?.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                    {(!shop?.petSizes || shop.petSizes.length === 0) && (
                      <>
                        <option value="小型">小型 (&lt;10kg)</option>
                        <option value="中型">中型 (10-25kg)</option>
                        <option value="大型">大型 (&gt;25kg)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  寵物照片 <span className="text-gray-400 text-xs">(選填)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="寵物照片"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setPhotoFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-orange-500 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-orange-600"
                  >
                    {uploading ? (
                      <>
                        <Upload className="w-8 h-8 mb-2 animate-pulse" />
                        <span className="text-sm">處理中...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-sm">點擊上傳寵物照片</span>
                        <span className="text-xs text-gray-400 mt-1">
                          方便我們為寵物提供更好的服務
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備註 <span className="text-gray-400 text-xs">(選填)</span>
                </label>
                <textarea
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 p-2 border"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="有什麼需要我們特別注意的嗎？"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3 px-4 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
            >
              {uploading ? "上傳中..." : "下一步 →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
