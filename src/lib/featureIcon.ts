import {
  Bath,
  Bed,
  Camera,
  Car,
  Coffee,
  Dog,
  Heart,
  Home,
  Leaf,
  type LucideIcon,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Thermometer,
  Trees,
  Utensils,
  Video,
  Wifi,
} from "lucide-react";

/**
 * 平台允許 SuperAdmin 從這份清單裡挑 lucide 圖示來代表「服務特色」。
 * 增減項目時請同步更新 ICON_OPTIONS 給 admin 下拉選用。
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  Bath,
  Bed,
  Camera,
  Car,
  Coffee,
  Dog,
  Heart,
  Home,
  Leaf,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Thermometer,
  Trees,
  Utensils,
  Video,
  Wifi,
};

export const ICON_OPTIONS: string[] = Object.keys(ICON_MAP).sort();

/** 給 icon 字串拿到對應 lucide 元件，找不到時 fallback Sparkles。 */
export function getFeatureIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Sparkles;
  return ICON_MAP[name] ?? Sparkles;
}
