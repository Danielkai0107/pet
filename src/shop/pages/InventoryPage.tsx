import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Edit3,
  Bed,
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
import { cn } from "@/lib/cn";

interface DayCell {
  /** YYYY-MM-DD */
  date: string;
  /** sum of available across active rooms */
  totalAvailable: number;
  /** sum of total_count across active rooms */
  totalCapacity: number;
  /** min/max price across rooms */
  minPrice: number;
  maxPrice: number;
  /** per-room breakdown for the modal */
  perRoom: Array<{
    room: Room;
    availability: RoomAvailabilityDay;
  }>;
}

export function ShopInventoryPage() {
  const { shop } = useShopAuth();
  const { rooms, loading: roomsLoading } = useRooms(shop?.id);

  const activeRooms = useMemo(
    () => rooms.filter((r) => r.is_active),
    [rooms],
  );

  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  // Map<roomId, Map<isoDate, RoomAvailabilityDay>>
  const [byRoom, setByRoom] = useState<
    Map<string, Map<string, RoomAvailabilityDay>>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const loadAll = async () => {
    if (activeRooms.length === 0) {
      setByRoom(new Map());
      return;
    }
    setLoading(true);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(addDays(endOfMonth(month), 1), "yyyy-MM-dd");
    const next = new Map<string, Map<string, RoomAvailabilityDay>>();
    for (const room of activeRooms) {
      const { data, error } = await supabase.rpc("get_room_availability", {
        p_room_id: room.id,
        p_start: start,
        p_end: end,
      });
      if (error) {
        toast.error(`${room.name}: ${formatSupabaseError(error)}`);
        continue;
      }
      const m = new Map<string, RoomAvailabilityDay>();
      ((data as RoomAvailabilityDay[]) ?? []).forEach((d) => m.set(d.date, d));
      next.set(room.id, m);
    }
    setByRoom(next);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRooms, month]);

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

  const cellByDate = useMemo(() => {
    const map = new Map<string, DayCell>();
    for (const week of weeks) {
      for (const d of week) {
        const dateStr = format(d, "yyyy-MM-dd");
        const perRoom: DayCell["perRoom"] = [];
        let totalAvailable = 0;
        let totalCapacity = 0;
        let minPrice = Number.POSITIVE_INFINITY;
        let maxPrice = 0;
        for (const room of activeRooms) {
          const m = byRoom.get(room.id);
          const day = m?.get(dateStr);
          if (!day) continue;
          perRoom.push({ room, availability: day });
          totalAvailable += Math.max(0, day.available);
          totalCapacity += room.total_count;
          if (day.price < minPrice) minPrice = day.price;
          if (day.price > maxPrice) maxPrice = day.price;
        }
        if (perRoom.length === 0) continue;
        map.set(dateStr, {
          date: dateStr,
          totalAvailable,
          totalCapacity,
          minPrice: minPrice === Number.POSITIVE_INFINITY ? 0 : minPrice,
          maxPrice,
          perRoom,
        });
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRooms, byRoom]);

  const monthLabel = format(month, "yyyy 年 M 月", { locale: zhTW });

  if (!shop) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="庫存日曆"
        description="檢視所有房型每日剩餘房數總覽。批次調整請到「房型管理」每張卡上的「庫存排程」按鈕。"
      />

      {roomsLoading ? (
        <div className="card flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : activeRooms.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Calendar}
            title="尚未有上架的房型"
            description="先到「房型管理」建立房型，這裡才會有東西可看。"
          />
        </div>
      ) : (
        <>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="text-slate-500">
                共 <strong className="text-slate-900">{activeRooms.length}</strong>{" "}
                個上架房型
              </div>
              <div className="hidden h-5 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-2 text-xs text-slate-600">
                {activeRooms.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5"
                  >
                    <Bed className="h-3 w-3" />
                    {r.name}（{r.total_count}）
                  </span>
                ))}
              </div>
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
                  const cell = cellByDate.get(dateStr);
                  const isToday =
                    format(new Date(), "yyyy-MM-dd") === dateStr;
                  const sold = cell
                    ? cell.totalCapacity - cell.totalAvailable
                    : 0;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => cell && inMonth && setEditingDate(dateStr)}
                      disabled={!cell || !inMonth}
                      className={cn(
                        "relative min-h-[92px] border-b border-r border-slate-100 p-1.5 text-left text-xs transition-colors",
                        !inMonth && "bg-slate-50/40 text-slate-300",
                        inMonth &&
                          cell &&
                          (cell.totalAvailable > 0
                            ? "hover:bg-emerald-50"
                            : "bg-rose-50/40 hover:bg-rose-50"),
                        isToday && "ring-2 ring-inset ring-brand-500",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-semibold",
                            inMonth ? "text-slate-900" : "text-slate-300",
                          )}
                        >
                          {d.getDate()}
                        </span>
                        {cell && inMonth && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                              cell.totalAvailable > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700",
                            )}
                          >
                            {cell.totalAvailable}/{cell.totalCapacity}
                          </span>
                        )}
                      </div>
                      {cell && inMonth && (
                        <>
                          <div className="mt-1 space-y-0.5">
                            {cell.perRoom.slice(0, 2).map((r) => (
                              <div
                                key={r.room.id}
                                className="flex items-center justify-between text-[10px] text-slate-600"
                              >
                                <span className="truncate">{r.room.name}</span>
                                <span
                                  className={cn(
                                    "shrink-0 font-medium",
                                    r.availability.available > 0
                                      ? "text-emerald-700"
                                      : "text-rose-600",
                                  )}
                                >
                                  {r.availability.available}/{r.room.total_count}
                                </span>
                              </div>
                            ))}
                            {cell.perRoom.length > 2 && (
                              <div className="text-[10px] text-slate-400">
                                +{cell.perRoom.length - 2} 個房型
                              </div>
                            )}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500">
                            {cell.minPrice === cell.maxPrice
                              ? fmtMoney(cell.minPrice)
                              : `${fmtMoney(cell.minPrice)}-${fmtMoney(cell.maxPrice)}`}
                          </div>
                          {sold > 0 && (
                            <div className="mt-0.5 text-[10px] text-amber-700">
                              已售 {sold}
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            點任一天可單獨覆寫該日某房型的庫存或價格。要做整月/週期性的設定，
            請到「房型管理」→ 對應房型的「庫存排程」按鈕。
          </p>
        </>
      )}

      {editingDate && (
        <DayDetailModal
          date={editingDate}
          rooms={cellByDate.get(editingDate)?.perRoom ?? []}
          onClose={() => setEditingDate(null)}
          onSaved={async () => {
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

function DayDetailModal({
  date,
  rooms,
  onClose,
  onSaved,
}: {
  date: string;
  rooms: Array<{ room: Room; availability: RoomAvailabilityDay }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal open={true} onClose={onClose} title={`${date} 庫存覆寫`}>
      <div className="space-y-3">
        {rooms.length === 0 ? (
          <p className="text-sm text-slate-500">這天沒有房型資料</p>
        ) : (
          rooms.map(({ room, availability }) => (
            <RoomDayRow
              key={room.id}
              room={room}
              availability={availability}
              date={date}
              onSaved={onSaved}
            />
          ))
        )}
      </div>
    </Modal>
  );
}

function RoomDayRow({
  room,
  availability,
  date,
  onSaved,
}: {
  room: Room;
  availability: RoomAvailabilityDay;
  date: string;
  onSaved: () => void;
}) {
  const [available, setAvailable] = useState<string>(
    String(availability.available),
  );
  const [price, setPrice] = useState<string>(String(availability.price));
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const save = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("room_inventory_overrides").upsert(
      {
        room_id: room.id,
        date,
        available_count: Number(available),
        price_override: Number(price),
        note: null,
      },
      { onConflict: "room_id,date" },
    );
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(`${room.name} 已儲存`);
    onSaved();
  };

  const reset = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("room_inventory_overrides")
      .delete()
      .eq("room_id", room.id)
      .eq("date", date);
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(`${room.name} 已恢復預設`);
    onSaved();
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Bed className="h-4 w-4 text-brand-700" />
          <strong className="text-sm text-slate-900">{room.name}</strong>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold",
              availability.available > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700",
            )}
          >
            剩 {availability.available}/{room.total_count}
          </span>
          <span>{fmtMoney(availability.price)}</span>
          <Edit3 className="h-3 w-3 text-slate-400" />
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">可用間數</label>
              <input
                type="number"
                min={0}
                max={room.total_count}
                className="input"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">價格</label>
              <input
                type="number"
                min={0}
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="btn-ghost text-xs text-rose-600"
              onClick={reset}
              disabled={submitting}
            >
              清除覆寫
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={save}
                disabled={submitting}
              >
                {submitting && <Spinner size="sm" />}
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
