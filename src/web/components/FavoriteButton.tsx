import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import { LIFF_ID } from "@/lib/constants";
import { loadLiffProfile } from "@/lib/line";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Customer } from "@/lib/types";

interface Props {
  shopId: string;
}

interface FavRow {
  id: string;
  shop: { id: string };
}

interface ListResp {
  ok: boolean;
  favorites?: FavRow[];
}

/**
 * Renders a heart toggle that only activates inside LINE LIFF.
 * Outside LIFF, it shows a hint to add the platform LINE first.
 */
export function FavoriteButton({ shopId }: Props) {
  const [hasLiff, setHasLiff] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!LIFF_ID) return;
      const r = await loadLiffProfile();
      if (cancelled) return;
      if (!r.ok || !r.idToken) return;
      setHasLiff(true);
      setIdToken(r.idToken);

      // hydrate customer (also fires line-me upsert) and check current favorites
      const me = await supabase.functions.invoke("line-me", {
        body: { idToken: r.idToken },
      });
      const customer = (me.data as { customer?: Customer })?.customer;
      if (!customer) return;

      const list = await supabase.functions.invoke("line-favorites", {
        body: { idToken: r.idToken, action: "list" },
      });
      const favs = (list.data as ListResp)?.favorites ?? [];
      setActive(favs.some((f) => f.shop.id === shopId));
    })();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  if (!hasLiff || !idToken) return null;

  const toggle = async () => {
    setBusy(true);
    const action = active ? "remove" : "add";
    const { error } = await supabase.functions.invoke("line-favorites", {
      body: { idToken, action, shopId },
    });
    setBusy(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    setActive(!active);
    toast.success(active ? "已移除收藏" : "已加入收藏");
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "btn-ghost",
        active && "text-rose-600 hover:bg-rose-50",
      )}
    >
      <Heart
        className={cn("h-4 w-4", active && "fill-rose-600")}
      />
      {active ? "已收藏" : "收藏"}
    </button>
  );
}
