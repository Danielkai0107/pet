import { Link } from "react-router-dom";
import { ShieldCheck, Mail, Phone, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { logoutFromLine } from "@/lib/line";
import { LiffGate } from "@/liff/components/LiffGate";
import { LiffHeader } from "@/liff/components/LiffHeader";
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
    <div className="bg-white pb-12">
      <LiffHeader title="我的資料" description="LINE 帳號與訂單歸戶" />

      <div className="space-y-4 px-4 pt-4">
        <div className="flex items-center gap-3 rounded-card border border-neutral-200 p-5">
          <div
            className="h-14 w-14 shrink-0 rounded-full bg-neutral-100 bg-cover bg-center"
            style={
              profile?.pictureUrl
                ? { backgroundImage: `url(${profile.pictureUrl})` }
                : undefined
            }
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-neutral-900">
              {profile?.displayName ?? "—"}
            </p>
            <p className="truncate text-xs text-neutral-500">
              LINE ID: {profile?.userId.slice(0, 12)}…
            </p>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 rounded-card border border-neutral-200">
          <Row icon={Mail} label="Email">
            {customer?.email ? (
              <span className="text-neutral-900">{customer.email}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                未綁定
              </span>
            )}
          </Row>
          <Row icon={Phone} label="手機">
            {customer?.phone ? (
              <span className="text-neutral-900">{customer.phone}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                未填
              </span>
            )}
          </Row>
        </div>

        {!customer?.email && (
          <Link
            to="/liff/bind"
            className="btn-primary w-full justify-center"
          >
            <ShieldCheck className="h-4 w-4" />
            綁定 Email 以歸戶訂單
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="btn-ghost w-full justify-center text-rose-700"
        >
          <LogOut className="h-4 w-4" />
          從此裝置登出 LINE
        </button>
      </div>
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
      <Icon className="h-4 w-4 text-neutral-400" />
      <span className="w-16 text-sm text-neutral-500">{label}</span>
      <span className="flex-1 text-sm text-neutral-900">{children}</span>
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
