import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  PawPrint,
  Send,
  X,
  XCircle,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { fmtDateTime } from "@/lib/format";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import type { BookingLog, BookingStatus } from "@/lib/types";

interface Props {
  bookingId: string;
  shopId: string;
  /** 父層傳入 booking.status；checked_out 也允許補登日誌但不發送。 */
  status: BookingStatus;
}

const MAX_PHOTOS_PER_LOG = 6;
const MAX_WIDTH_OR_HEIGHT = 1600;
const MAX_SIZE_MB = 1;

/**
 * 入住日誌區 — 入住中 / 已退房 訂單可拍照＋寫文字回報家長。
 *   - checked_in：「儲存並回報家長」按鈕會推 LINE Flex
 *   - checked_out：「儲存（不發送）」只記錄，跳過 push
 *   - 若家長未綁 LINE，server 端會回 notify_status='no_line'，這裡也會
 *     正確顯示「未綁 LINE，僅紀錄」徽章
 */
export function StayLogPanel({ bookingId, shopId, status }: Props) {
  const [logs, setLogs] = useState<BookingLog[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("booking_logs")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[StayLogPanel] load failed", error);
      setLoading(false);
      return;
    }
    setLogs((data ?? []) as BookingLog[]);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  // Realtime: refresh when notify-stay-log updates the row's status.
  useEffect(() => {
    const channel = supabase
      .channel(`booking_logs:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_logs",
          filter: `booking_id=eq.${bookingId}`,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId, reload]);

  return (
    <div className="rounded-card border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          入住日誌
        </h3>
        <span className="text-[11px] text-neutral-400">
          {logs.length} 筆紀錄
        </span>
      </div>

      <NewLogForm
        bookingId={bookingId}
        shopId={shopId}
        status={status}
        onCreated={reload}
      />

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">
            還沒有日誌；拍張照片回報家長吧
          </p>
        ) : (
          logs.map((log) => <LogItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

interface PhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
}

function NewLogForm({
  bookingId,
  shopId,
  status,
  onCreated,
}: {
  bookingId: string;
  shopId: string;
  status: BookingStatus;
  onCreated: () => Promise<void> | void;
}) {
  const { user } = useShopAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const shouldPush = status === "checked_in";

  // Revoke blob URLs on unmount or when photos change.
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(
      0,
      MAX_PHOTOS_PER_LOG - photos.length,
    );
    e.target.value = "";
    if (files.length === 0) return;

    const drafts: PhotoDraft[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      drafts.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setPhotos((prev) => [...prev, ...drafts]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setNote("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0 && !note.trim()) {
      toast.error("請至少拍一張照片或寫幾個字");
      return;
    }
    setSubmitting(true);

    // 1) Compress + upload photos to Storage in parallel.
    const uploadedUrls: string[] = [];
    try {
      for (const draft of photos) {
        let processed: File;
        try {
          processed = await imageCompression(draft.file, {
            maxSizeMB: MAX_SIZE_MB,
            maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
            useWebWorker: true,
            initialQuality: 0.85,
          });
        } catch (err) {
          console.warn("[StayLogPanel] compress failed, uploading raw", err);
          processed = draft.file;
        }
        const ext = (processed.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${shopId}/bookings/${bookingId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("shop-images")
          .upload(path, processed, {
            cacheControl: "31536000",
            upsert: false,
            contentType: processed.type || `image/${ext}`,
          });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("shop-images").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
    } catch (err) {
      setSubmitting(false);
      toast.error(`上傳失敗：${formatSupabaseError(err)}`);
      return;
    }

    // 2) Insert booking_logs row.
    const { data: inserted, error: insErr } = await supabase
      .from("booking_logs")
      .insert({
        booking_id: bookingId,
        shop_id: shopId,
        author_user_id: user?.id ?? null,
        photo_urls: uploadedUrls,
        note: note.trim() || null,
        notify_status: shouldPush ? "pending" : "skipped",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      setSubmitting(false);
      toast.error(formatSupabaseError(insErr));
      return;
    }

    // 3) Fire-and-forget LINE push (server resolves recipient + writes back).
    if (shouldPush) {
      void supabase.functions
        .invoke("notify-stay-log", { body: { logId: inserted.id } })
        .catch((err) => {
          console.warn("[StayLogPanel] notify-stay-log failed", err);
        });
    }

    setSubmitting(false);
    reset();
    toast.success(shouldPush ? "已儲存，正在發送至家長 LINE…" : "已儲存");
    await onCreated();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onPick}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
            >
              <img
                src={p.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="移除照片"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={submitting || photos.length >= MAX_PHOTOS_PER_LOG}
          className="btn-secondary text-xs"
        >
          <Camera className="h-4 w-4" />
          拍照
        </button>
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
              inputRef.current.setAttribute("capture", "environment");
            }
          }}
          disabled={submitting || photos.length >= MAX_PHOTOS_PER_LOG}
          className="btn-ghost text-xs"
        >
          <ImagePlus className="h-4 w-4" />
          從相簿選
        </button>
        <span className="ml-auto self-center text-[11px] text-neutral-400">
          {photos.length}/{MAX_PHOTOS_PER_LOG} 張
        </span>
      </div>

      <textarea
        className="input min-h-[80px] resize-none"
        placeholder={
          shouldPush
            ? "今天毛孩的近況、用餐 / 散步 / 心情… (選填)"
            : "補登入住期間的紀錄…(選填)"
        }
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
      />

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : shouldPush ? (
          <Send className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {shouldPush ? "儲存並回報家長" : "儲存（不發送）"}
      </button>
      {shouldPush && (
        <p className="text-center text-[11px] text-neutral-400">
          若家長尚未綁定 LINE，會以「僅紀錄」狀態保存
        </p>
      )}
    </form>
  );
}

function LogItem({ log }: { log: BookingLog }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-3">
      {log.photo_urls.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {log.photo_urls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-md bg-neutral-100"
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
      {log.note && (
        <p className="whitespace-pre-line text-sm text-neutral-800">
          {log.note}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <PawPrint className="h-3 w-3" />
          {fmtDateTime(log.created_at)}
        </span>
        <NotifyBadge status={log.notify_status} sentAt={log.notify_sent_at} />
      </div>
    </article>
  );
}

function NotifyBadge({
  status,
  sentAt,
}: {
  status: BookingLog["notify_status"];
  sentAt: string | null;
}) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        已發送 LINE{sentAt ? ` · ${fmtDateTime(sentAt)}` : ""}
      </span>
    );
  }
  if (status === "no_line") {
    return (
      <span className="inline-flex items-center gap-1 text-neutral-500">
        <PawPrint className="h-3 w-3" />
        未綁 LINE，僅紀錄
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-rose-700">
        <XCircle className="h-3 w-3" />
        發送失敗
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700">
        <Clock className="h-3 w-3" />
        發送中…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-neutral-400">
      <PawPrint className="h-3 w-3" />
      未發送
    </span>
  );
}
