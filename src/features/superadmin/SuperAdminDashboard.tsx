import { useSuperAdminStats } from "../../hooks/useSuperAdminStats";
import {
  Store,
  Users,
  Calendar,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserCog,
} from "lucide-react";

export const SuperAdminDashboard = () => {
  const { stats, loading, error, refetch } = useSuperAdminStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入統計數據中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          錯誤：{error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">系統儀表板</h1>
          <p className="text-gray-600 mt-1">即時數據總覽</p>
        </div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <TrendingUp size={18} />
          重新整理
        </button>
      </div>

      {/* 商家統計卡片 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Store size={24} className="text-purple-600" />
          商家統計
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Store className="text-blue-600" size={24} />}
            title="總商家數"
            value={stats.totalShops}
            bgColor="bg-blue-50"
            textColor="text-blue-600"
          />
          <StatCard
            icon={<CheckCircle className="text-green-600" size={24} />}
            title="啟用中"
            value={stats.activeShops}
            bgColor="bg-green-50"
            textColor="text-green-600"
          />
          <StatCard
            icon={<Clock className="text-yellow-600" size={24} />}
            title="試用期"
            value={stats.trialShops}
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
          />
          <StatCard
            icon={<AlertTriangle className="text-red-600" size={24} />}
            title="已過期"
            value={stats.expiredShops}
            bgColor="bg-red-50"
            textColor="text-red-600"
          />
        </div>
      </div>

      {/* 訂閱方案統計 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard size={24} className="text-purple-600" />
          訂閱方案分佈
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<CreditCard className="text-blue-500" size={24} />}
            title="月訂閱"
            value={stats.monthlySubscriptions}
            subtitle="1個月方案"
            bgColor="bg-blue-50"
            textColor="text-blue-500"
          />
          <StatCard
            icon={<CreditCard className="text-yellow-500" size={24} />}
            title="年訂閱"
            value={stats.yearlySubscriptions}
            subtitle="12個月方案"
            bgColor="bg-yellow-50"
            textColor="text-yellow-500"
          />
          <StatCard
            icon={<CreditCard className="text-purple-500" size={24} />}
            title="終身免費"
            value={stats.lifetimeFreeSubscriptions}
            subtitle="永久方案"
            bgColor="bg-purple-50"
            textColor="text-purple-500"
          />
          <StatCard
            icon={<AlertTriangle className="text-orange-500" size={24} />}
            title="即將到期"
            value={stats.expiringSoonShops}
            subtitle="30天內"
            bgColor="bg-orange-50"
            textColor="text-orange-500"
          />
        </div>
      </div>

      {/* 用戶與預約統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用戶統計 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={24} className="text-purple-600" />
            用戶統計
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<Users className="text-indigo-600" size={24} />}
              title="總用戶數"
              value={stats.totalUsers}
              bgColor="bg-indigo-50"
              textColor="text-indigo-600"
            />
            <StatCard
              icon={<UserCog className="text-purple-600" size={24} />}
              title="總管理員"
              value={stats.totalAdmins}
              bgColor="bg-purple-50"
              textColor="text-purple-600"
            />
          </div>
        </div>

        {/* 預約統計 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={24} className="text-purple-600" />
            預約統計
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Calendar className="text-gray-600" size={24} />}
              title="總預約"
              value={stats.totalAppointments}
              bgColor="bg-gray-50"
              textColor="text-gray-600"
            />
            <StatCard
              icon={<Clock className="text-blue-600" size={24} />}
              title="待確認"
              value={stats.pendingAppointments}
              bgColor="bg-blue-50"
              textColor="text-blue-600"
            />
            <StatCard
              icon={<CheckCircle className="text-green-600" size={24} />}
              title="已完成"
              value={stats.completedAppointments}
              bgColor="bg-green-50"
              textColor="text-green-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// 統計卡片組件
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle?: string;
  bgColor: string;
  textColor: string;
}

const StatCard = ({
  icon,
  title,
  value,
  subtitle,
  bgColor,
  textColor,
}: StatCardProps) => {
  return (
    <div className={`${bgColor} rounded-lg p-4 border border-opacity-20`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`${textColor}`}>{icon}</div>
        <div className="text-sm font-medium text-gray-600">{title}</div>
      </div>
      <div className={`text-3xl font-bold ${textColor}`}>
        {value.toLocaleString()}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
};
