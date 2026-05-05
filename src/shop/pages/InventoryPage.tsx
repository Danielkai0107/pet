import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Edit3,
  CalendarRange,
} from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { fmtMoney } from "@/lib/format";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Room, RoomAvailabilityDay } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { useRooms } from "@/shop/hooks/useRooms";
import { PageHeader } from "@/shop/components/PageHeader";
import { BulkInventoryModal } from "@/shop/components/BulkInventoryModal";
import { cn } from "@/lib/cn";

export function ShopInventoryPage() {
  const { shop } = useShopAuth();
  const { rooms, loading: roomsLoading } = useRooms(shop?.id);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [days, setDays] = useState<RoomAvailabilityDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDay, setEditingDay] = useState<RoomAvailabilityDay | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Auto-select first room when list loads
  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom = useMemo<Room | undefined>(
    () => rooms.find((r) => r.id === selectedRoomId),
    [rooms, selectedRoomId],
  );

  const loadDays = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(addDays(endOfMonth(month), 1), "yyyy-MM-dd");
    const { data, error } = await supabase.rpc("get_room_availability", {
      p_room_id: selectedRoomId,
      p_start: start,
      p_end: end,
    });
    setLoading(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      setDays([]);
      return;
    }
    setDays((data as RoomAvailabilityDay[]) ?? []);
  };

  useEffect(() => {
    void loadDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, month]);

  const monthLabel = format(month, "yyyy 年 M 月", { locale: zhTW });
  const dayMap = new Map(days.map((d) => [d.date, d]));

  // Render 6-week grid starting Sunday
  const monthStart = startOfMonth(month);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(addDays(gridStart, w * 7 + d));
    }
    weeks.push(row);
  }

  if (!shop) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="庫存日曆"
        description="即時呈現每日剩餘房數與價格，可手動覆寫某天的庫存或價格"
      />

      {roomsLoading ? (
        <div className="card flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : rooms.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Calendar}
            title="先到 房型管理 建立房型"
            description="建立房型後就能看到該房型的每日庫存。"
          />
        </div>
      ) : (
        <>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">房型：</label>
              <select
                className="input w-auto"
                value={selectedRoomId ?? ""}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}（共 {r.total_count} 間）
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn-ghost"
                onClick={() => setMonth(addMonths(month, -1))}
                title="上個月"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[7rem] text-center text-sm font-semibold text-slate-900">
                {monthLabel}
              </span>
              <button
                className="btn-ghost"
                onClick={() => setMonth(addMonths(month, 1))}
                title="下個月"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                className="btn-secondary text-xs"
                onClick={() => setMonth(startOfMonth(new Date()))}
              >
                本月
              </button>
              <button
                className="btn-primary text-xs"
                onClick={() => setBulkOpen(true)}
                disabled={!selectedRoom}
              >
                <CalendarRange className="h-4 w-4" />
                批次設定
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
              {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {weeks.flat().map((d) => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const inMonth = d.getMonth() === month.getMonth();
                  const day = dayMap.get(dateStr);
                  const isToday =
                    format(new Date(), "yyyy-MM-dd") === dateStr;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => day && inMonth && setEditingDay(day)}
                      disabled={!day || !inMonth}
                      className={cn(
                        "relative min-h-[74px] border-b border-r border-slate-100 p-1.5 text-left text-xs transition-colors",
                        !inMonth && "bg-slate-50/50 text-slate-300",
                        inMonth &&
                          day &&
                          (day.available > 0
                            ? "hover:bg-emerald-50"
                            : "bg-rose-50/40 hover:bg-rose-50"),
                        isToday && "ring-2 ring-inset ring-brand-500",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-medium",
                            inMonth ? "text-slate-900" : "text-slate-300",
                          )}
                        >
                          {d.getDate()}
                        </span>
                        {day && inMonth && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              day.available > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700",
                            )}
                          >
                            剩 {day.available}
                          </span>
                        )}
                      </div>
                      {day && inMonth && (
                        <div className="mt-2 text-[11px] text-slate-500">
                          {fmtMoney(day.price)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {selectedRoom && editingDay && (
        <DayOverrideModal
          room={selectedRoom}
          day={editingDay}
          onClose={() => setEditingDay(null)}
          onSaved={async () => {
            setEditingDay(null);
            await loadDays();
          }}
        />
      )}

      {selectedRoom && (
        <BulkInventoryModal
          room={selectedRoom}
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onSaved={async () => {
            setBulkOpen(false);
            await loadDays();
          }}
        />
      )}
    </div>
  );
}

function DayOverrideModal({
  room,
  day,
  onClose,
  onSaved,
}: {
  room: Room;
  day: RoomAvailabilityDay;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [available, setAvailable] = useState<string>(String(day.available));
  const [price, setPrice] = useState<string>(String(day.price));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("room_inventory_overrides")
      .delete()
      .eq("room_id", room.id)
      .eq("date", day.date);
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("已恢復預設");
    onSaved();
  };

  const save = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("room_inventory_overrides").upsert(
      {
        room_id: room.id,
        date: day.date,
        available_count: Number(available),
        price_override: Number(price),
        note: note || null,
      },
      { onConflict: "room_id,date" },
    );
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("已儲存覆寫");
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title={`覆寫 ${day.date}`}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          房型：<strong className="text-slate-900">{room.name}</strong>（共
          {room.total_count} 間）
        </div>

        <div>
          <label className="label">該日可用間數</label>
          <input
            type="number"
            min={0}
            max={room.total_count}
            className="input"
            value={available}
            onChange={(e) => setAvailable(e.target.value)}
          />
          <p className="helper">
            設成 0 = 當日不開放（會在公開頁顯示已滿）
          </p>
        </div>

        <div>
          <label className="label">該日價格 (TWD)</label>
          <input
            type="number"
            min={0}
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <p className="helper">
            預設 {fmtMoney(room.price_per_night)} / 晚
          </p>
        </div>

        <div>
          <label className="label">備註（選填）</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：旺季加價、員工旅遊休館"
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            className="btn-ghost text-rose-600"
            onClick={reset}
            disabled={submitting}
          >
            <Edit3 className="h-4 w-4" />
            清除覆寫
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={save}
              disabled={submitting}
            >
              {submitting && <Spinner size="sm" />}
              儲存
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
