import { useState, useMemo } from "react";
import { useAppointments } from "../../hooks/useAppointments";
import { Phone, User, Mail, Bell } from "lucide-react";
import type { Appointment } from "../../types/appointment";
import { CustomerRemindersPopup } from "./CustomerRemindersPopup";

interface CustomerListProps {
  shopId: string;
  searchQuery: string;
}

interface Customer {
  userId: string;
  userName: string;
  phone?: string;
  pictureUrl?: string;
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  lastAppointmentDate?: string;
  appointments: Appointment[];
}

export const CustomerList = ({ shopId, searchQuery }: CustomerListProps) => {
  const { useAppointmentList } = useAppointments();
  const { appointments: rawAppointments } = useAppointmentList(shopId);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  // 顧客注記狀態
  const [showReminders, setShowReminders] = useState(false);

  // 從預約中提取唯一客戶
  const customers = useMemo(() => {
    const customerMap = new Map<string, Customer>();

    rawAppointments.forEach((apt) => {
      if (!customerMap.has(apt.userId)) {
        customerMap.set(apt.userId, {
          userId: apt.userId,
          userName: apt.customerName || "未命名客戶",
          phone: apt.phone,
          pictureUrl: undefined,
          totalAppointments: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          appointments: [],
        });
      }

      const customer = customerMap.get(apt.userId)!;
      customer.totalAppointments++;
      customer.appointments.push(apt);

      if (apt.status === "completed") {
        customer.completedAppointments++;
      }
      if (apt.status === "pending" || apt.status === "confirmed") {
        customer.pendingAppointments++;
      }

      // 更新最後預約日期
      if (
        !customer.lastAppointmentDate ||
        apt.date > customer.lastAppointmentDate
      ) {
        customer.lastAppointmentDate = apt.date;
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => {
      const dateA = a.lastAppointmentDate || "";
      const dateB = b.lastAppointmentDate || "";
      return dateB.localeCompare(dateA);
    });
  }, [rawAppointments]);

  // 搜尋過濾（統一邏輯：客戶名稱、寵物名稱、手機末三碼）
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter((customer) => {
      // 客戶名稱
      if (customer.userName && customer.userName.toLowerCase().includes(query))
        return true;

      // 手機末三碼
      if (customer.phone && customer.phone.slice(-3).includes(query))
        return true;

      // 寵物名稱（從預約中查找）
      const hasPetMatch = customer.appointments.some(
        (apt) => apt.petName && apt.petName.toLowerCase().includes(query)
      );
      if (hasPetMatch) return true;

      return false;
    });
  }, [customers, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <span className="status-badge badge-green">已確認</span>;
      case "cancelled":
        return <span className="status-badge badge-red">已取消</span>;
      case "completed":
        return <span className="status-badge badge-blue">已完成</span>;
      default:
        return <span className="status-badge badge-yellow">待確認</span>;
    }
  };

  return (
    <div className="customer-grid">
      {/* Left: Customer List */}
      <div className="customer-list-panel">
        <div className="panel-header">
          <div className="header-left">
            <span className="title-text">客戶名單</span>
          </div>
          <div className="header-right">
            <span className="count-text">共 {filteredCustomers.length} 位</span>
          </div>
        </div>

        <div className="customer-scroll">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.userId}
              onClick={() => setSelectedCustomer(customer)}
              className={`customer-card ${
                selectedCustomer?.userId === customer.userId ? "selected" : ""
              }`}
            >
              {/* Left: Avatar */}
              <div className="card-avatar">
                {customer.pictureUrl ? (
                  <img src={customer.pictureUrl} alt={customer.userName} />
                ) : (
                  <div className="avatar-placeholder">
                    {customer.userName && customer.userName.length > 0
                      ? customer.userName.charAt(0).toUpperCase()
                      : "?"}
                  </div>
                )}
              </div>

              {/* Right: Customer Info */}
              <div className="card-info">
                <div className="card-title">{customer.userName}</div>
                <div className="card-details">
                  <span className="detail-item">
                    預約 {customer.totalAppointments} 次
                  </span>
                  {customer.completedAppointments > 0 && (
                    <>
                      <span className="separator">｜</span>
                      <span className="detail-item">
                        完成 {customer.completedAppointments} 次
                      </span>
                    </>
                  )}
                </div>
                {customer.lastAppointmentDate && (
                  <div className="card-date">
                    最後預約：{customer.lastAppointmentDate}
                  </div>
                )}
              </div>
            </button>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <User size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
              <p>找不到符合的客戶</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Customer Detail */}
      <div className="customer-detail-panel">
        {selectedCustomer ? (
          <>
            {/* Header */}
            <div className="detail-header">
              {/* Customer Avatar */}
              <div className="header-customer-avatar">
                {selectedCustomer.pictureUrl ? (
                  <img
                    src={selectedCustomer.pictureUrl}
                    alt={selectedCustomer.userName}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {selectedCustomer.userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="header-top">
                <div>
                  <h2>{selectedCustomer.userName}</h2>
                  <p className="customer-id">
                    客戶 ID：{selectedCustomer.userId.slice(0, 12)}...
                  </p>
                </div>
                <button
                  onClick={() => setShowReminders(true)}
                  className="customer-reminder-btn"
                  title="查看客戶過去顧客注記"
                >
                  <Bell size={16} />
                  <span>顧客注記</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="detail-content">
              {/* 客戶資訊 */}
              <div className="section">
                <h3>客戶資訊</h3>
                <div className="info-grid">
                  {selectedCustomer.phone && (
                    <div className="info-card">
                      <Phone size={20} />
                      <div className="info-content">
                        <div className="label">電話</div>
                        <div className="value">{selectedCustomer.phone}</div>
                      </div>
                    </div>
                  )}
                  <div className="info-card">
                    <Mail size={20} />
                    <div className="info-content">
                      <div className="label">LINE ID</div>
                      <div className="value" style={{ fontSize: "0.75rem" }}>
                        {selectedCustomer.userId.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 預約統計 */}
              <div className="section">
                <h3>預約統計</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">
                      {selectedCustomer.totalAppointments}
                    </div>
                    <div className="stat-label">總預約數</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {selectedCustomer.completedAppointments}
                    </div>
                    <div className="stat-label">已完成</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {selectedCustomer.pendingAppointments}
                    </div>
                    <div className="stat-label">進行中</div>
                  </div>
                </div>
              </div>

              {/* 預約記錄 */}
              <div className="section">
                <h3>預約記錄</h3>
                <div className="appointments-list">
                  {selectedCustomer.appointments
                    .sort((a, b) => {
                      if (a.date !== b.date) {
                        return b.date.localeCompare(a.date);
                      }
                      return b.time.localeCompare(a.time);
                    })
                    .map((apt) => (
                      <div key={apt.id} className="appointment-item">
                        <div className="item-middle">
                          <div className="item-header">
                            <span className="item-date">
                              {apt.date} {apt.time}
                            </span>
                            {getStatusBadge(apt.status)}
                          </div>
                          <div className="item-service">{apt.serviceType}</div>
                          {apt.petName && (
                            <div className="item-pet">
                              寵物：{apt.petName}
                              {apt.petSpecies && ` (${apt.petSpecies})`}
                            </div>
                          )}
                          {apt.notes && (
                            <div className="item-notes">備註：{apt.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="no-selection">
            <User size={64} style={{ marginBottom: "1rem", opacity: 0.5 }} />
            <p>請從左側選擇一位客戶查看詳情</p>
          </div>
        )}
      </div>

      {/* 顧客注記彈窗 */}
      {showReminders && selectedCustomer && (
        <CustomerRemindersPopup
          userId={selectedCustomer.userId}
          shopId={shopId}
          customerName={selectedCustomer.userName}
          onClose={() => setShowReminders(false)}
        />
      )}
    </div>
  );
};
