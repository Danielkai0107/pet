import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Compass, Heart, History, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { LiffAuthProvider } from "@/liff/auth/LiffAuthProvider";

export function LiffLayout() {
  return (
    <LiffAuthProvider>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white">
          <BottomItem to="/liff" icon={Calendar} label="訂單" end />
          <BottomItem to="/liff/history" icon={History} label="歷史" />
          <BottomItem to="/liff/discover" icon={Compass} label="找旅館" />
          <BottomItem to="/liff/favorites" icon={Heart} label="收藏" />
          <BottomItem to="/liff/profile" icon={User} label="我的" />
        </nav>
      </div>
    </LiffAuthProvider>
  );
}

function BottomItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: typeof Calendar;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium",
          isActive ? "text-brand-700" : "text-slate-500",
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
