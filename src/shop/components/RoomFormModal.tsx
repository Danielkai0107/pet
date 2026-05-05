import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { ImageUploader } from "@/components/ImageUploader";
import {
  PET_SIZE_LABEL,
  PET_TYPE_LABEL,
} from "@/lib/constants";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { PetSize, PetType, Room } from "@/lib/types";

interface RoomFormModalProps {
  open: boolean;
  shopId: string;
  initial: Room | null;
  onClose: () => void;
  onSaved: () => void;
}

interface RoomForm {
  name: string;
  description: string;
  total_count: number;
  price_per_night: number;
  pet_types: PetType[];
  pet_sizes: PetSize[];
  is_active: boolean;
  sort_order: number;
  photo_urls: string[];
}

const empty: RoomForm = {
  name: "",
  description: "",
  total_count: 1,
  price_per_night: 800,
  pet_types: ["dog"],
  pet_sizes: ["small", "medium"],
  is_active: true,
  sort_order: 0,
  photo_urls: [],
};

export function RoomFormModal({
  open,
  shopId,
  initial,
  onClose,
  onSaved,
}: RoomFormModalProps) {
  const [form, setForm] = useState<RoomForm>(empty);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              description: initial.description ?? "",
              total_count: initial.total_count,
              price_per_night: initial.price_per_night,
              pet_types: initial.pet_types,
              pet_sizes: initial.pet_sizes,
              is_active: initial.is_active,
              sort_order: initial.sort_order,
              photo_urls: initial.photo_urls ?? [],
            }
          : empty,
      );
    }
  }, [open, initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("請填寫房型名稱");
      return;
    }
    if (form.total_count < 1) {
      toast.error("總間數至少 1");
      return;
    }
    if (form.pet_types.length === 0) {
      toast.error("請選擇至少 1 個寵物類型");
      return;
    }
    setSubmitting(true);
    const payload = {
      shop_id: shopId,
      name: form.name,
      description: form.description || null,
      total_count: form.total_count,
      price_per_night: form.price_per_night,
      pet_types: form.pet_types,
      pet_sizes: form.pet_sizes,
      is_active: form.is_active,
      sort_order: form.sort_order,
      photo_urls: form.photo_urls,
    };
    const { error } = initial
      ? await supabase.from("rooms").update(payload).eq("id", initial.id)
      : await supabase.from("rooms").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(initial ? "已更新房型" : "已新增房型");
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "編輯房型" : "新增房型"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="房型名稱 *">
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>

        <Field label="說明">
          <textarea
            rows={3}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="例：獨立 3 坪空間，含寵物床、自動飲水器"
          />
        </Field>

        <Field label="房型照片" hint="最多 6 張，第一張會作為房型封面顯示">
          <ImageUploader
            mode="multi"
            value={form.photo_urls}
            onChange={(urls) => setForm({ ...form, photo_urls: urls })}
            pathPrefix={`${shopId}/rooms/${initial?.id ?? "new"}`}
            max={6}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="總間數 *" hint="同房型可同時容納幾隻寵物">
            <input
              type="number"
              min={1}
              className="input"
              value={form.total_count}
              onChange={(e) =>
                setForm({ ...form, total_count: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="每晚價格 (TWD) *">
            <input
              type="number"
              min={0}
              step={50}
              className="input"
              value={form.price_per_night}
              onChange={(e) =>
                setForm({
                  ...form,
                  price_per_night: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
        </div>

        <Field label="適合的寵物類型 *">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PET_TYPE_LABEL) as PetType[]).map((p) => {
              const checked = form.pet_types.includes(p);
              return (
                <Pill
                  key={p}
                  active={checked}
                  onClick={() =>
                    setForm({
                      ...form,
                      pet_types: checked
                        ? form.pet_types.filter((x) => x !== p)
                        : [...form.pet_types, p],
                    })
                  }
                >
                  {PET_TYPE_LABEL[p]}
                </Pill>
              );
            })}
          </div>
        </Field>

        <Field label="適合的體型">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PET_SIZE_LABEL.default) as PetSize[]).map((s) => {
              const checked = form.pet_sizes.includes(s);
              return (
                <Pill
                  key={s}
                  active={checked}
                  onClick={() =>
                    setForm({
                      ...form,
                      pet_sizes: checked
                        ? form.pet_sizes.filter((x) => x !== s)
                        : [...form.pet_sizes, s],
                    })
                  }
                >
                  {PET_SIZE_LABEL.default[s]}
                </Pill>
              );
            })}
          </div>
        </Field>

        <Field label="排序">
          <input
            type="number"
            className="input w-24"
            value={form.sort_order}
            onChange={(e) =>
              setForm({ ...form, sort_order: Number(e.target.value) || 0 })
            }
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          上架（可被消費者預約）
        </label>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {initial ? "儲存" : "新增"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="helper">{hint}</p>}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-sm transition-colors " +
        (active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50")
      }
    >
      {children}
    </button>
  );
}
