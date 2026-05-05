import { useState } from "react";
import { addMonths, format } from "date-fns";
import { CalendarRange, Eraser, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Room } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  room: Room;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const WEEKDAYS = [
  { idx: 1, label: "週一" },
  { idx: 2, label: "週二" },
  { idx: 3, label: "週三" },
  { idx: 4, label: "週四" },
  { idx: 5, label: "週五" },
  { idx: 6, label: "週六" },
  { idx: 0, label: "週日" },
];

type Mode = "set" | "clear";

export function BulkInventoryModal({ room, open, onClose, onSaved }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const inThreeMonths = format(addMonths(new Date(), 3), "yyyy-MM-dd");

  const [mode, setMode] = useState<Mode>("set");
  const [start, setStart] = useState<string>(today);
  const [end, setEnd] = useState<string>(inThreeMonths);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [available, setAvailable] = useState<string>(String(room.total_count));
  const [priceValue, setPriceValue] = useState<string>(
    String(room.price_per_night),
  );
  const [enableAvail, setEnableAvail] = useState(true);
  const [enablePrice, setEnablePrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allWeekdays = weekdays.length === 0;

  const toggleDay = (idx: number) => {
    setWeekdays((arr) =>
      arr.includes(idx) ? arr.filter((x) => x !== idx) : [...arr, idx],
    );
  };

  const submit = async () => {
    if (!start || !end || end <= start) {
      toast.error("請正確設定日期範圍");
      return;
    }
    setSubmitting(true);

    if (mode === "clear") {
      const { data, error } = await supabase.rpc("bulk_clear_room_inventory", {
        p_room_id: room.id,
        p_start: start,
        p_end: end,
        p_weekdays: weekdays,
      });
      setSubmitting(false);
      if (error) {
        toast.error(formatSupabaseError(error));
        return;
      }
      toast.success(`已清除 ${data ?? 0} 天的覆寫`);
      onSaved();
      return;
    }

    if (!enableAvail && !enablePrice) {
      setSubmitting(false);
      toast.error("請至少勾選一項要設定（庫存數 或 價格）");
      return;
    }

    const { data, error } = await supabase.rpc("bulk_set_room_inventory", {
      p_room_id: room.id,
      p_start: start,
      p_end: end,
      p_weekdays: weekdays,
      p_available: enableAvail ? Number(available) : null,
      p_price_override: enablePrice ? Number(priceValue) : null,
      p_note: null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(`已套用到 ${data ?? 0} 天`);
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`批次設定庫存 — ${room.name}`}
    >
      <div className="space-y-4">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("set")}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "set"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Save className="mr-1 inline h-4 w-4" />
            套用設定
          </button>
          <button
            type="button"
            onClick={() => setMode("clear")}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "clear"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Eraser className="mr-1 inline h-4 w-4" />
            清除覆寫
          </button>
        </div>

        <div>
          <label className="label">日期範圍</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="input"
              value={start}
              min={today}
              onChange={(e) => setStart(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <p className="helper">
            <CalendarRange className="mr-1 inline h-3 w-3" />
            包含開始日，不包含結束日
          </p>
        </div>

        <div>
          <label className="label">套用星期</label>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                allWeekdays
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
              onClick={() => setWeekdays([])}
            >
              全部 {allWeekdays && "✓"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => setWeekdays([1, 2, 3, 4, 5])}
            >
              週一到週五
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => setWeekdays([0, 6])}
            >
              週末
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => {
              const checked = !allWeekdays && weekdays.includes(d.idx);
              return (
                <button
                  key={d.idx}
                  type="button"
                  onClick={() => toggleDay(d.idx)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    checked
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    allWeekdays && "border-dashed text-slate-400",
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className="helper">不勾任何星期 = 套用全部 7 天</p>
        </div>

        {mode === "set" && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={enableAvail}
                  onChange={(e) => setEnableAvail(e.target.checked)}
                />
                設定可用間數
              </label>
              {enableAvail && (
                <>
                  <input
                    type="number"
                    min={0}
                    max={room.total_count}
                    className="input mt-1"
                    value={available}
                    onChange={(e) => setAvailable(e.target.value)}
                  />
                  <p className="helper">
                    房型最多 {room.total_count} 間，設 0 = 該星期全部不開放
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={enablePrice}
                  onChange={(e) => setEnablePrice(e.target.checked)}
                />
                設定該星期價格
              </label>
              {enablePrice && (
                <>
                  <input
                    type="number"
                    min={0}
                    className="input mt-1"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                  />
                  <p className="helper">
                    例：週末 +200 元，平日 {fmtMoney(room.price_per_night)}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {mode === "clear" && (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            將刪除這個範圍內、符合星期條件的所有覆寫，恢復為房型預設值
            （{room.total_count} 間 / {fmtMoney(room.price_per_night)}）
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={cn(
              mode === "clear" ? "btn-danger" : "btn-primary",
            )}
            onClick={submit}
            disabled={submitting}
          >
            {submitting && <Spinner size="sm" />}
            {mode === "clear" ? "確認清除" : "套用"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
