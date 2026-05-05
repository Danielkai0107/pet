import { Link, NavLink, Outlet } from "react-router-dom";
import { Search, PawPrint } from "lucide-react";
import { PLATFORM_NAME } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function WebLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-brand-700 transition-colors hover:text-brand-800"
          >
            <PawPrint className="h-5 w-5" />
            <span className="text-base font-extrabold tracking-tight">
              {PLATFORM_NAME}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavItem to="/" icon={Search} label="找旅館" end />
          </nav>
          <span />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {PLATFORM_NAME}. 為毛孩找到最合適的住宿。
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/about" className="hover:text-brand-700">關於我們</Link>
            <Link to="/shop/onboarding" className="hover:text-brand-700">
              我是寵物旅館業者
            </Link>
            <Link to="/shop/login" className="hover:text-brand-700">
              店家後台
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: typeof Search;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
          isActive
            ? "text-brand-700"
            : "text-slate-600 hover:text-brand-700",
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}
