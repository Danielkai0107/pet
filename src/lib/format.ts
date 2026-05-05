import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { zhTW } from "date-fns/locale";

export function fmtDate(input: string | Date, pattern = "yyyy/MM/dd"): string {
  const d = typeof input === "string" ? parseISO(input) : input;
  return format(d, pattern, { locale: zhTW });
}

export function fmtDateTime(input: string | Date): string {
  return fmtDate(input, "yyyy/MM/dd HH:mm");
}

export function fmtMoney(amount: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)));
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("09")) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
