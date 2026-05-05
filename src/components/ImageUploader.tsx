import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

interface BaseProps {
  /** Storage 路徑前綴。必須以 `<shop_id>/...` 為首段以通過 RLS */
  pathPrefix: string;
  /** Bucket name，預設 shop-images */
  bucket?: string;
  /** 客戶端壓縮參數 */
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
}

interface SingleProps extends BaseProps {
  mode: "single";
  value: string | null;
  onChange: (url: string | null) => void;
  /** 顯示寬高比（CSS aspect-ratio） — 預設 16/9 */
  aspectRatio?: string;
}

interface MultiProps extends BaseProps {
  mode: "multi";
  value: string[];
  onChange: (urls: string[]) => void;
  /** 上限張數，預設 6 */
  max?: number;
  aspectRatio?: string;
}

type Props = SingleProps | MultiProps;

/**
 * 客戶端壓縮 + 上傳到 Supabase Storage。
 *
 *   - mode="single"：上傳 / 替換 / 刪除單張圖（用於商家封面）
 *   - mode="multi"：縮圖 grid + 加號卡，最多 N 張（用於房型照片）
 *
 * Storage 路徑是 `<pathPrefix>/<random>.<ext>` — pathPrefix 必須以
 * shop_id 為首段，否則 storage RLS 會擋下（見 0010_storage.sql）
 */
export function ImageUploader(props: Props) {
  if (props.mode === "single") {
    return <SingleUploader {...props} />;
  }
  return <MultiUploader {...props} />;
}

async function compressAndUpload(
  file: File,
  pathPrefix: string,
  bucket: string,
  maxWidthOrHeight: number,
  maxSizeMB: number,
): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    toast.error("請選擇圖片檔");
    return null;
  }
  let processed: File;
  try {
    processed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      initialQuality: 0.85,
    });
  } catch (e) {
    console.warn("[ImageUploader] compression failed, uploading original", e);
    processed = file;
  }
  const ext = (processed.name.split(".").pop() || "jpg").toLowerCase();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/${filename}`;

  const { error } = await supabase.storage.from(bucket).upload(path, processed, {
    cacheControl: "31536000",
    upsert: false,
    contentType: processed.type || `image/${ext}`,
  });
  if (error) {
    toast.error(`上傳失敗：${error.message}`);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function deleteFromUrl(url: string, bucket: string): Promise<void> {
  // publicUrl 形如 https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // 我們需要拆出 <path>
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

function SingleUploader({
  value,
  onChange,
  pathPrefix,
  bucket = "shop-images",
  maxWidthOrHeight = 1600,
  maxSizeMB = 1,
  aspectRatio = "16/9",
}: SingleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking same file
    if (!file) return;
    setBusy(true);
    const url = await compressAndUpload(
      file,
      pathPrefix,
      bucket,
      maxWidthOrHeight,
      maxSizeMB,
    );
    setBusy(false);
    if (url) {
      // 若本來有舊圖，背景刪除（不阻塞 UX）
      if (value) void deleteFromUrl(value, bucket);
      onChange(url);
      toast.success("已上傳");
    }
  };

  const onRemove = async () => {
    if (!value) return;
    if (!confirm("確定移除這張圖片？")) return;
    onChange(null);
    void deleteFromUrl(value, bucket);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
      <div
        className="relative w-full overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50"
        style={{ aspectRatio }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="移除圖片"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-brand-700"
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ImagePlus className="h-7 w-7" />
            )}
            <span className="text-xs">{busy ? "上傳中…" : "點擊上傳圖片"}</span>
            <span className="text-[10px] text-slate-400">
              JPG / PNG / WebP，會自動壓縮
            </span>
          </button>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-secondary w-full text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          替換圖片
        </button>
      )}
    </div>
  );
}

function MultiUploader({
  value,
  onChange,
  pathPrefix,
  bucket = "shop-images",
  maxWidthOrHeight = 1600,
  maxSizeMB = 1,
  max = 6,
  aspectRatio = "4/3",
}: MultiProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const remaining = max - value.length;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await compressAndUpload(
        file,
        pathPrefix,
        bucket,
        maxWidthOrHeight,
        maxSizeMB,
      );
      if (url) urls.push(url);
    }
    setBusy(false);
    if (urls.length > 0) {
      onChange([...value, ...urls]);
      toast.success(`已上傳 ${urls.length} 張`);
    }
  };

  const removeAt = async (index: number) => {
    if (!confirm("確定移除這張圖片？")) return;
    const url = value[index];
    onChange(value.filter((_, i) => i !== index));
    if (url) void deleteFromUrl(url, bucket);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, i) => (
          <div
            key={url}
            className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            style={{ aspectRatio }}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="移除"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-brand-400 hover:text-brand-700"
            style={{ aspectRatio }}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span className="text-[10px]">
              {busy ? "上傳中" : `加圖 (${value.length}/${max})`}
            </span>
          </button>
        )}
      </div>
      <p className="helper">最多 {max} 張，自動壓縮為 ≤ {maxSizeMB}MB</p>
    </div>
  );
}
