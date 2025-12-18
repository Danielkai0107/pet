import React, { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import { usePets } from "../../hooks/usePets";
import type { Pet } from "../../types/pet";

export const PetForm: React.FC<{ onSuccess?: () => void }> = ({
  onSuccess,
}) => {
  const { addPet } = usePets();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Pet>>({
    name: "",
    species: "",
    size: "",
    breed: "",
    notes: "",
  });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const previewUrl = URL.createObjectURL(compressedFile);
      setPhotoPreview(previewUrl);
    } catch (error) {
      // Image compression failed
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.name || !formData.species || !formData.size) {
        throw new Error("請填寫所有必填欄位");
      }

      const newPet: Pet = {
        id: crypto.randomUUID(),
        name: formData.name,
        species: formData.species,
        size: formData.size,
        breed: formData.breed,
        photoUrl: photoPreview || "",
        notes: formData.notes,
      };

      await addPet(newPet);
      setFormData({ name: "", species: "", size: "", breed: "", notes: "" });
      setPhotoPreview(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert("新增寵物失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-lg shadow"
    >
      <h2 className="text-xl font-bold text-gray-800 mb-4">新增寵物</h2>

      {/* Photo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          寵物照片
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => setPhotoPreview(null)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-500 transition-colors"
          >
            <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">點擊上傳照片</p>
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          寵物名字 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          className="w-full border-gray-300 rounded-lg p-2 border"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      {/* Species & Size */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            種類 <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full border-gray-300 rounded-lg p-2 border"
            value={formData.species}
            onChange={(e) =>
              setFormData({ ...formData, species: e.target.value })
            }
          >
            <option value="">選擇種類</option>
            <option value="狗">狗</option>
            <option value="貓">貓</option>
            <option value="兔子">兔子</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            體型 <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full border-gray-300 rounded-lg p-2 border"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
          >
            <option value="">選擇體型</option>
            <option value="小型">小型</option>
            <option value="中型">中型</option>
            <option value="大型">大型</option>
          </select>
        </div>
      </div>

      {/* Breed */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          品種（選填）
        </label>
        <input
          type="text"
          className="w-full border-gray-300 rounded-lg p-2 border"
          value={formData.breed}
          onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
          placeholder="例如：黃金獵犬、波斯貓"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          備註（選填）
        </label>
        <textarea
          className="w-full border-gray-300 rounded-lg p-2 border"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="特殊照護需求、過敏史等"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "新增中..." : "新增寵物"}
      </button>
    </form>
  );
};
