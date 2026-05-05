import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfDay,
} from "date-fns";
import { zhTW } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface DateRangePickerProps {
  /** ISO date YYYY-MM-DD */
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  /** Map of date string -> available count. <=0 means full. */
  availability?: Map<string, number>;
  loading?: boolean;
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  availability,
  loading,
}: DateRangePickerProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const today = startOfDay(new Date());

  const start = checkIn ? parseISO(checkIn) : null;
  const end = checkOut ? parseISO(checkOut) : null;

  const handleClick = (d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    if (!start || (start && end)) {
      onChange(iso, null);
      return;
    }
    if (isBefore(d, start) || isSameDay(d, start)) {
      onChange(iso, null);
      return;
    }
    onChange(format(start, "yyyy-MM-dd"), iso);
  };

  const monthStart = startOfMonth(month);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const weeks: Date[][] = useMemo(() => {
    const out: Date[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) {
        row.push(addDays(gridStart, w * 7 + d));
      }
      out.push(row);
    }
    return out;
  }, [gridStart]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="上個月"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-neutral-900">
          {format(month, "yyyy 年 M 月", { locale: zhTW })}
        </span>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="下個月"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-neutral-500">
        {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((d) => {
          const iso = format(d, "yyyy-MM-dd");
          const inMonth = d.getMonth() === month.getMonth();
          const past = isBefore(d, today);
          const avail = availability?.get(iso);
          const full = avail !== undefined && avail <= 0;

          // 顯示「最後一晚」=入住日到退房日前一日皆為 inRange。
          const inRange =
            !!start && !!end && isAfter(d, start) && isBefore(d, end);
          const isStart = !!start && isSameDay(d, start);
          const isEnd = !!end && isSameDay(d, end);

          const disabled = past || !inMonth || (full && !isStart && !isEnd);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(d)}
              className={cn(
                "relative flex h-12 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                !inMonth && "text-neutral-300",
                inMonth && !disabled && "text-neutral-900 hover:bg-neutral-100",
                disabled && inMonth && "text-neutral-300",
                isToday(d) && !isStart && !isEnd && "ring-1 ring-inset ring-neutral-300",
                inRange && "bg-neutral-100 text-neutral-900",
                (isStart || isEnd) &&
                  "bg-neutral-900 text-white hover:bg-neutral-900",
                full && inMonth && !isStart && !isEnd && "line-through",
              )}
            >
              <span className="leading-none">{d.getDate()}</span>
              {avail !== undefined && inMonth && !past && !full && (
                <span
                  className={cn(
                    "mt-0.5 text-[10px] leading-none",
                    isStart || isEnd
                      ? "text-white/80"
                      : "text-neutral-400",
                  )}
                >
                  剩{avail}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="mt-2 text-center text-xs text-neutral-400">
          查詢可訂日期中…
        </p>
      )}
    </div>
  );
}
