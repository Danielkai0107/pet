import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

/**
 * SuperAdmin 可管理的全站性選項：寵物類型 / 寵物體型 / 城市清單。
 *
 * 來源：0013_managed_options.sql 建立的 4 張表。
 *
 * 用法：
 *   <ManagedOptionsProvider>...</ManagedOptionsProvider>
 *   const { petTypes, petSizes, cities, petTypeLabel, petSizeLabel } = useManagedOptions();
 *
 * 載入策略：
 *   - 一次取得所有 active + inactive 紀錄，元件依需要過濾。
 *   - 全 app 共用一份；admin 編輯後呼叫 reload() 立即更新。
 */

export interface PetTypeOption {
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface PetSizeOption {
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface CityOption {
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface PetTypeSizeLabelRow {
  pet_type_key: string;
  pet_size_key: string;
  label: string;
}

interface ManagedOptionsState {
  petTypes: PetTypeOption[];
  petSizes: PetSizeOption[];
  cities: CityOption[];
  /** key = `${pet_type_key}|${pet_size_key}` */
  petSizeOverrides: Map<string, string>;
  loading: boolean;
  reload: () => Promise<void>;
  petTypeLabel: (key: string | null | undefined) => string;
  petSizeLabel: (
    typeKey: string | null | undefined,
    sizeKey: string | null | undefined,
  ) => string;
}

const Ctx = createContext<ManagedOptionsState | null>(null);

const FALLBACK_PET_TYPES: PetTypeOption[] = [
  { key: "dog", label: "狗", sort_order: 10, is_active: true },
  { key: "cat", label: "貓", sort_order: 20, is_active: true },
  { key: "rabbit", label: "兔", sort_order: 30, is_active: true },
  { key: "other", label: "其他", sort_order: 99, is_active: true },
];

const FALLBACK_PET_SIZES: PetSizeOption[] = [
  { key: "small", label: "小型", sort_order: 10, is_active: true },
  { key: "medium", label: "中型", sort_order: 20, is_active: true },
  { key: "large", label: "大型", sort_order: 30, is_active: true },
  { key: "xlarge", label: "超大型", sort_order: 40, is_active: true },
];

const FALLBACK_CITIES: CityOption[] = [
  "台北市",
  "新北市",
  "桃園市",
  "台中市",
  "台南市",
  "高雄市",
  "基隆市",
  "新竹市",
  "新竹縣",
  "苗栗縣",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義市",
  "嘉義縣",
  "屏東縣",
  "宜蘭縣",
  "花蓮縣",
  "台東縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
].map((name, i) => ({ name, sort_order: (i + 1) * 10, is_active: true }));

export function ManagedOptionsProvider({ children }: { children: ReactNode }) {
  const [petTypes, setPetTypes] = useState<PetTypeOption[]>(FALLBACK_PET_TYPES);
  const [petSizes, setPetSizes] = useState<PetSizeOption[]>(FALLBACK_PET_SIZES);
  const [cities, setCities] = useState<CityOption[]>(FALLBACK_CITIES);
  const [petSizeOverrides, setPetSizeOverrides] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [tRes, sRes, cRes, oRes] = await Promise.all([
      supabase
        .from("pet_types")
        .select("key,label,sort_order,is_active")
        .order("sort_order", { ascending: true }),
      supabase
        .from("pet_sizes")
        .select("key,label,sort_order,is_active")
        .order("sort_order", { ascending: true }),
      supabase
        .from("cities")
        .select("name,sort_order,is_active")
        .order("sort_order", { ascending: true }),
      supabase
        .from("pet_type_size_labels")
        .select("pet_type_key,pet_size_key,label"),
    ]);

    if (!tRes.error && tRes.data) {
      setPetTypes(tRes.data as PetTypeOption[]);
    }
    if (!sRes.error && sRes.data) {
      setPetSizes(sRes.data as PetSizeOption[]);
    }
    if (!cRes.error && cRes.data) {
      setCities(cRes.data as CityOption[]);
    }
    if (!oRes.error && oRes.data) {
      const m = new Map<string, string>();
      for (const row of oRes.data as PetTypeSizeLabelRow[]) {
        m.set(`${row.pet_type_key}|${row.pet_size_key}`, row.label);
      }
      setPetSizeOverrides(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<ManagedOptionsState>(() => {
    const typeMap = new Map(petTypes.map((t) => [t.key, t]));
    const sizeMap = new Map(petSizes.map((s) => [s.key, s]));
    return {
      petTypes,
      petSizes,
      cities,
      petSizeOverrides,
      loading,
      reload,
      petTypeLabel: (key) => {
        if (!key) return "";
        return typeMap.get(key)?.label ?? key;
      },
      petSizeLabel: (typeKey, sizeKey) => {
        if (!sizeKey) return "";
        if (typeKey) {
          const ov = petSizeOverrides.get(`${typeKey}|${sizeKey}`);
          if (ov) return ov;
        }
        return sizeMap.get(sizeKey)?.label ?? sizeKey;
      },
    };
  }, [petTypes, petSizes, cities, petSizeOverrides, loading, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useManagedOptions(): ManagedOptionsState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useManagedOptions must be used inside ManagedOptionsProvider");
  }
  return ctx;
}

/** 公開的純函式 helper，用於不在 React render context 的地方（例如 supabase function 端不會用到）。
 *  在 React 元件內請優先使用 useManagedOptions().petTypeLabel(...)。*/
export function petTypeLabelFromList(
  options: PetTypeOption[],
  key: string | null | undefined,
): string {
  if (!key) return "";
  return options.find((o) => o.key === key)?.label ?? key;
}

export function petSizeLabelFromList(
  sizes: PetSizeOption[],
  overrides: Map<string, string>,
  typeKey: string | null | undefined,
  sizeKey: string | null | undefined,
): string {
  if (!sizeKey) return "";
  if (typeKey) {
    const ov = overrides.get(`${typeKey}|${sizeKey}`);
    if (ov) return ov;
  }
  return sizes.find((s) => s.key === sizeKey)?.label ?? sizeKey;
}
