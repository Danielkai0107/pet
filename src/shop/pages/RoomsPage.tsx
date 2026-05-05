import { useState } from "react";
import {
  Bed,
  CalendarRange,
  Edit3,
  EyeOff,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { fmtMoney } from "@/lib/format";
import { PET_TYPE_LABEL } from "@/lib/constants";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Room } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { useRooms } from "@/shop/hooks/useRooms";
import { PageHeader } from "@/shop/components/PageHeader";
import { RoomFormModal } from "@/shop/components/RoomFormModal";
import { BulkInventoryModal } from "@/shop/components/BulkInventoryModal";

export function ShopRoomsPage() {
  const { shop } = useShopAuth();
  const { rooms, loading, reload } = useRooms(shop?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [scheduleRoom, setScheduleRoom] = useState<Room | null>(null);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: Room) => {
    setEditing(r);
    setModalOpen(true);
  };

  const toggleActive = async (room: Room) => {
    const { error } = await supabase
      .from("rooms")
      .update({ is_active: !room.is_active })
      .eq("id", room.id);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(room.is_active ? "已下架" : "已上架");
    await reload();
  };

  const handleDelete = async (room: Room) => {
    if (!confirm(`確定要刪除「${room.name}」？這個動作無法復原。`)) return;
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("已刪除");
    await reload();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="房型管理"
        description="新增房型後消費者就能在商家頁看到並預約"
        action={
          <button className="btn-primary" onClick={openNew}>
            <Plus className="h-4 w-4" />
            新增房型
          </button>
        }
      />

      {loading ? (
        <div className="card flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : rooms.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bed}
            title="尚未建立房型"
            description="新增第一個房型，開始接受預約。"
            action={
              <button className="btn-primary" onClick={openNew}>
                <Plus className="h-4 w-4" />
                新增第一個房型
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {rooms.map((room) => (
            <div key={room.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Bed className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {room.name}
                  </h3>
                  {!room.is_active && (
                    <Badge className="bg-slate-200 text-slate-700">已下架</Badge>
                  )}
                </div>
                {room.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
                    {room.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span>
                    <strong className="text-slate-900">{room.total_count}</strong> 間
                  </span>
                  <span>
                    每晚 <strong className="text-slate-900">{fmtMoney(room.price_per_night)}</strong>
                  </span>
                  <span>
                    {room.pet_types.map((p) => PET_TYPE_LABEL[p]).join("、")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn-secondary"
                  onClick={() => setScheduleRoom(room)}
                  title="管理庫存與排程"
                >
                  <CalendarRange className="h-4 w-4" />
                  <span className="hidden sm:inline">庫存排程</span>
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => toggleActive(room)}
                  title={room.is_active ? "下架" : "上架"}
                >
                  {room.is_active ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => openEdit(room)}
                  title="編輯"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDelete(room)}
                  title="刪除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {shop && (
        <RoomFormModal
          open={modalOpen}
          shopId={shop.id}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={reload}
        />
      )}

      {scheduleRoom && (
        <BulkInventoryModal
          open={!!scheduleRoom}
          room={scheduleRoom}
          onClose={() => setScheduleRoom(null)}
          onSaved={() => setScheduleRoom(null)}
        />
      )}
    </div>
  );
}
