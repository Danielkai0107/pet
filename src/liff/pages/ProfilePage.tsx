import { Link } from "react-router-dom";
import { ShieldCheck, Mail, Phone, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/Badge";
import { logoutFromLine } from "@/lib/line";
import { LiffGate } from "@/liff/components/LiffGate";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";

function ProfileContent() {
  const { profile, customer } = useLiffAuth();

  const handleLogout = async () => {
    if (!confirm("確定要登出 LINE？")) return;
    await logoutFromLine();
    toast.success("已登出");
    window.location.reload();
  };

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-slate-900">我的資料</h1>

      <div className="card mt-4 p-5">
        <div className="flex items-center gap-3">
          <div
            className="h-14 w-14 shrink-0 rounded-full bg-slate-200 bg-cover bg-center"
            style={
              profile?.pictureUrl
                ? { backgroundImage: `url(${profile.pictureUrl})` }
                : undefined
            }
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">
              {profile?.displayName ?? "—"}
            </p>
            <p className="truncate text-xs text-slate-500">
              LINE ID: {profile?.userId.slice(0, 12)}…
            </p>
          </div>
        </div>
      </div>

      <div className="card mt-4 divide-y divide-slate-100">
        <Row icon={Mail} label="Email">
          {customer?.email ? (
            <span>{customer.email}</span>
          ) : (
            <Badge className="bg-amber-100 text-amber-800">未綁定</Badge>
          )}
        </Row>
        <Row icon={Phone} label="手機">
          {customer?.phone ? (
            <span>{customer.phone}</span>
          ) : (
            <Badge className="bg-slate-100 text-slate-600">未填</Badge>
          )}
        </Row>
      </div>

      {!customer?.email && (
        <Link to="/liff/bind" className="btn-primary mt-4 w-full">
          <ShieldCheck className="h-4 w-4" />
          綁定 Email 以歸戶訂單
        </Link>
      )}

      <button
        onClick={handleLogout}
        className="btn-ghost mt-2 w-full text-rose-600"
      >
        <LogOut className="h-4 w-4" />
        從此裝置登出 LINE
      </button>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="w-16 text-sm text-slate-500">{label}</span>
      <span className="flex-1 text-sm text-slate-900">{children}</span>
    </div>
  );
}

export function LiffProfilePage() {
  return (
    <LiffGate>
      <ProfileContent />
    </LiffGate>
  );
}
